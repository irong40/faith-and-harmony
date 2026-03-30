-- Scheduled emails table for drip sequences
-- Supports outreach (Day 1/4/10), post-delivery (Day 1/7/14/30),
-- and Vapi follow-up (immediate) sequences.
--
-- The process-drip edge function polls this table on a cron schedule
-- and sends any emails where scheduled_for <= NOW() and status = 'pending'.

CREATE TYPE public.drip_sequence_type AS ENUM (
  'outreach_drip',
  'post_delivery',
  'vapi_followup'
);

CREATE TYPE public.scheduled_email_status AS ENUM (
  'pending',
  'sent',
  'skipped',
  'cancelled'
);

CREATE TABLE public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who
  lead_id UUID REFERENCES public.drone_leads(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  -- What
  sequence_type public.drip_sequence_type NOT NULL,
  sequence_step INTEGER NOT NULL CHECK (sequence_step >= 1 AND sequence_step <= 10),
  -- When
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  -- Status
  status public.scheduled_email_status NOT NULL DEFAULT 'pending',
  skip_reason TEXT,
  -- Context (template variables: job_id, company_name, service_focus, etc.)
  context JSONB DEFAULT '{}',
  -- Tracking link
  email_tracking_id UUID REFERENCES public.email_tracking(id),
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query: find due emails
CREATE INDEX idx_scheduled_emails_pending_due
  ON public.scheduled_emails (scheduled_for)
  WHERE status = 'pending';

-- Prevent duplicate sequences for the same lead
CREATE INDEX idx_scheduled_emails_lead_sequence
  ON public.scheduled_emails (lead_id, sequence_type);

-- Admin lookups
CREATE INDEX idx_scheduled_emails_status ON public.scheduled_emails (status);

-- Enable RLS (service role only for automated processing)
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scheduled emails"
  ON public.scheduled_emails FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages scheduled emails"
  ON public.scheduled_emails FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.scheduled_emails IS
  'Drip sequence queue. Rows are created by enqueue-drip and processed by process-drip on a cron schedule.';
