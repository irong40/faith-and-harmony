-- Add UTM tracking columns to quote_requests
-- Captures source attribution from Google Ads, organic, referral, and outreach channels.

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

COMMENT ON COLUMN public.quote_requests.utm_source IS 'Traffic source (google, facebook, referral, outreach)';
COMMENT ON COLUMN public.quote_requests.utm_medium IS 'Marketing medium (cpc, organic, email, direct)';
COMMENT ON COLUMN public.quote_requests.utm_campaign IS 'Campaign identifier (spring2026, roofer_drip, etc.)';
