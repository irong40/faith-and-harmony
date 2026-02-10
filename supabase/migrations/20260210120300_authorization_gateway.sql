-- =====================================================
-- AUTHORIZATION GATEWAY MODULE
-- Airspace data, TFR cache, LAANC/waiver tracking,
-- and per-mission authorization summaries
-- =====================================================

-- -----------------------------------------------
-- 1. Enums
-- -----------------------------------------------
CREATE TYPE public.tfr_status AS ENUM ('active', 'scheduled', 'expired', 'cancelled');

CREATE TYPE public.authorization_type AS ENUM ('laanc', 'caps', 'coa', 'waiver', 'none_required');

CREATE TYPE public.authorization_status AS ENUM (
  'not_started', 'pending', 'auto_approved', 'manual_review',
  'approved', 'denied', 'expired', 'cancelled'
);

-- -----------------------------------------------
-- 2. Airspace grids (FAA UAS Facility Map cache)
-- -----------------------------------------------
CREATE TABLE public.airspace_grids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grid_id TEXT NOT NULL UNIQUE,
  facility_id TEXT,
  facility_name TEXT,
  airspace_class TEXT NOT NULL CHECK (airspace_class IN ('B', 'C', 'D', 'E', 'G')),
  ceiling_ft INTEGER NOT NULL DEFAULT 0,
  laanc_eligible BOOLEAN NOT NULL DEFAULT false,
  zero_grid BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  effective_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.airspace_grids IS 'Cached FAA UAS Facility Map grid data for airspace lookups';
COMMENT ON COLUMN public.airspace_grids.grid_id IS 'FAA UAS Facility Map grid identifier (unique)';
COMMENT ON COLUMN public.airspace_grids.zero_grid IS 'True if LAANC ceiling is 0 ft (no auto-approval possible)';
COMMENT ON COLUMN public.airspace_grids.ceiling_ft IS 'Maximum auto-approved altitude in feet AGL';

-- -----------------------------------------------
-- 3. TFR cache
-- -----------------------------------------------
CREATE TABLE public.tfr_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notam_number TEXT NOT NULL UNIQUE,
  tfr_type TEXT,
  description TEXT,
  effective_start TIMESTAMPTZ,
  effective_end TIMESTAMPTZ,
  center_latitude NUMERIC(10,7),
  center_longitude NUMERIC(10,7),
  radius_nm NUMERIC(6,2),
  floor_ft INTEGER DEFAULT 0,
  ceiling_ft INTEGER,
  status public.tfr_status NOT NULL DEFAULT 'active',
  raw_data JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tfr_cache IS 'Cached Temporary Flight Restrictions from FAA NOTAM system';
COMMENT ON COLUMN public.tfr_cache.notam_number IS 'FAA NOTAM identifier (unique)';

-- -----------------------------------------------
-- 4. Authorization requests
-- -----------------------------------------------
CREATE TABLE public.authorization_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.drone_jobs(id) ON DELETE CASCADE,
  authorization_type public.authorization_type NOT NULL,
  status public.authorization_status NOT NULL DEFAULT 'not_started',
  requested_altitude_ft INTEGER,
  approved_altitude_ft INTEGER,
  submitted_via TEXT,
  reference_number TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  denial_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.authorization_requests IS 'LAANC, CAPS, COA, and waiver request tracking per mission';
COMMENT ON COLUMN public.authorization_requests.submitted_via IS 'Tool used: DroneZone, Aloft, AirHub, manual, etc.';

-- -----------------------------------------------
-- 5. Mission authorizations (per-mission summary)
-- -----------------------------------------------
CREATE TABLE public.mission_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.drone_jobs(id) ON DELETE CASCADE UNIQUE,
  airspace_class TEXT,
  requires_laanc BOOLEAN NOT NULL DEFAULT false,
  is_zero_grid BOOLEAN NOT NULL DEFAULT false,
  max_approved_altitude_ft INTEGER,
  active_tfrs JSONB DEFAULT '[]',
  requirements_checklist JSONB DEFAULT '{}',
  determination_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mission_authorizations IS 'Aggregated authorization summary per mission';
