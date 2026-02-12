-- Add missing enum values to drone_job_status
-- Separate file because ALTER TYPE ADD VALUE cannot run inside a transaction

ALTER TYPE drone_job_status ADD VALUE IF NOT EXISTS 'complete' AFTER 'uploaded';
ALTER TYPE drone_job_status ADD VALUE IF NOT EXISTS 'failed' AFTER 'delivered';
