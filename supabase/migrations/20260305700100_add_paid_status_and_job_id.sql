-- Add 'paid' to drone_job_status enum
-- Lifecycle position: complete (processing done) -> paid (balance received) -> delivered (files sent)
-- Delivery is gated on payment confirmation via Square webhook
ALTER TYPE drone_job_status ADD VALUE IF NOT EXISTS 'paid' AFTER 'complete';

-- Add job_id FK to payments table for direct job lookup
-- Eliminates two-hop join through quotes when finding payments for a job
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES drone_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_job_id
  ON payments (job_id)
  WHERE job_id IS NOT NULL;
