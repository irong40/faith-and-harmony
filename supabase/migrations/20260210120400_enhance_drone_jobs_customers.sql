-- =====================================================
-- ENHANCE EXISTING TABLES: drone_jobs + customers
-- Add columns for fleet linkage, geolocation, pricing,
-- and customer billing/classification
-- =====================================================

-- -----------------------------------------------
-- 1. drone_jobs: fleet + location + pricing columns
-- -----------------------------------------------
ALTER TABLE public.drone_jobs
  ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE SET NULL,
  ADD COLUMN latitude NUMERIC(10,7),
  ADD COLUMN longitude NUMERIC(10,7),
  ADD COLUMN job_price INTEGER,
  ADD COLUMN is_rush BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.drone_jobs.aircraft_id IS 'Primary aircraft assigned to this mission';
COMMENT ON COLUMN public.drone_jobs.latitude IS 'Property latitude for airspace/weather lookups';
COMMENT ON COLUMN public.drone_jobs.longitude IS 'Property longitude for airspace/weather lookups';
COMMENT ON COLUMN public.drone_jobs.job_price IS 'Final job price in cents (avoids floating-point)';
COMMENT ON COLUMN public.drone_jobs.is_rush IS 'Rush delivery surcharge flag';
COMMENT ON COLUMN public.drone_jobs.completed_at IS 'Timestamp when job was marked delivered/completed';

-- -----------------------------------------------
-- 2. customers: classification + billing columns
-- -----------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN client_type TEXT CHECK (client_type IN ('residential', 'commercial', 'brokerage', 'faith_org', 'government', 'other')),
  ADD COLUMN is_retainer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN retainer_credits_remaining INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN square_customer_id TEXT;

COMMENT ON COLUMN public.customers.client_type IS 'Customer classification for pricing and reporting';
COMMENT ON COLUMN public.customers.is_retainer IS 'True if customer is on a monthly retainer plan';
COMMENT ON COLUMN public.customers.retainer_credits_remaining IS 'Remaining prepaid mission credits';
COMMENT ON COLUMN public.customers.square_customer_id IS 'Square POS customer ID for payment integration';

-- -----------------------------------------------
-- 3. Indexes on new FK and query columns
-- -----------------------------------------------
CREATE INDEX idx_drone_jobs_aircraft_id ON public.drone_jobs(aircraft_id);
CREATE INDEX idx_drone_jobs_location ON public.drone_jobs(latitude, longitude);
CREATE INDEX idx_drone_jobs_is_rush ON public.drone_jobs(is_rush) WHERE is_rush = true;
CREATE INDEX idx_drone_jobs_completed_at ON public.drone_jobs(completed_at);
CREATE INDEX idx_customers_client_type ON public.customers(client_type);
CREATE INDEX idx_customers_is_retainer ON public.customers(is_retainer) WHERE is_retainer = true;
CREATE INDEX idx_customers_square_id ON public.customers(square_customer_id) WHERE square_customer_id IS NOT NULL;
