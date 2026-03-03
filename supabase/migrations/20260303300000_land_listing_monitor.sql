-- ============================================
-- Land Listing Monitor Schema
-- Faith & Harmony LLC
-- Purpose: Monitor public land listings for drone mapping opportunities
-- ============================================

-- ============================================
-- Table: land_listing_sources
-- Purpose: Configure which data sources to monitor
-- ============================================
CREATE TABLE IF NOT EXISTS public.land_listing_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'api', 'scrape')),
  base_url TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  rate_limit_ms INTEGER DEFAULT 2000,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: land_monitor_regions
-- Purpose: Geographic regions to monitor
-- ============================================
CREATE TABLE IF NOT EXISTS public.land_monitor_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cities TEXT[] NOT NULL,
  states TEXT[] NOT NULL,
  zip_codes TEXT[],
  bounding_box JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: land_listings
-- Purpose: Store discovered land listings
-- ============================================
CREATE TABLE IF NOT EXISTS public.land_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Listing Identity
  external_id TEXT,
  source_id UUID REFERENCES public.land_listing_sources(id),
  source_url TEXT NOT NULL,
  dedup_key TEXT UNIQUE NOT NULL,

  -- Property Details
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  county TEXT,
  state TEXT DEFAULT 'VA',
  zip_code TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Land Specifics
  land_type TEXT CHECK (land_type IN (
    'vacant_lot', 'farm_agricultural', 'commercial', 'waterfront',
    'residential_lot', 'timber', 'recreational', 'mixed_use', 'other'
  )),
  acreage DECIMAL(10, 2),
  price DECIMAL(12, 2),
  price_per_acre DECIMAL(12, 2) GENERATED ALWAYS AS (
    CASE WHEN acreage > 0 THEN ROUND(price / acreage, 2) ELSE NULL END
  ) STORED,

  -- Photo Analysis
  photo_count INTEGER DEFAULT 0,
  has_aerial_photos BOOLEAN DEFAULT false,
  photo_quality_score INTEGER CHECK (photo_quality_score BETWEEN 0 AND 100),
  photo_urls TEXT[],

  -- Listing Agent/Owner
  listing_agent_name TEXT,
  listing_agent_phone TEXT,
  listing_agent_email TEXT,
  listing_agent_company TEXT,
  is_fsbo BOOLEAN DEFAULT false,

  -- Opportunity Scoring
  opportunity_score INTEGER DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  opportunity_flags TEXT[],

  -- Pipeline Status
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'reviewed', 'contacted', 'quoted', 'booked', 'completed', 'passed', 'expired'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,

  -- AI Generated Pitch
  ai_pitch_subject TEXT,
  ai_pitch_body TEXT,

  -- Tracking
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  listing_date DATE,
  expires_at DATE,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,

  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_land_listings_status ON public.land_listings(status);
CREATE INDEX idx_land_listings_city ON public.land_listings(city);
CREATE INDEX idx_land_listings_state ON public.land_listings(state);
CREATE INDEX idx_land_listings_land_type ON public.land_listings(land_type);
CREATE INDEX idx_land_listings_opportunity ON public.land_listings(opportunity_score DESC);
CREATE INDEX idx_land_listings_acreage ON public.land_listings(acreage DESC);
CREATE INDEX idx_land_listings_price ON public.land_listings(price);
CREATE INDEX idx_land_listings_photo_quality ON public.land_listings(photo_quality_score ASC);
CREATE INDEX idx_land_listings_created ON public.land_listings(created_at DESC);
CREATE INDEX idx_land_listings_dedup ON public.land_listings(dedup_key);
CREATE INDEX idx_land_listings_source ON public.land_listings(source_id);

-- ============================================
-- Table: land_monitor_jobs
-- Purpose: Track monitoring scan runs
-- ============================================
CREATE TABLE IF NOT EXISTS public.land_monitor_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT DEFAULT 'scheduled' CHECK (job_type IN ('manual', 'scheduled', 'test')),
  source_ids UUID[],
  region_ids UUID[],

  -- Execution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
  ) STORED,

  -- Results
  listings_scanned INTEGER DEFAULT 0,
  new_listings_found INTEGER DEFAULT 0,
  updated_listings INTEGER DEFAULT 0,
  high_opportunity_count INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,

  -- Costs
  api_cost DECIMAL(10, 4) DEFAULT 0,

  -- Errors
  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_land_monitor_jobs_status ON public.land_monitor_jobs(status);
CREATE INDEX idx_land_monitor_jobs_created ON public.land_monitor_jobs(created_at DESC);

-- ============================================
-- Table: land_listing_outreach
-- Purpose: Track outreach to listing agents/owners
-- ============================================
CREATE TABLE IF NOT EXISTS public.land_listing_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.land_listings(id) ON DELETE CASCADE,
  contact_date TIMESTAMPTZ DEFAULT NOW(),
  contact_method TEXT NOT NULL CHECK (contact_method IN ('email', 'call', 'text', 'in_person', 'other')),
  outcome TEXT CHECK (outcome IN (
    'no_answer', 'voicemail', 'conversation', 'email_sent', 'interested',
    'not_interested', 'quote_sent', 'booked', 'callback_requested', 'other'
  )),
  subject TEXT,
  message TEXT,
  response TEXT,
  quoted_price DECIMAL(10, 2),
  followup_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_land_outreach_listing ON public.land_listing_outreach(listing_id);
