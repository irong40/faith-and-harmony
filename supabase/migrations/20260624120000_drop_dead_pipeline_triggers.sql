-- Cleanup: remove dead "processing pipeline" automation.
--
-- The n8n processing/delivery pipeline never ran in production: processing_jobs
-- (1 seed row), processing_steps (0 rows) and delivery_log (0 rows) are all
-- empty. These triggers fire on drone_jobs status changes / inserts and either
-- create orphan rows or POST to a dead, hardcoded ephemeral n8n tunnel. The job
-- lifecycle runs entirely on edge functions + the remaining triggers.
--
-- Tables (processing_jobs, processing_steps, delivery_log) are intentionally
-- LEFT in place. Idempotent so a later `supabase db push` is a no-op.

-- 1. Dead pipeline auto-create (inserted an orphan processing_jobs row on 'ingested')
DROP TRIGGER IF EXISTS trg_drone_job_ingested ON public.drone_jobs;
DROP FUNCTION IF EXISTS public.on_drone_job_ingested();

-- 2. Dead processing_jobs completion handler (processing_jobs never updates)
DROP TRIGGER IF EXISTS trg_processing_complete ON public.processing_jobs;
DROP FUNCTION IF EXISTS public.on_processing_complete();

-- 3. Dead n8n notify on job creation — POSTed to a hardcoded, expired
--    trycloudflare.com quick-tunnel ("auto-create calendar event / WF6").
--    Silently failed on every insert. Manual "Add to Calendar" remains the path.
DROP TRIGGER IF EXISTS on_drone_job_created_notify_n8n ON public.drone_jobs;
DROP FUNCTION IF EXISTS public.notify_n8n_drone_job_created();

-- 4. Dead SECURITY DEFINER view over the empty pipeline tables (security advisor ERROR)
DROP VIEW IF EXISTS public.v_recent_pipeline_errors;
