-- VAPI Call Logs — stores end-of-call reports from VAPI voice assistants
-- Webhook workflow: n8n (vapi-webhook.json) → this table

CREATE TABLE IF NOT EXISTS public.vapi_call_logs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id       text        NOT NULL,
  phone_number_id text,
  assistant_id  text,
  assistant_name text,
  caller_number text,
  ended_reason  text,
  transcript    text,
  recording_url text,
  duration_seconds integer  DEFAULT 0,
  started_at    timestamptz,
  ended_at      timestamptz,
  summary       text,
  messages_json jsonb       DEFAULT '[]'::jsonb,
  created_at    timestamptz DEFAULT now(),

  CONSTRAINT uq_vapi_call_id UNIQUE (call_id)
);

-- Index for lookups by assistant and time range
CREATE INDEX IF NOT EXISTS idx_vapi_calls_assistant
  ON public.vapi_call_logs (assistant_id, created_at DESC);

-- Index for caller number lookups
CREATE INDEX IF NOT EXISTS idx_vapi_calls_caller
  ON public.vapi_call_logs (caller_number);

-- RLS: service role only (n8n uses service key)
ALTER TABLE public.vapi_call_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all" ON public.vapi_call_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.vapi_call_logs IS 'Stores VAPI voice assistant call transcripts and metadata. Populated by n8n webhook workflow.';
