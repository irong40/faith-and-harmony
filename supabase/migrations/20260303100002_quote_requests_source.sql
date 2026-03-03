-- Phase 1: Intake API and Lead Tracking
-- Add source tracking and relax email constraint on quote_requests
-- Required for bot created requests that may not have caller email

-- Add source column to distinguish how the request was created
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';
  -- values: web | voice_bot | manual

-- Relax email NOT NULL constraint for voice bot leads that may not capture email
ALTER TABLE public.quote_requests
  ALTER COLUMN email DROP NOT NULL;

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_quote_requests_source
  ON public.quote_requests (source, created_at DESC);

COMMENT ON COLUMN public.quote_requests.source IS 'How this request was created: web (landing page form), voice_bot (Vapi intake), manual (admin direct entry).';
