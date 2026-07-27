-- M1 — repair create_drone_job_from_quote(). Four real defects:
--
--   (a) UNIT INVERSION. The old body wrote (v_quote.total * 100)::INTEGER into
--       drone_jobs.job_price with the comment "drone_jobs store cents". The data
--       says otherwise: live job_price values are 70 / 80 / 150, and
--       fn_marketplace_lead_to_mission writes ROUND(COALESCE(bid_amount,...)).
--       job_price is DOLLARS. A $225 quote was landing as 22500.
--       -> round(v_quote.total)::integer
--
--   (b) It wrote customer_id (the deprecated customers table) and never
--       client_id, so every quote-born job was invisible to sortie, whose
--       PostgREST select embeds clients(name,company) via
--       drone_jobs_client_id_fkey. Now resolves or creates a clients row by
--       case-insensitive email.
--
--   (c) It never set site_address, property_type or processing_template_id.
--       property_type silently defaulted to 'residential' (NOT NULL DEFAULT)
--       and crm_sync.suggested_job_type() returned None because preset_name
--       came back empty, leaving the sortie job-type radio on whatever the
--       operator picked last — a silent mis-processing, not an error.
--
--   (d) `IF v_quote IS NULL` on a RECORD is true only when EVERY field is null,
--       so a missing quote fell through instead of raising. -> IF NOT FOUND.
--
-- Idempotency guard is retained on purpose: respond-to-quote/index.ts:118 RPCs
-- this function on the same UPDATE that fires trg_quote_accepted -> on_quote_accepted,
-- so it is invoked twice per acceptance. The second call returns the first job.
--
-- SORTIE CONTRACT: no column renamed, no FK renamed, no enum touched.
-- drone_job_status still takes 'intake'; drone_jobs_client_id_fkey and
-- drone_jobs_processing_template_id_fkey are only referenced, never altered.
--
-- additive   : yes — create or replace of one function, no schema change
-- idempotent : yes — create or replace; re-running is a no-op
-- reversible : yes — the prior body is preserved in migration 20260305300000
--              (quote_to_drone_job) and can be re-applied verbatim
--
-- verification (after an accept, read-only):
--   select j.job_number, j.job_price, j.client_id, j.customer_id,
--          j.site_address, j.property_type, pt.preset_name, c.email
--     from drone_jobs j
--     left join clients c on c.id = j.client_id
--     left join processing_templates pt on pt.id = j.processing_template_id
--    where j.quote_id = '<quote uuid>';
--   -- expect: job_price = round(quotes.total) in DOLLARS, client_id NOT NULL,
--   --         customer_id NULL, site_address = quote_requests.address

create or replace function public.create_drone_job_from_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_quote         record;
  v_qr            record;
  v_client_id     uuid;
  v_package_id    uuid;
  v_template_id   uuid;
  v_preset        text;
  v_job_type      text;
  v_property_type text;
  v_email         text;
  v_address       text;
  v_job_id        uuid;
  v_existing_job  uuid;
