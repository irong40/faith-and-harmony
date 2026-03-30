-- Auto-advance drone_jobs status based on data changes
-- Removes the need for admin to manually click through statuses

-- 1. intake → scheduled: when scheduled_date is set
-- 2. scheduled → captured: preserved (pilot portal handles this)
-- 3. captured → uploaded: already handled by drone-job-token edge function
-- 4. flight log → complete: already handled by handle_flight_log_created trigger
-- 5. QA/processing/delivered: already handled by edge functions

CREATE OR REPLACE FUNCTION public.auto_advance_drone_job_status()
RETURNS TRIGGER AS $$
BEGIN
  -- intake → scheduled: when a scheduled_date is added
  IF OLD.status = 'intake' AND NEW.scheduled_date IS NOT NULL AND OLD.scheduled_date IS NULL THEN
    NEW.status := 'scheduled';
  END IF;

  -- If scheduled_date is cleared, revert to intake (only if still in scheduled)
  IF OLD.status = 'scheduled' AND NEW.scheduled_date IS NULL AND OLD.scheduled_date IS NOT NULL THEN
    NEW.status := 'intake';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to make idempotent
DROP TRIGGER IF EXISTS auto_advance_status ON drone_jobs;

CREATE TRIGGER auto_advance_status
  BEFORE UPDATE ON drone_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_advance_drone_job_status();
