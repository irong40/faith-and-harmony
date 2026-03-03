-- Phase 1: Intake API and Lead Tracking
-- Enhance vapi_call_logs with sentiment, outcome, and lead_id columns
-- Also clean up dangling FK columns from earlier exploratory migration (20260301193705)
-- Table already exists from 20260301191812_vapi_call_logs.sql

-- Drop dangling FK columns that reference nonexistent tables
-- The customers and service_requests tables do not exist in the current schema
-- (project uses clients and quote_requests instead)
ALTER TABLE public.vapi_call_logs DROP COLUMN IF EXISTS customer_id;
ALTER TABLE public.vapi_call_logs DROP COLUMN IF EXISTS service_request_id;

-- Defensive re-add of INTAKE-02 required columns (already exist from original migration
-- but included here with IF NOT EXISTS for safety and INTAKE-02 compliance documentation)
ALTER TABLE public.vapi_call_logs ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE public.vapi_call_logs ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0;

-- New columns for Phase 1 intake pipeline
ALTER TABLE public.vapi_call_logs ADD COLUMN IF NOT EXISTS sentiment text;
  -- values: positive | neutral | negative | unknown

ALTER TABLE public.vapi_call_logs ADD COLUMN IF NOT EXISTS outcome text;
  -- values: qualified | declined | transferred | voicemail | abandoned

ALTER TABLE public.vapi_call_logs ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);

-- Index for lead lookups
CREATE INDEX IF NOT EXISTS idx_vapi_calls_lead
  ON public.vapi_call_logs (lead_id) WHERE lead_id IS NOT NULL;

COMMENT ON COLUMN public.vapi_call_logs.sentiment IS 'Caller sentiment derived from Vapi call analysis. Set by n8n webhook workflow.';
COMMENT ON COLUMN public.vapi_call_logs.outcome IS 'Call outcome classification. Set by n8n webhook workflow.';
COMMENT ON COLUMN public.vapi_call_logs.lead_id IS 'FK to leads table. Links call log to the lead record created by intake-lead edge function.';
