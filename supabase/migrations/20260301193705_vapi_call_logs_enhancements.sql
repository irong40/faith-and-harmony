-- Enhance vapi_call_logs with originating line tracking and language preference
-- These fields support the n8n webhook workflow routing

ALTER TABLE public.vapi_call_logs
  ADD COLUMN IF NOT EXISTS originating_line text,           -- 'sentinel' or 'faith_and_harmony'
  ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'en',  -- 'en' or 'es'
  ADD COLUMN IF NOT EXISTS is_repeat_caller boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS service_request_id uuid REFERENCES public.service_requests(id);

-- Index for linking call logs to customers
CREATE INDEX IF NOT EXISTS idx_vapi_calls_customer
  ON public.vapi_call_logs (customer_id) WHERE customer_id IS NOT NULL;

COMMENT ON COLUMN public.vapi_call_logs.originating_line IS 'Which phone line the call came in on: sentinel or faith_and_harmony';
COMMENT ON COLUMN public.vapi_call_logs.customer_id IS 'FK to customers table if caller was matched by phone number';
COMMENT ON COLUMN public.vapi_call_logs.service_request_id IS 'FK to service_requests if an inquiry was created from this call';
