-- M2 — direct-booked billing.
--
-- The diagnosis that mattered: payments.quote_id was NOT NULL. The early return
-- in on_drone_job_delivered ("IF NEW.quote_id IS NULL THEN RETURN NEW") was not
-- the cause, it was the workaround — with a NOT NULL quote_id there was no legal
-- row to insert for a job that never had a quote. 17 of 21 live drone_jobs have
-- no quote_id, so the entire non-quote revenue path was structurally unbillable.
--
-- 1. quote_id becomes nullable, and a table-level check keeps every payment
--    anchored to at least one of the two sources.
-- 2. on_drone_job_delivered is rewritten with a quote path AND a direct path,
--    both stamping job_id, both deduped, both refusing to write garbage.
-- 3. The whole body is wrapped in `exception when others`. This trigger is
--    AFTER UPDATE and runs INSIDE the caller's transaction: today an unhandled
--    error in billing would roll back the delivery itself. Billing must never
--    be able to un-deliver a mission.
-- 4. The trigger is widened to fire on delivery_status as well as status.
--    zz_sync_delivery_state (20260727193157) is a BEFORE UPDATE that promotes
--    status to 'delivered' when delivery_status becomes 'sent'/'delivery_confirmed'.
--    Postgres evaluates `UPDATE OF <col>` against the columns NAMED in the SET
--    clause, not against what a BEFORE trigger later changed — so a delivery
--    made by writing delivery_status alone never fired billing at all. The
--    WHEN clause plus the in-function old/new guard keep it single-shot.
--
-- SORTIE CONTRACT: no drone_jobs column renamed, no protected FK touched, no
-- enum unified. drone_job_status 'delivered'/'complete' and photogrammetry_status
-- 'completed' remain distinct.
--
-- additive   : mostly — DROP NOT NULL and a new CHECK + index are additive;
--              the trigger definition is replaced (same name, wider event list)
-- idempotent : yes — drop not null is a no-op when already nullable, the
--              constraint is added inside an existence guard, validate is a
--              no-op once validated, create index if not exists, and both
--              create-or-replace/drop-if-exists+create for the trigger
-- reversible : yes —
--                alter table public.payments drop constraint if exists payments_source_ck;
--                alter table public.payments alter column quote_id set not null;  -- only while no direct rows exist
--                drop index if exists public.payments_job_id_idx;
--              plus re-applying the previous function body from 20260403100000.
--
-- verification:
--   -- constraint + nullability
--   select is_nullable from information_schema.columns
--    where table_schema='public' and table_name='payments' and column_name='quote_id';   -- YES
--   select conname, convalidated, pg_get_constraintdef(oid)
--     from pg_constraint where conrelid='public.payments'::regclass and conname='payments_source_ck';
--   -- trigger surface
--   select pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid='public.drone_jobs'::regclass and tgname='trg_drone_job_delivered';
--   -- after delivering a direct-booked job with job_price and a client email:
--   select payment_type, amount, quote_id, job_id, customer_email, due_date
--     from payments where job_id = '<job uuid>';
--   -- expect ONE 'balance' row, amount = drone_jobs.job_price (dollars), quote_id null

-- ---------------------------------------------------------------------------
-- 1. structural: payments may be anchored to a job instead of a quote
-- ---------------------------------------------------------------------------

alter table public.payments alter column quote_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'payments_source_ck'
       and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_source_ck
      check (quote_id is not null or job_id is not null) not valid;
  end if;
end
$$;

alter table public.payments validate constraint payments_source_ck;

-- idx_payments_job_id already exists as a PARTIAL index (WHERE job_id IS NOT NULL).
-- This unconditional one is what the brief specified; `if not exists` keeps the
-- migration re-runnable. See the report note — the partial index is the cheaper
-- of the two and this one can be dropped if the write cost is unwelcome.
create index if not exists payments_job_id_idx on public.payments (job_id);

-- ---------------------------------------------------------------------------
-- 2. on_drone_job_delivered — quote path + direct path
-- ---------------------------------------------------------------------------

create or replace function public.on_drone_job_delivered()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_quote          record;
  v_total          numeric;
  v_deposit        numeric;
  v_balance        numeric;
  v_paid_deposit   numeric;
  v_email          text;
  v_existing       uuid;