CREATE INDEX idx_land_outreach_date ON public.land_listing_outreach(contact_date DESC);

-- ============================================
-- RLS Policies (using user_roles pattern)
-- ============================================
ALTER TABLE public.land_listing_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_monitor_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_monitor_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_listing_outreach ENABLE ROW LEVEL SECURITY;

-- Admin policies via user_roles table
CREATE POLICY "Admins can manage land_listing_sources"
  ON public.land_listing_sources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage land_monitor_regions"
  ON public.land_monitor_regions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage land_listings"
  ON public.land_listings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage land_monitor_jobs"
  ON public.land_monitor_jobs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage land_listing_outreach"
  ON public.land_listing_outreach FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- ============================================
-- Triggers
-- ============================================
CREATE TRIGGER update_land_listings_updated_at
  BEFORE UPDATE ON public.land_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Views
-- ============================================

CREATE OR REPLACE VIEW public.land_listing_opportunities AS
SELECT
  ll.id,
  ll.title,
  ll.city,
  ll.state,
  ll.land_type,
  ll.acreage,
  ll.price,
  ll.price_per_acre,
  ll.photo_count,
  ll.has_aerial_photos,
  ll.photo_quality_score,
  ll.opportunity_score,
  ll.opportunity_flags,
  ll.listing_agent_name,
  ll.listing_agent_company,
  ll.status,
  ll.priority,
  ll.source_url,
  ll.ai_pitch_subject,
  ll.ai_pitch_body,
  ll.first_seen_at,
  ls.name as source_name,
  COUNT(lo.id) as outreach_count,
  MAX(lo.contact_date) as last_outreach_date
FROM public.land_listings ll
LEFT JOIN public.land_listing_sources ls ON ll.source_id = ls.id
LEFT JOIN public.land_listing_outreach lo ON ll.id = lo.listing_id
WHERE ll.status NOT IN ('passed', 'expired', 'completed')
GROUP BY ll.id, ls.name
ORDER BY ll.opportunity_score DESC, ll.created_at DESC;

CREATE OR REPLACE VIEW public.land_monitor_summary AS
SELECT
  DATE(created_at) as scan_date,
  COUNT(*) as total_scans,
  SUM(new_listings_found) as total_new_listings,
  SUM(high_opportunity_count) as total_high_opportunity,
  SUM(api_cost) as total_cost,
  AVG(duration_seconds) as avg_duration_seconds
FROM public.land_monitor_jobs
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY scan_date DESC;

-- ============================================
-- Seed Data: Sources & Regions
-- ============================================

INSERT INTO public.land_listing_sources (name, slug, source_type, base_url, config) VALUES
  ('LandWatch', 'landwatch', 'scrape', 'https://www.landwatch.com', '{"search_path": "/land/virginia"}'),
  ('Craigslist Norfolk', 'craigslist-norfolk', 'rss', 'https://norfolk.craigslist.org', '{"rss_path": "/search/lnd?format=rss"}'),
  ('Craigslist Richmond', 'craigslist-richmond', 'rss', 'https://richmond.craigslist.org', '{"rss_path": "/search/lnd?format=rss"}'),
  ('Realtor.com', 'realtor-com', 'api', 'https://www.realtor.com', '{"note": "Uses Realtor.com Rapid API endpoint"}'),
  ('County GIS - Chesapeake', 'gis-chesapeake', 'api', 'https://gis.cityofchesapeake.net', '{"note": "Public GIS portal"}'),
  ('County GIS - Norfolk', 'gis-norfolk', 'api', 'https://gis.norfolk.gov', '{"note": "Public GIS portal"}');

INSERT INTO public.land_monitor_regions (name, cities, states) VALUES
  ('Tidewater VA',
    ARRAY['Norfolk', 'Virginia Beach', 'Chesapeake', 'Suffolk', 'Portsmouth'],
    ARRAY['VA']),
  ('Hampton Roads',
    ARRAY['Hampton', 'Newport News', 'Williamsburg', 'Yorktown', 'Poquoson', 'Gloucester'],
    ARRAY['VA']),
  ('Northeast NC',
    ARRAY['Elizabeth City', 'Kitty Hawk', 'Kill Devil Hills', 'Nags Head', 'Manteo', 'Edenton', 'Currituck', 'Camden'],
    ARRAY['NC']);

-- ============================================
-- Grants
-- ============================================
GRANT ALL ON public.land_listing_sources TO service_role;
GRANT ALL ON public.land_monitor_regions TO service_role;
GRANT ALL ON public.land_listings TO service_role;
GRANT ALL ON public.land_monitor_jobs TO service_role;
GRANT ALL ON public.land_listing_outreach TO service_role;

GRANT SELECT ON public.land_listing_opportunities TO authenticated, service_role;
GRANT SELECT ON public.land_monitor_summary TO authenticated, service_role;
