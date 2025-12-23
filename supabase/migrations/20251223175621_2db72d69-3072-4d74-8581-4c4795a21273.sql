-- =====================================================
-- DRONE JOBS ADMIN MODULE - Complete Schema
-- =====================================================

-- 1. Create drone job status enum
CREATE TYPE public.drone_job_status AS ENUM (
  'intake',
  'scheduled', 
  'captured',
  'uploaded',
  'processing',
  'qa',
  'revision',
  'delivered',
  'cancelled'
);

-- 2. Create QA status enum
CREATE TYPE public.qa_status AS ENUM (
  'pending',
  'analyzing',
  'passed',
  'warning',
  'failed',
  'approved',
  'rejected'
);

-- 3. Create QA recommendation enum
CREATE TYPE public.qa_recommendation AS ENUM (
  'pass',
  'warning',
  'fail'
);

-- 4. Create batch recommendation enum
CREATE TYPE public.batch_recommendation AS ENUM (
  'deliver_as_planned',
  'extended_processing',
  'partial_reshoot',
  'full_reshoot',
  'incomplete_package'
);

-- 5. Create drone packages table
CREATE TABLE public.drone_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'real_estate' or 'construction'
  price NUMERIC NOT NULL,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  edit_budget_minutes INTEGER NOT NULL DEFAULT 60,
  reshoot_tolerance TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical_only'
  requirements JSONB DEFAULT '{}', -- Photo count, video specs, etc.
  processing_profile JSONB DEFAULT '{}', -- Color grading, exports, etc.
  shot_manifest JSONB DEFAULT '[]', -- Expected shot types for this package
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create drone jobs table
CREATE TABLE public.drone_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.drone_packages(id) ON DELETE SET NULL,
  status public.drone_job_status NOT NULL DEFAULT 'intake',
  
  -- Property info
  property_address TEXT NOT NULL,
  property_city TEXT,
  property_state TEXT DEFAULT 'VA',
  property_zip TEXT,
  property_type TEXT NOT NULL DEFAULT 'residential', -- 'residential', 'commercial', 'construction_site'
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time TEXT,
  pilot_notes TEXT,
  
  -- Upload token for client portal
  upload_token TEXT UNIQUE,
  upload_token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Construction-specific context
  construction_context JSONB, -- previous_shoot_date, reference_photos, compass_angles, etc.
  
  -- QA summary fields
  qa_score INTEGER, -- 0-100 overall batch score
  qa_summary JSONB, -- BatchAnalysisSummary from AI
  qa_batch_context JSONB, -- Running context during analysis
  
  -- Delivery
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_notes TEXT,
  
  -- Admin
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create drone assets table
CREATE TABLE public.drone_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.drone_jobs(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path
  file_size BIGINT,
  file_type TEXT, -- 'image' or 'video'
  mime_type TEXT,
  
  -- Image metadata from EXIF
  exif_data JSONB,
  capture_date TIMESTAMP WITH TIME ZONE,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  gps_altitude NUMERIC,
  camera_model TEXT,
  
  -- Processing status
  processing_status TEXT DEFAULT 'raw', -- 'raw', 'processing', 'edited', 'exported'
  processed_path TEXT, -- Path to edited version
  
  -- QA fields
  qa_status public.qa_status DEFAULT 'pending',
  qa_results JSONB, -- Full PhotoQualityAssessment from AI
  qa_score INTEGER, -- Individual asset score 0-100
  qa_override BOOLEAN DEFAULT false, -- Admin override
  qa_override_reason TEXT,
  qa_override_by TEXT, -- Admin who overrode
  qa_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Sort order
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create drone deliverables table
CREATE TABLE public.drone_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.drone_jobs(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL, -- e.g., "Web-Ready Photos", "Print-Resolution", "Video Package"
  description TEXT,
  
  -- Files included
  file_paths TEXT[] DEFAULT '{}',
  file_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  
  -- Download tracking
  download_url TEXT,
  download_expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Add QA tracking fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS qa_threshold_adjustment INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS historical_qa_overrides INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qa_specific_requirements TEXT[];

-- 10. Create job number generation function
CREATE OR REPLACE FUNCTION public.generate_drone_job_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  sequence_num INT;
  new_number TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(job_number FROM 'DJ-' || year_part || '-(\d+)') AS INT)
  ), 0) + 1
  INTO sequence_num
  FROM public.drone_jobs
  WHERE job_number LIKE 'DJ-' || year_part || '-%';
  
  new_number := 'DJ-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- 11. Create trigger to auto-generate job number
