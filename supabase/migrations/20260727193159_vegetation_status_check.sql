-- M4 (remainder — delivery_status CHECK was widened earlier today):
-- vegetation_status values are exactly what the live Path E workflow
-- writes (verified against the 2026-07-26 n8n export) plus 'pending'
-- reserved as a legal initial value. All current rows are NULL.
ALTER TABLE drone_jobs ADD CONSTRAINT drone_jobs_vegetation_status_check
  CHECK (vegetation_status IS NULL OR vegetation_status IN
    ('pending','detecting','classifying','assessing','generating_report','review','complete','failed'));
