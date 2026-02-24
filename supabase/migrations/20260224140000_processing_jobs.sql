-- Phase 3: processing_jobs table
-- Tracks per-script execution status for each pipeline run.
-- Enables real-time pipeline visibility via Supabase Realtime.

CREATE TABLE public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.drone_jobs(id) ON DELETE CASCADE,
  processing_template_id UUID REFERENCES public.processing_templates(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'awaiting_manual_edit', 'complete', 'failed', 'cancelled')),
  current_step TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  -- Each step object: { name, script, status, started_at, completed_at, error, output }
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  idempotency_key TEXT UNIQUE,
  -- Deduplication key: hash of mission_id + template_id + date
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for live pipeline status
ALTER PUBLICATION supabase_realtime ADD TABLE public.processing_jobs;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.set_processing_jobs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER processing_jobs_updated_at
  BEFORE UPDATE ON public.processing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_processing_jobs_updated_at();

-- RLS
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read processing_jobs"
  ON public.processing_jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage processing_jobs"
  ON public.processing_jobs FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX idx_processing_jobs_mission ON public.processing_jobs(mission_id);
CREATE INDEX idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX idx_processing_jobs_idempotency ON public.processing_jobs(idempotency_key);
