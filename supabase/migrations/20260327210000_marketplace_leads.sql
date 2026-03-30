-- ============================================
-- Marketplace Leads Schema
-- Faith & Harmony LLC / Sentinel Aerial
-- Purpose: Track drone job opportunities scraped from marketplace platforms
-- (droners.io, Zeitview, etc.) and manage the bid-to-mission pipeline
-- ============================================

-- ============================================
-- Table: marketplace_lead_sources
-- Purpose: Configure marketplace platforms
-- ============================================
CREATE TABLE IF NOT EXISTS public.marketplace_lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  platform_url TEXT NOT NULL,
  platform_type TEXT NOT NULL CHECK (platform_type IN ('bid', 'claim', 'hybrid')),
  commission_rate DECIMAL(5, 4) DEFAULT 0.10,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: marketplace_leads
-- Purpose: Scraped job opportunities from drone marketplaces
-- ============================================
CREATE TABLE IF NOT EXISTS public.marketplace_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source & Identity
  source_id UUID REFERENCES public.marketplace_lead_sources(id),
  source_slug TEXT NOT NULL,
  external_job_id TEXT NOT NULL,
  dedup_key TEXT UNIQUE NOT NULL GENERATED ALWAYS AS (source_slug || ':' || external_job_id) STORED,
  title TEXT NOT NULL,
  url TEXT,

  -- Location
  location_text TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  distance_miles DECIMAL(8, 1),

  -- Job Details
  job_type TEXT,
  category_raw TEXT,
  budget DECIMAL(10, 2),
  description TEXT,
  client_name TEXT,
  expiry TEXT,
  job_date TEXT,

  -- Evaluation (from DroneSniper)
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low', 'skip')),
  suggested_bid DECIMAL(10, 2),
  evaluation_breakdown JSONB DEFAULT '{}',

  -- Competitor Intelligence
  competitor_bids JSONB DEFAULT '[]',
  competitor_count INTEGER DEFAULT 0,
  competitor_median DECIMAL(10, 2),

  -- Profitability Analysis
  independent_rate DECIMAL(10, 2),
  platform_net DECIMAL(10, 2),
  commission_paid DECIMAL(10, 2),
  delta DECIMAL(10, 2),
  delta_percent DECIMAL(5, 1),
  effective_hourly DECIMAL(10, 2),
  typical_hours DECIMAL(4, 1),

  -- Bid Pipeline
  bid_status TEXT DEFAULT 'new' CHECK (bid_status IN (
    'new',           -- just scraped
    'approved',      -- user approved, ready to bid
    'declined',      -- user declined, don't bid
    'auto_declined', -- agent declined (out of range, excluded type)
    'bid_placed',    -- bid submitted on platform
    'bid_failed',    -- bid attempt failed
    'won',           -- bid accepted by client
    'lost',          -- another pilot won
    'expired',       -- job expired before action
    'mission_created' -- converted to drone_job in CRM
  )),
  bid_amount DECIMAL(10, 2),
  bid_message TEXT,
  bid_placed_at TIMESTAMPTZ,
  bid_result_checked_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,

  -- Scheduling (post-win)
  customer_deadline DATE,
  proposed_date_primary TIMESTAMPTZ,
  proposed_date_backup TIMESTAMPTZ,
  confirmed_date TIMESTAMPTZ,
  schedule_notes TEXT,

  -- Equipment & Weather
  equipment_needed TEXT[],
  weather_checked BOOLEAN DEFAULT false,
  weather_go_nogo TEXT CHECK (weather_go_nogo IN ('go', 'no_go', 'marginal', NULL)),

  -- CRM Link (after mission creation)
  drone_job_id UUID REFERENCES public.drone_jobs(id),
  quote_request_id UUID,

  -- Agent Metadata
  agent_action TEXT,
  scan_cycle_id TEXT,
  raw_data JSONB DEFAULT '{}',

  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_marketplace_leads_dedup ON public.marketplace_leads(dedup_key);
CREATE INDEX idx_marketplace_leads_source ON public.marketplace_leads(source_slug);
CREATE INDEX idx_marketplace_leads_status ON public.marketplace_leads(bid_status);
CREATE INDEX idx_marketplace_leads_score ON public.marketplace_leads(score DESC);
CREATE INDEX idx_marketplace_leads_distance ON public.marketplace_leads(distance_miles ASC);
CREATE INDEX idx_marketplace_leads_type ON public.marketplace_leads(job_type);
CREATE INDEX idx_marketplace_leads_created ON public.marketplace_leads(created_at DESC);
CREATE INDEX idx_marketplace_leads_confidence ON public.marketplace_leads(confidence);
CREATE INDEX idx_marketplace_leads_drone_job ON public.marketplace_leads(drone_job_id);

