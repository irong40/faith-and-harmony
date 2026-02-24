-- Add client intake columns to drone_jobs
-- Phase 2: Job Intake & Client Management

ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id),
  ADD COLUMN IF NOT EXISTS site_address TEXT,
  ADD COLUMN IF NOT EXISTS processing_template_id UUID REFERENCES public.processing_templates(id);

-- Index for client lookup
CREATE INDEX IF NOT EXISTS idx_drone_jobs_client ON public.drone_jobs(client_id);

-- Index for template lookup
CREATE INDEX IF NOT EXISTS idx_drone_jobs_template ON public.drone_jobs(processing_template_id);