COMMENT ON COLUMN public.mission_authorizations.active_tfrs IS 'JSONB array of active TFR notam_numbers affecting this mission';
COMMENT ON COLUMN public.mission_authorizations.requirements_checklist IS 'JSONB checklist of authorization requirements and their status';

-- -----------------------------------------------
-- 6. Indexes
-- -----------------------------------------------
CREATE INDEX idx_airspace_grids_facility ON public.airspace_grids(facility_id);
CREATE INDEX idx_airspace_grids_location ON public.airspace_grids(latitude, longitude);
CREATE INDEX idx_tfr_cache_status ON public.tfr_cache(status);
CREATE INDEX idx_tfr_cache_effective ON public.tfr_cache(effective_start, effective_end);
CREATE INDEX idx_tfr_cache_location ON public.tfr_cache(center_latitude, center_longitude);
CREATE INDEX idx_authorization_requests_mission ON public.authorization_requests(mission_id);
CREATE INDEX idx_authorization_requests_status ON public.authorization_requests(status);
CREATE INDEX idx_mission_authorizations_mission ON public.mission_authorizations(mission_id);

-- -----------------------------------------------
-- 7. Updated-at triggers
-- -----------------------------------------------
CREATE TRIGGER update_airspace_grids_updated_at
  BEFORE UPDATE ON public.airspace_grids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tfr_cache_updated_at
  BEFORE UPDATE ON public.tfr_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_authorization_requests_updated_at
  BEFORE UPDATE ON public.authorization_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mission_authorizations_updated_at
  BEFORE UPDATE ON public.mission_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------
-- 8. RLS
-- -----------------------------------------------
ALTER TABLE public.airspace_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tfr_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_authorizations ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins can manage airspace grids"
  ON public.airspace_grids FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage TFR cache"
  ON public.tfr_cache FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage authorization requests"
  ON public.authorization_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage mission authorizations"
  ON public.mission_authorizations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pilots: read airspace + TFR data
CREATE POLICY "Pilots can view airspace grids"
  ON public.airspace_grids FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Pilots can view TFR cache"
  ON public.tfr_cache FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pilots: read their own mission authorizations
CREATE POLICY "Pilots can view own authorization requests"
  ON public.authorization_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drone_jobs
      WHERE drone_jobs.id = authorization_requests.mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );

CREATE POLICY "Pilots can view own mission authorizations"
  ON public.mission_authorizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drone_jobs
      WHERE drone_jobs.id = mission_authorizations.mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- 9. Hampton Roads seed data
-- -----------------------------------------------
INSERT INTO public.airspace_grids
  (grid_id, facility_id, facility_name, airspace_class, ceiling_ft, laanc_eligible, zero_grid, latitude, longitude, notes)
VALUES
  ('KORF-001', 'KORF', 'Norfolk International Airport', 'C', 200, true, false,
   36.8946, -76.2012, 'Norfolk Class C surface area — LAANC available up to 200 ft'),
  ('KNTU-001', 'KNTU', 'NAS Oceana', 'D', 0, false, true,
   36.8207, -76.0336, 'Navy facility — zero grid, no LAANC. Requires COA/waiver.'),
  ('KLFI-001', 'KLFI', 'Langley Air Force Base', 'D', 0, false, true,
   37.0829, -76.3605, 'Air Force facility — zero grid, no LAANC. Requires COA/waiver.'),
  ('KPHF-001', 'KPHF', 'Newport News/Williamsburg International', 'D', 400, true, false,
   37.1319, -76.4930, 'Class D — LAANC available up to 400 ft'),
  ('KPVG-001', 'KPVG', 'Hampton Roads Executive Airport', 'D', 400, true, false,
   36.7801, -76.4488, 'Class D — LAANC available up to 400 ft');
