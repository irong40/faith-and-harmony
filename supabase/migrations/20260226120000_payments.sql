-- Phase 12: Square payment lifecycle
-- Creates payments table, payment_status enum, RLS, and daily overdue detection cron

-- Payment type: deposit (25% upfront) or balance (remaining 75%, Net 15)
DO $$ BEGIN
  CREATE TYPE public.payment_type AS ENUM ('deposit', 'balance');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Payment status lifecycle
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'waived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Payments table: one row per Square invoice
CREATE TABLE IF NOT EXISTS public.payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id              uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  payment_type          public.payment_type NOT NULL,
  status                public.payment_status NOT NULL DEFAULT 'pending',
  amount                numeric(10,2) NOT NULL CHECK (amount > 0),

  -- Square integration
  square_invoice_id     text,
  square_payment_id     text,
  square_invoice_url    text,

  -- Timing
  due_date              timestamptz,
  paid_at               timestamptz,
  delivery_date         timestamptz,

  -- Notifications
  customer_email        text NOT NULL,
  overdue_notified_at   timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS 'One row per Square invoice. Each quote generates two rows: a deposit row (payment_type=deposit) and a balance row (payment_type=balance, Net 15).';
COMMENT ON COLUMN public.payments.square_invoice_id IS 'Square invoice ID returned by POST /v2/invoices. Used for webhook matching on invoice.payment_made events.';
COMMENT ON COLUMN public.payments.square_payment_id IS 'Square payment ID populated when webhook invoice.payment_made fires. NULL until payment confirmed.';
COMMENT ON COLUMN public.payments.customer_email IS 'Denormalized from quote_requests. Square webhooks carry only Square IDs, so email must be available here for receipt and overdue notifications without a join chain.';
COMMENT ON COLUMN public.payments.due_date IS 'For balance rows: delivery_date + 15 days (Net 15). NULL for deposit rows (deposit is due immediately).';
COMMENT ON COLUMN public.payments.overdue_notified_at IS 'Set when overdue reminder email fires. Prevents duplicate notifications on subsequent daily cron runs.';

-- Index for fast Square webhook lookup by invoice ID
CREATE INDEX IF NOT EXISTS idx_payments_square_invoice_id
  ON public.payments (square_invoice_id)
  WHERE square_invoice_id IS NOT NULL;

-- Index for quote lookup (admin CRM view)
CREATE INDEX IF NOT EXISTS idx_payments_quote_id
  ON public.payments (quote_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.payments_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_set_updated_at();

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admin users can read all payments
CREATE POLICY "Admin can read payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin users can insert payments (for manual adjustments)
CREATE POLICY "Admin can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin users can update payments
CREATE POLICY "Admin can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role bypasses RLS (used by edge functions via service key)
-- No additional policy needed; service_role key bypasses RLS by default.

-- Daily overdue check: mark balance payments past due_date as overdue
-- Runs at 6 AM UTC daily (requires pg_cron extension)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'payments-overdue-check',
      '0 6 * * *',
      'UPDATE public.payments SET status = ''overdue'' WHERE payment_type = ''balance'' AND status = ''pending'' AND due_date IS NOT NULL AND due_date < now();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping payments-overdue-check cron job';
  END IF;
END $$;