-- ============================================
-- Table: marketplace_scan_runs
-- Purpose: Track agent scan cycles
-- ============================================
CREATE TABLE IF NOT EXISTS public.marketplace_scan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug TEXT NOT NULL,
  scan_type TEXT DEFAULT 'scheduled' CHECK (scan_type IN ('manual', 'scheduled', 'test')),

  -- Execution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
  ) STORED,

  -- Results
  jobs_scraped INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  updated_leads INTEGER DEFAULT 0,
  auto_declined INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  auto_bids_placed INTEGER DEFAULT 0,

  -- Errors
  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketplace_scan_runs_status ON public.marketplace_scan_runs(status);
CREATE INDEX idx_marketplace_scan_runs_created ON public.marketplace_scan_runs(created_at DESC);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.marketplace_lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_scan_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketplace_lead_sources"
  ON public.marketplace_lead_sources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage marketplace_leads"
  ON public.marketplace_leads FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage marketplace_scan_runs"
  ON public.marketplace_scan_runs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- ============================================
-- Grants (service_role for agent access)
-- ============================================
GRANT ALL ON public.marketplace_lead_sources TO service_role;
GRANT ALL ON public.marketplace_leads TO service_role;
GRANT ALL ON public.marketplace_scan_runs TO service_role;

-- ============================================
-- Trigger: auto-update updated_at
-- ============================================
CREATE TRIGGER update_marketplace_leads_updated_at
  BEFORE UPDATE ON public.marketplace_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- View: Active marketplace opportunities
-- ============================================
CREATE OR REPLACE VIEW public.marketplace_lead_opportunities AS
SELECT
  ml.id,
  ml.source_slug,
  ml.external_job_id,
  ml.title,
  ml.url,
  ml.location_text,
  ml.distance_miles,
  ml.job_type,
  ml.budget,
  ml.score,
  ml.confidence,
  ml.suggested_bid,
  ml.bid_status,
  ml.bid_amount,
  ml.competitor_count,
  ml.competitor_median,
  ml.independent_rate,
  ml.platform_net,
  ml.delta,
  ml.delta_percent,
  ml.effective_hourly,
  ml.customer_deadline,
  ml.drone_job_id,
  ml.first_seen_at,
  ml.created_at,
  mls.name as source_name,
  mls.platform_type
FROM public.marketplace_leads ml
LEFT JOIN public.marketplace_lead_sources mls ON ml.source_slug = mls.slug
WHERE ml.bid_status NOT IN ('expired', 'lost', 'auto_declined')
ORDER BY ml.score DESC, ml.created_at DESC;

-- ============================================
-- View: Marketplace P&L summary
-- ============================================
CREATE OR REPLACE VIEW public.marketplace_pl_summary AS
SELECT
  ml.source_slug,
  ml.job_type,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE ml.bid_status = 'won') as won_count,
  COUNT(*) FILTER (WHERE ml.bid_status = 'bid_placed') as pending_bids,
  COUNT(*) FILTER (WHERE ml.bid_status = 'lost') as lost_count,
  ROUND(AVG(ml.score), 0) as avg_score,
  ROUND(AVG(ml.distance_miles), 1) as avg_distance,
  SUM(ml.bid_amount) FILTER (WHERE ml.bid_status IN ('won', 'bid_placed')) as total_bid_value,
  SUM(ml.platform_net) FILTER (WHERE ml.bid_status = 'won') as total_platform_revenue,
  SUM(ml.independent_rate) FILTER (WHERE ml.bid_status = 'won') as total_independent_value,
  SUM(ml.delta) FILTER (WHERE ml.bid_status = 'won') as total_delta,
  ROUND(AVG(ml.delta_percent) FILTER (WHERE ml.bid_status = 'won'), 1) as avg_delta_percent
FROM public.marketplace_leads ml
GROUP BY ml.source_slug, ml.job_type
ORDER BY total_leads DESC;

-- ============================================
-- Seed: Platform sources
-- ============================================
INSERT INTO public.marketplace_lead_sources (name, slug, platform_url, platform_type, commission_rate, config) VALUES
  ('Droners.io', 'droners', 'https://droners.io', 'bid', 0.10, '{"poll_interval_minutes": 15, "max_distance_miles": 150}'),
  ('Zeitview', 'zeitview', 'https://pilots.zeitview.com', 'claim', NULL, '{"note": "Fixed-price accept/decline model. Commission unknown."}')
ON CONFLICT (slug) DO NOTHING;

GRANT SELECT ON public.marketplace_lead_opportunities TO authenticated, service_role;
GRANT SELECT ON public.marketplace_pl_summary TO authenticated, service_role;
