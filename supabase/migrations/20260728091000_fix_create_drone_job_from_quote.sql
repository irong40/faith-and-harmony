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
-- PRESET ALLOWLIST (verified read-only 2026-07-27). Every preset_name this
-- function can select must satisfy BOTH conditions or the mission silently
-- fails to prefill in sortie:
--   1. an active row in public.processing_templates, AND
--   2. a key in crm_sync.PRESET_TO_JOB_TYPE on the branch that actually runs.
--
-- Condition 2 is branch-sensitive and that is what bit this file. The earlier
-- draft mapped roof/inspection to 'adiat_roof'. That name satisfies (1) — the
-- row exists and is active, created by the rename in
-- 20260727193240_preset_cleanup_unique_preset_name.sql — but NOT (2):
--
--   PortfolioMaker main  (production): keys are adiat, thermal_inspection, ...
--                                      adiat_roof ABSENT
--   PortfolioMaker dev              : adiat_roof + adiat_insurance present
--                                      (commit 2f20b56, map-ahead convention)
--   PortfolioMaker feat/opensplat   : adiat_roof ABSENT (branched before 2f20b56)
--
-- 20260727193240's header claims the sortie keys "shipped FIRST". They shipped
-- to dev only; 2f20b56 is not an ancestor of main. suggested_job_type() is a
-- plain dict .get(), so under production crm_sync an 'adiat_roof' job returns
-- None and the operator flies whatever the radio was last left on.
--
-- 'adiat' is a key on main, dev AND feat/opensplat, resolves to the same sortie
-- job type ('roof_inspection') that adiat_roof resolves to on dev, and is an
-- active processing_templates row. It is the only roof-family value that is
-- correct on every branch, so it is what this function targets.
--
-- Live quote_requests.job_type values that reach this branch today:
-- 'Inspection Data ($1,200)' x4, 'Commercial Roof Inspection', 'inspection',
-- 'roof-inspection', 'Industrial Crane Inspection' — 8 rows, all of which would
-- have been silent no-prefills under the previous value.
--
-- Every other value in the CASE below (luxury, re_pro, re_basic, vegetation,
-- construction, thermal_inspection, mapping, commercial) was checked against
-- both conditions and passes on main.
--
-- Belt-and-braces: the resolved preset_name is now written into admin_notes, a
-- column crm_sync already selects into CrmMission.admin_notes and never writes
-- back (it is not in WRITABLE_FIELDS). Whatever this function picks is visible
-- on the mission card, so a future map gap degrades to a wrong-looking note
-- rather than to silence.
--
-- Idempotency guard is retained on purpose: respond-to-quote/index.ts:118 RPCs
-- this function on the same UPDATE that fires trg_quote_accepted -> on_quote_accepted,
-- so it is invoked twice per acceptance. The second call returns the first job.
--
-- SORTIE CONTRACT: no column renamed, no FK renamed, no enum touched.
-- drone_job_status still takes 'intake'; drone_jobs_client_id_fkey and
-- drone_jobs_processing_template_id_fkey are only referenced, never altered.
-- photogrammetry_status is not written here. report_templates.code and the
-- 'media' bucket are not referenced at all. The only new write is admin_notes,
-- which is not a contract element: crm_sync reads it into CrmMission.admin_notes
-- and never writes it back (absent from WRITABLE_FIELDS), so changing its text
-- cannot round-trip into drone_jobs.
--
-- MUST STAY `create or replace`, never drop-then-create. 20260713170000
-- (security_hardening_advisors) revoked EXECUTE on this function from PUBLIC and
-- anon and re-granted only to authenticated + service_role. CREATE OR REPLACE
-- preserves that ACL; DROP FUNCTION discards it and the function comes back with
-- the default PUBLIC EXECUTE, re-opening an anon-callable SECURITY DEFINER RPC.
-- The `set search_path to 'public'` below is likewise required by that migration.
--
-- additive   : yes — create or replace of one function, no schema change
-- idempotent : yes — create or replace; re-running is a no-op. The function is
--              itself idempotent per quote via the existing-job guard below.
-- reversible : yes — the prior body is preserved verbatim in migration
--              20260305300000_quote_to_drone_job.sql:48 and can be re-applied.
--              Confirmed 2026-07-27 that this is the last migration carrying a
--              body for it: 20260403100000 only calls it, 20260713170000 only
--              adjusts its grants and search_path.
--
-- pre-flight (read-only) — every preset this function can name must be an
-- active row. Run before applying; expect one row per value, all active = true:
--   select preset_name, active from processing_templates
--    where preset_name in ('luxury','re_pro','re_basic','vegetation',
--                          'construction','thermal_inspection','adiat',
--                          'mapping','commercial');
--   -- then confirm each of those nine is a key in PRESET_TO_JOB_TYPE on
--   -- PortfolioMaker main:  git show main:crm_sync.py
--
-- verification (after an accept, read-only):
--   select j.job_number, j.job_price, j.client_id, j.customer_id,
--          j.site_address, j.property_type, pt.preset_name, j.admin_notes, c.email
--     from drone_jobs j
--     left join clients c on c.id = j.client_id
--     left join processing_templates pt on pt.id = j.processing_template_id
--    where j.quote_id = '<quote uuid>';
--   -- expect: job_price = round(quotes.total) in DOLLARS, client_id NOT NULL,
--   --         customer_id NULL, site_address = quote_requests.address,
--   --         admin_notes names the same preset_name the join returns
--   --         (or says NONE MATCHED when processing_template_id is NULL)

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
      -- 'adiat', NOT 'adiat_roof'. See the PRESET ALLOWLIST note in the header:
      -- adiat_roof is a key only on PortfolioMaker dev, never on main.
      when v_job_type ~ '(roof|inspection)'          then 'adiat'
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

  -- Normalise v_preset to the preset_name actually resolved, whichever branch
  -- above won (the exact-match path never sets v_preset). SELECT INTO with no
  -- matching row assigns NULL, so an unresolved template clears any stale value.
  select pt.preset_name
    into v_preset
    from processing_templates pt
   where pt.id = v_template_id;

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
    -- Make the template choice visible to the sortie operator instead of silent.
    'Auto-created from accepted quote. Processing template: '
      || coalesce(
           v_preset,
           'NONE MATCHED (job_type: '
             || coalesce(nullif(v_job_type, ''), '(empty)')
             || ') - pick one before processing'
         )
  )
  returning id into v_job_id;

  return v_job_id;
end;
$function$;
