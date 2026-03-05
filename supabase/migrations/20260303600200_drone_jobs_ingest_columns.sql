-- =====================================================
-- Add missing ingest columns to drone_jobs for Package Router (pr-v3)
-- photo_count, video_count, has_ppk_data, source_platform already exist.
-- Only ingested_at is missing. Also adds 'ingested' enum value.
-- =====================================================

-- Add missing ingest timestamp
ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ;

-- Add 'ingested' status to drone_job_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ingested'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'drone_job_status')
  ) THEN
    ALTER TYPE public.drone_job_status ADD VALUE 'ingested' AFTER 'uploaded';
  END IF;
END$$;
