-- Phase 10: Quote lifecycle foundation
-- Creates quotes table, status enum, RLS policies, and daily expiry cron job

-- Quote status enum
CREATE TYPE public.quote_status AS ENUM (
  'draft',     -- admin building the quote, not yet sent
  'sent',      -- emailed to customer, awaiting response
  'accepted',  -- customer accepted (triggers Phase 11 / Phase 12 flows)
  'declined',  -- customer declined
  'revised',   -- admin revised a declined quote, returned to sent
  'expired'    -- 30 days elapsed without customer response
);

-- Quotes table
CREATE TABLE public.quotes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  request_id        uuid        NOT NULL REFERENCES public.quote_requests(id) ON DELETE RESTRICT,
  status            public.quote_status NOT NULL DEFAULT 'draft',
  line_items        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  total             numeric(10,2) NOT NULL DEFAULT 0,
  deposit_amount    numeric(10,2) NOT NULL DEFAULT 0,
  notes             text,
  acceptance_token  text        NOT NULL DEFAULT gen_random_uuid()::text,
  sent_at           timestamptz,
  expires_at        timestamptz,
  accepted_at       timestamptz,
  declined_at       timestamptz,
  decline_reason    text
);

COMMENT ON TABLE public.quotes IS 'Formal quotes sent to customers. Linked to a quote_request. One request may have multiple quote revisions (track via status transitions).';
COMMENT ON COLUMN public.quotes.line_items IS 'JSONB array: [{description: string, quantity: number, unit_price: number}]';
COMMENT ON COLUMN public.quotes.acceptance_token IS 'UUID token used in the tokenized client URL for Phase 11 acceptance page. Never expose via admin-only queries.';
COMMENT ON COLUMN public.quotes.expires_at IS 'Set to sent_at + 30 days when status transitions to sent. NULL while in draft.';

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_quotes_updated_at();

-- Row Level Security
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Admins can read and write all quotes
CREATE POLICY "admins_manage_quotes"
  ON public.quotes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role bypasses RLS (used by edge functions)
-- No additional policy needed; service_role key bypasses RLS by default.

-- Index for common queries
CREATE INDEX idx_quotes_request_id   ON public.quotes(request_id);
CREATE INDEX idx_quotes_status       ON public.quotes(status);
CREATE INDEX idx_quotes_expires_at   ON public.quotes(expires_at) WHERE status = 'sent';

-- Daily expiry cron job: sets status to expired for sent quotes past their expiry date
-- Requires pg_cron extension (already enabled on this project)
SELECT cron.schedule(
  'expire-sent-quotes',
  '0 2 * * *',
  $$
  UPDATE public.quotes
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'sent'
    AND expires_at < now();
  $$
);
