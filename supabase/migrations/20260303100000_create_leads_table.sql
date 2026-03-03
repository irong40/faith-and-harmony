-- Phase 1: Intake API and Lead Tracking
-- Leads table: tracks bot sourced prospects through the qualification funnel
-- Populated by the intake-lead edge function for every qualified voice call

CREATE TABLE IF NOT EXISTS public.leads (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,

  -- Caller identity
  caller_name         text        NOT NULL,
  caller_phone        text        NOT NULL,
  caller_email        text,

  -- Source tracking
  source_channel      text        NOT NULL DEFAULT 'voice_bot',  -- voice_bot | web | manual
  call_id             text,       -- Vapi call ID, links to vapi_call_logs.call_id

  -- Qualification state
  qualification_status text       NOT NULL DEFAULT 'pending',
  -- values: pending | qualified | declined | transferred | no_answer

  -- Links to downstream records
  client_id           uuid        REFERENCES public.clients(id),
  quote_request_id    uuid        REFERENCES public.quote_requests(id)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by edge functions via SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "service_role_all" ON public.leads
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin read access (matching project has_role pattern)
CREATE POLICY "admins_read_leads" ON public.leads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_call_id
  ON public.leads (call_id) WHERE call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_client_id
  ON public.leads (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_qualification_status
  ON public.leads (qualification_status, created_at DESC);

COMMENT ON TABLE public.leads IS 'Bot sourced prospects. Populated by intake-lead edge function. Created alongside quote_requests for every qualified call.';