begin
  -- Fire once, on the transition into 'delivered'. The trigger also fires on
  -- delivery_status updates now, so this guard is what keeps it single-shot.
  if not (new.status = 'delivered' and old.status is distinct from 'delivered') then
    return new;
  end if;

  if new.quote_id is not null then
    -- ---- quote path -------------------------------------------------------
    select q.total, q.deposit_amount, q.request_id
      into v_quote
      from quotes q
     where q.id = new.quote_id;

    if not found then
      raise log '[on_drone_job_delivered] job % references missing quote % — no billing', new.id, new.quote_id;
      return new;
    end if;

    v_total   := v_quote.total;
    v_deposit := coalesce(nullif(v_quote.deposit_amount, 0), round(coalesce(v_total, 0) * 0.25, 2));

    select qr.email
      into v_email
      from quote_requests qr
     where qr.id = v_quote.request_id;
  else
    -- ---- direct path ------------------------------------------------------
    -- job_price is DOLLARS (see 20260728091000). A direct-booked job that is
    -- already delivered has no deposit left to collect, so the whole amount is
    -- billed as the balance; any deposit an admin already raised through
    -- create-deposit-invoice is netted off below.
    v_total   := new.job_price::numeric;
    v_deposit := 0;

    select c.email
      into v_email
      from clients c
     where c.id = new.client_id;
  end if;

  if v_total is null or v_total <= 0 then
    raise log '[on_drone_job_delivered] job % delivered with no billable total (job_price=%, quote_id=%) — skipping',
      new.id, new.job_price, new.quote_id;
    return new;
  end if;

  v_email := nullif(btrim(coalesce(v_email, '')), '');
  if v_email is null then
    -- payments.customer_email is NOT NULL. The old body wrote
    -- 'unknown@pending.com', which Square happily invoices into the void.
    raise log '[on_drone_job_delivered] job % delivered with no customer email — skipping billing', new.id;
    return new;
  end if;

  -- Deposits already recorded against either key (waived ones do not count).
  select coalesce(sum(p.amount), 0)
    into v_paid_deposit
    from payments p
   where p.payment_type = 'deposit'
     and p.status <> 'waived'
     and (
       (new.quote_id is not null and p.quote_id = new.quote_id)
       or p.job_id = new.id
     );

  v_deposit := least(greatest(coalesce(v_deposit, 0), 0), v_total);
  v_balance := round(v_total - greatest(v_deposit, v_paid_deposit), 2);

  -- ---- deposit row --------------------------------------------------------
  if v_deposit > 0 then
    select p.id
      into v_existing
      from payments p
     where p.payment_type = 'deposit'
       and (
         (new.quote_id is not null and p.quote_id = new.quote_id)
         or p.job_id = new.id
       )
     limit 1;

    if v_existing is not null then
      raise log '[on_drone_job_delivered] job % already has deposit payment % — skipping', new.id, v_existing;
    else
      insert into payments (quote_id, job_id, payment_type, status, amount, customer_email, delivery_date)
      values (new.quote_id, new.id, 'deposit', 'pending', v_deposit, v_email, now());
    end if;
  end if;

  -- ---- balance row --------------------------------------------------------
  -- payments_amount_check requires amount > 0, so a zero balance is skipped
  -- rather than inserted-and-rejected.
  if v_balance > 0 then
    v_existing := null;

    select p.id
      into v_existing
      from payments p
     where p.payment_type = 'balance'
       and (
         (new.quote_id is not null and p.quote_id = new.quote_id)
         or p.job_id = new.id
       )
     limit 1;

    if v_existing is not null then
      raise log '[on_drone_job_delivered] job % already has balance payment % — skipping', new.id, v_existing;
    else
      insert into payments (quote_id, job_id, payment_type, status, amount, customer_email, due_date, delivery_date)
      values (new.quote_id, new.id, 'balance', 'pending', v_balance, v_email, now() + interval '15 days', now());
    end if;
  else
    raise log '[on_drone_job_delivered] job % balance resolves to % — no balance invoice', new.id, v_balance;
  end if;

  raise log '[on_drone_job_delivered] job % delivered → billing prepared (total=%, deposit=%, balance=%)',
    new.id, v_total, v_deposit, v_balance;

  return new;

exception
  when others then
    -- CRITICAL: this trigger is AFTER UPDATE and shares the caller's
    -- transaction. Letting an exception escape would roll back the delivery
    -- itself. Billing degrades to a log line; the mission still delivers.
    raise log '[on_drone_job_delivered] billing FAILED for job %: % (SQLSTATE %)', new.id, sqlerrm, sqlstate;
    return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. widen the firing surface (see header note 4)
-- ---------------------------------------------------------------------------

drop trigger if exists trg_drone_job_delivered on public.drone_jobs;

create trigger trg_drone_job_delivered
after update of status, delivery_status on public.drone_jobs
for each row
when (new.status = 'delivered'::drone_job_status)
execute function public.on_drone_job_delivered();
