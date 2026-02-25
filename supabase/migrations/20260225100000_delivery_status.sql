-- Migration: delivery_status
-- Phase 4 Plan 1 Task 1 — Client Delivery
-- Adds delivery tracking columns to drone_jobs and auto-transition trigger

ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'not_ready'
    CHECK (delivery_status IN ('not_ready', 'ready', 'sent', 'delivery_confirmed')),
  ADD COLUMN IF NOT EXISTS delivery_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_email_to TEXT,
  ADD COLUMN IF NOT EXISTS delivery_drive_url TEXT;

-- Index for filtering by delivery status
CREATE INDEX IF NOT EXISTS idx_drone_jobs_delivery_status
  ON public.drone_jobs(delivery_status);

-- Auto-transition delivery_status to 'ready' when pipeline completes
CREATE OR REPLACE FUNCTION public.on_processing_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    UPDATE public.drone_jobs
    SET delivery_status = 'ready', updated_at = now()
    WHERE id = NEW.mission_id
    AND delivery_status = 'not_ready';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists before recreating
DROP TRIGGER IF EXISTS trg_processing_complete ON public.processing_jobs;

CREATE TRIGGER trg_processing_complete
  AFTER UPDATE ON public.processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.on_processing_complete();
