-- =====================================================
-- FIX: Ensure pilot_id column exists on drone_jobs
-- =====================================================
-- RLS policies in 20260124174500_automate_workflow.sql reference
-- drone_jobs.pilot_id. This migration ensures the column,
-- FK constraint, index, and comment all exist.

-- 1. Add pilot_id column if it doesn't already exist
ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS pilot_id UUID;

-- 2. Add FK constraint if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'drone_jobs_pilot_id_fkey'
      AND table_name = 'drone_jobs'
  ) THEN
    ALTER TABLE public.drone_jobs
      ADD CONSTRAINT drone_jobs_pilot_id_fkey
      FOREIGN KEY (pilot_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

COMMENT ON COLUMN public.drone_jobs.pilot_id IS 'Assigned pilot for the mission; referenced by RLS policies';

-- 3. Index for RLS policy lookups and pilot filtering
CREATE INDEX IF NOT EXISTS idx_drone_jobs_pilot_id ON public.drone_jobs(pilot_id);