CREATE OR REPLACE FUNCTION public.set_drone_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := generate_drone_job_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_drone_job_number_trigger
BEFORE INSERT ON public.drone_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_drone_job_number();

-- 12. Create updated_at triggers
CREATE TRIGGER update_drone_packages_updated_at
BEFORE UPDATE ON public.drone_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drone_jobs_updated_at
BEFORE UPDATE ON public.drone_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drone_assets_updated_at
BEFORE UPDATE ON public.drone_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Enable RLS
ALTER TABLE public.drone_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_deliverables ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies for drone_packages
CREATE POLICY "Anyone can view active packages"
ON public.drone_packages FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage packages"
ON public.drone_packages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 15. Create RLS policies for drone_jobs
CREATE POLICY "Admins can manage drone jobs"
ON public.drone_jobs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public read access via upload token (for client upload portal)
CREATE POLICY "Token holders can view their job"
ON public.drone_jobs FOR SELECT
USING (upload_token IS NOT NULL AND upload_token_expires_at > now());

-- 16. Create RLS policies for drone_assets
CREATE POLICY "Admins can manage drone assets"
ON public.drone_assets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public insert for client uploads (validated via edge function)
CREATE POLICY "Anyone can insert drone assets"
ON public.drone_assets FOR INSERT
WITH CHECK (true);

-- 17. Create RLS policies for drone_deliverables
CREATE POLICY "Admins can manage deliverables"
ON public.drone_deliverables FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 18. Seed drone packages with specified pricing
INSERT INTO public.drone_packages (code, name, category, price, description, features, edit_budget_minutes, reshoot_tolerance, shot_manifest) VALUES
(
  'PHOTO_495',
  'Basic Residential',
  'real_estate',
  495,
  'Essential aerial photography package for residential properties',
  ARRAY['10-15 edited photos', 'Standard editing', 'Web-ready delivery', '24-48hr turnaround'],
  30,
  'low',
  '["front_hero_oblique", "front_left_corner", "front_right_corner", "rear_oblique", "top_down_property"]'::jsonb
),
(
  'PHOTO_VIDEO_795',
  'Standard Residential',
  'real_estate',
  795,
  'Comprehensive aerial photography and video for residential marketing',
  ARRAY['15-20 edited photos', '60-90 second video', 'Enhanced editing', 'Social media clips', '24-48hr turnaround'],
  60,
  'medium',
  '["front_hero_oblique", "front_left_corner", "front_right_corner", "rear_oblique", "side_elevation", "top_down_property", "neighborhood_context", "reveal_frame", "orbit_frame"]'::jsonb
),
(
  'PREMIUM_1250',
  'Premium Residential',
  'real_estate',
  1250,
  'Premium full-service aerial marketing package with twilight options',
  ARRAY['20-30 edited photos', '2-3 minute video', 'Premium color grading', 'Twilight shots available', 'Rush delivery available'],
  90,
  'high',
  '["front_hero_oblique", "front_left_corner", "front_right_corner", "rear_oblique", "side_elevation", "top_down_property", "top_down_roof", "neighborhood_context", "feature_detail", "approach_shot", "reveal_frame", "orbit_frame"]'::jsonb
),
(
  'PROGRESS_800',
  'Construction Progress',
  'construction',
  800,
  'Monthly construction progress documentation with consistent angles',
  ARRAY['8-12 documented angles', 'Compass-bearing shots', 'Progress comparison ready', 'Same-day delivery'],
  45,
  'critical_only',
  '["construction_corner_N", "construction_corner_E", "construction_corner_S", "construction_corner_W", "construction_perimeter", "construction_nadir", "construction_workface"]'::jsonb
);

-- 19. Create index for faster lookups
CREATE INDEX idx_drone_jobs_status ON public.drone_jobs(status);
CREATE INDEX idx_drone_jobs_customer ON public.drone_jobs(customer_id);
CREATE INDEX idx_drone_jobs_upload_token ON public.drone_jobs(upload_token) WHERE upload_token IS NOT NULL;
CREATE INDEX idx_drone_assets_job_id ON public.drone_assets(job_id);
CREATE INDEX idx_drone_assets_qa_status ON public.drone_assets(qa_status);