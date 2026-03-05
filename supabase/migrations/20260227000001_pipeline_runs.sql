-- Pipeline runs table: tracks folder_watcher detections and processing status
-- Used by n8n "Sentinel Folder Watcher - Receiver" workflow

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_number INTEGER,
  folder_path TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  photo_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  has_ppk_data BOOLEAN DEFAULT FALSE,
  total_size_bytes BIGINT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'detected',
  detected_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure mission_number column exists (table may pre-date this migration)
ALTER TABLE public.pipeline_runs ADD COLUMN IF NOT EXISTS mission_number INTEGER;

-- Index for lookups by mission number and status
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_mission ON public.pipeline_runs (mission_number);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.pipeline_runs (status);

-- RLS: service role only (n8n uses service key)
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pipeline_runs"
  ON public.pipeline_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_pipeline_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_runs_updated_at
  BEFORE UPDATE ON public.pipeline_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pipeline_runs_updated_at();
