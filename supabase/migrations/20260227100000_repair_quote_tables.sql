-- Repair: quote_requests and quotes tables were recorded in migration history
-- but DDL never actually executed. This migration re-creates them idempotently.

-- quote_requests table (from 20260226000001)
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  phone       text,
  address     text,
  job_type    text,
  description text        NOT NULL,
  status      text        NOT NULL DEFAULT 'new'
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quote_requests' AND policyname = 'anon_insert_quote_requests'
  ) THEN
    CREATE POLICY "anon_insert_quote_requests"
      ON public.quote_requests FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- quote_status enum (from 20260226100000)
DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM (
    'draft', 'sent', 'accepted', 'declined', 'revised', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
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

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotes_updated_at ON public.quotes;
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_quotes_updated_at();

-- Admin RLS policy — all authenticated users with a profile can manage quotes
-- (single-admin app; service role bypasses RLS for edge functions)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'admins_manage_quotes'
  ) THEN
    CREATE POLICY "admins_manage_quotes"
      ON public.quotes FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
      );
  END IF;
END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_quotes_request_id ON public.quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON public.quotes(expires_at) WHERE status = 'sent';

-- NOTE: Daily expiry cron job (expire-sent-quotes) requires pg_cron extension.
-- Enable pg_cron in Supabase Dashboard > Database > Extensions, then run:
--   SELECT cron.schedule('expire-sent-quotes', '0 2 * * *',
--     'UPDATE public.quotes SET status = ''expired'', updated_at = now() WHERE status = ''sent'' AND expires_at < now();');
