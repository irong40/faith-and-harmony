-- OI-042: give drone_jobs a dedicated lead provenance column and stage, so
-- source_platform goes back to meaning the aircraft only.
-- Additive: two nullable columns plus a data move. The widened source_platform
-- CHECK from 20261113150000 stays (it only adds; do not narrow it while rows exist).
-- Undo: update drone_jobs set source_platform = lead_source where lead_source is not null
--   and source_platform is null; then drop columns lead_source, lead_stage.
ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS lead_stage text;

ALTER TABLE public.drone_jobs DROP CONSTRAINT IF EXISTS drone_jobs_lead_source_check;
ALTER TABLE public.drone_jobs ADD CONSTRAINT drone_jobs_lead_source_check
  CHECK (lead_source IS NULL OR lead_source = ANY (ARRAY[
    'referral','flyguys','zeitview','bees360','droners','web','email','phone','other'
  ]::text[]));

ALTER TABLE public.drone_jobs DROP CONSTRAINT IF EXISTS drone_jobs_lead_stage_check;
ALTER TABLE public.drone_jobs ADD CONSTRAINT drone_jobs_lead_stage_check
  CHECK (lead_stage IS NULL OR lead_stage = ANY (ARRAY[
    'lead','quoted','booked','won','lost'
  ]::text[]));

COMMENT ON COLUMN public.drone_jobs.lead_source IS 'Where the job came from (provenance). Not the aircraft: that is source_platform.';
COMMENT ON COLUMN public.drone_jobs.lead_stage IS 'Marketing pipeline stage of the lead behind this job: lead, quoted, booked, won, lost.';

-- Move the lead-source values out of source_platform (aircraft values stay put).
UPDATE public.drone_jobs
   SET lead_source = source_platform,
       source_platform = NULL
 WHERE source_platform = ANY (ARRAY['referral','flyguys','zeitview','bees360','droners','web','email','phone','other']);
