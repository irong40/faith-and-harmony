-- Fix: photogrammetry columns missing from drone_jobs
-- Original migration 20260121210000 was recorded but columns never created

DO $$ BEGIN
  CREATE TYPE public.photogrammetry_status AS ENUM (
    'pending', 'queued', 'processing', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS photogrammetry_status public.photogrammetry_status,
  ADD COLUMN IF NOT EXISTS nodeodm_task_id TEXT,
  ADD COLUMN IF NOT EXISTS model_file_path TEXT,
  ADD COLUMN IF NOT EXISTS orthophoto_path TEXT,
  ADD COLUMN IF NOT EXISTS pointcloud_path TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS processing_options JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_drone_jobs_photogrammetry_status
  ON public.drone_jobs(photogrammetry_status)
  WHERE photogrammetry_status IS NOT NULL;