begin
  select q.id, q.request_id, q.total, q.line_items, q.notes
    into v_quote
    from quotes q
   where q.id = p_quote_id;

  -- (d) RECORD IS NULL only when every field is null; NOT FOUND is the real test
  if not found then
    raise exception 'Quote % not found', p_quote_id;
  end if;

  -- Idempotency: this function is invoked twice per acceptance (see header)
  select id
    into v_existing_job
    from drone_jobs
   where quote_id = p_quote_id
   limit 1;

  if v_existing_job is not null then
    return v_existing_job;
  end if;

  select qr.id, qr.name, qr.email, qr.phone, qr.address, qr.job_type, qr.preferred_date
    into v_qr
    from quote_requests qr
   where qr.id = v_quote.request_id;

  if not found then
    raise exception 'Quote % has no quote_request %', p_quote_id, v_quote.request_id;
  end if;

  v_job_type := lower(btrim(coalesce(v_qr.job_type, '')));
  v_email    := nullif(btrim(coalesce(v_qr.email, '')), '');
  v_address  := nullif(btrim(coalesce(v_qr.address, '')), '');

  -- (b) resolve or create the CLIENT. clients, not customers.
  if v_email is not null then
    select c.id
      into v_client_id
      from clients c
     where lower(btrim(coalesce(c.email, ''))) = lower(v_email)
     order by c.created_at
     limit 1;
  end if;

  if v_client_id is null then
    insert into clients (name, email, phone, address)
    values (
      coalesce(nullif(btrim(coalesce(v_qr.name, '')), ''), 'Unknown'),
      v_email,
      nullif(btrim(coalesce(v_qr.phone, '')), ''),
      v_address
    )
    returning id into v_client_id;
  end if;

  -- (c) property_type. Residential wins if stated outright, otherwise any
  --     commercial-ish token promotes it. Free-text job_type from the web form
  --     is messy ('Commercial Roof Inspection', 'Listing Pro ($450)', ...).
  v_property_type := case
    when v_job_type ~ 'residential' then 'residential'
    when v_job_type ~ '(commercial|industrial|construction|inspection|survey|land|mapping|utilit|mining|solar|thermal|infrastructure|corridor|agricult|forestry|crane|warehouse|roof)'
      then 'commercial'
    else 'residential'
  end;

  -- (c) processing_template_id. Exact preset_name / path_code first.
  select pt.id
    into v_template_id
    from processing_templates pt
   where pt.active = true
     and (
       lower(btrim(coalesce(pt.preset_name, ''))) = v_job_type
       or lower(btrim(coalesce(pt.path_code, ''))) = v_job_type
     )
   limit 1;

  -- Keyword fallback. Deliberately conservative: an UNMATCHED job_type must
  -- leave processing_template_id NULL. A wrong preset is worse than none —
  -- crm_sync.suggested_job_type() is a plain dict .get(), so a bad preset_name
  -- silently processes the mission under the wrong ODM profile with no warning,
  -- while a NULL template just leaves the sortie radio alone.
  if v_template_id is null and v_job_type <> '' then
    v_preset := case
      when v_job_type ~ 'luxury'                     then 'luxury'
      when v_job_type ~ '(listing[ _-]?pro|re[_ -]?pro)'     then 're_pro'
      when v_job_type ~ '(listing[ _-]?lite|re[_ -]?basic)'  then 're_basic'
      when v_job_type ~ 'vegetation'                 then 'vegetation'
      when v_job_type ~ 'construction'               then 'construction'
      when v_job_type ~ '(thermal|solar)'            then 'thermal_inspection'
      when v_job_type ~ '(roof|inspection)'          then 'adiat_roof'
      when v_job_type ~ '(survey|topo|mapping|\mland\M)' then 'mapping'
      when v_job_type ~ 'commercial'                 then 'commercial'
      else null
    end;

    if v_preset is not null then
      select pt.id
        into v_template_id
        from processing_templates pt
       where pt.active = true
         and pt.preset_name = v_preset
       limit 1;
    end if;
  end if;

  -- Best-effort package match by job_type (unchanged behaviour)
  select id
    into v_package_id
    from drone_packages
   where active = true
     and (category = v_qr.job_type or code = v_qr.job_type)
   order by abs(price - v_quote.total)
   limit 1;

  if v_package_id is null then
    select id
      into v_package_id
      from drone_packages
     where active = true
     order by price
     limit 1;
  end if;

  insert into drone_jobs (
    client_id,
    quote_id,
    package_id,
    processing_template_id,
    status,
    property_address,
    site_address,
    property_type,
    scheduled_date,
    job_price,
    admin_notes
  ) values (
    v_client_id,
    p_quote_id,
    v_package_id,
    v_template_id,
    'intake',
    coalesce(v_address, 'Address pending - ' || coalesce(v_qr.name, 'unknown')),
    v_address,
    v_property_type,
    v_qr.preferred_date,
    -- (a) DOLLARS. Live rows are 70 / 80 / 150 and
    --     fn_marketplace_lead_to_mission writes round(bid_amount)::integer.
    round(v_quote.total)::integer,
    'Auto-created from accepted quote'
  )
  returning id into v_job_id;

  return v_job_id;
end;
$function$;
