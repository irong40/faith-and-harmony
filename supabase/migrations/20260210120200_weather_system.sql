-- =====================================================
-- WEATHER SYSTEM MODULE
-- Operating thresholds and per-mission weather briefings
-- =====================================================

-- -----------------------------------------------
-- 1. Enum
-- -----------------------------------------------
CREATE TYPE public.weather_determination AS ENUM ('GO', 'CAUTION', 'NO_GO');

-- -----------------------------------------------
-- 2. Weather thresholds table
-- -----------------------------------------------
CREATE TABLE public.weather_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aircraft_model TEXT,
  package_type TEXT,
  label TEXT NOT NULL,
  max_wind_speed_ms NUMERIC(5,2),
  min_visibility_sm NUMERIC(5,2),
  min_cloud_ceiling_ft INTEGER,
  max_kp_index INTEGER,
  min_temp_c NUMERIC(5,1),
  max_temp_c NUMERIC(5,1),
  max_precip_probability INTEGER,
  is_part_107_minimum BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.weather_thresholds IS 'Operating weather limits by aircraft model and/or mission type';
COMMENT ON COLUMN public.weather_thresholds.max_wind_speed_ms IS 'Maximum sustained wind speed in meters/second';
COMMENT ON COLUMN public.weather_thresholds.min_visibility_sm IS 'Minimum visibility in statute miles';
COMMENT ON COLUMN public.weather_thresholds.min_cloud_ceiling_ft IS 'Minimum cloud ceiling in feet AGL';
COMMENT ON COLUMN public.weather_thresholds.max_kp_index IS 'Maximum Kp geomagnetic index (GPS interference)';
COMMENT ON COLUMN public.weather_thresholds.is_part_107_minimum IS 'True if this row represents FAA Part 107 regulatory minimums';

-- -----------------------------------------------
-- 3. Mission weather logs
-- -----------------------------------------------
CREATE TABLE public.mission_weather_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.drone_jobs(id) ON DELETE CASCADE,
  metar_station TEXT,
  metar_raw TEXT,
  wind_speed_ms NUMERIC(5,2),
  wind_gust_ms NUMERIC(5,2),
  wind_direction_deg INTEGER,
  visibility_sm NUMERIC(5,2),
  cloud_ceiling_ft INTEGER,
  temperature_c NUMERIC(5,1),
  dewpoint_c NUMERIC(5,1),
  altimeter_inhg NUMERIC(5,2),
  kp_index INTEGER,
  precipitation_probability INTEGER,
  determination public.weather_determination NOT NULL,
  determination_reasons TEXT[],
  pilot_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  override_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  briefing_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mission_weather_logs IS 'Weather briefing and GO/NO_GO determination per mission';
COMMENT ON COLUMN public.mission_weather_logs.determination IS 'Automated weather determination: GO, CAUTION, or NO_GO';
COMMENT ON COLUMN public.mission_weather_logs.pilot_override IS 'True if pilot overrode a CAUTION/NO_GO determination';

-- -----------------------------------------------
-- 4. Indexes
-- -----------------------------------------------
CREATE INDEX idx_weather_thresholds_aircraft ON public.weather_thresholds(aircraft_model);
CREATE INDEX idx_weather_thresholds_package ON public.weather_thresholds(package_type);
CREATE INDEX idx_mission_weather_logs_mission ON public.mission_weather_logs(mission_id);

-- -----------------------------------------------
-- 5. Updated-at trigger
-- -----------------------------------------------
CREATE TRIGGER update_weather_thresholds_updated_at
  BEFORE UPDATE ON public.weather_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------
-- 6. RLS
-- -----------------------------------------------
ALTER TABLE public.weather_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_weather_logs ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins can manage weather thresholds"
  ON public.weather_thresholds FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage mission weather logs"
  ON public.mission_weather_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pilots: read thresholds
CREATE POLICY "Pilots can view weather thresholds"
  ON public.weather_thresholds FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pilots: read and insert weather logs for their missions
CREATE POLICY "Pilots can view own mission weather logs"
  ON public.mission_weather_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drone_jobs
      WHERE drone_jobs.id = mission_weather_logs.mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );

CREATE POLICY "Pilots can insert own mission weather logs"
  ON public.mission_weather_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drone_jobs
      WHERE drone_jobs.id = mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- 7. Seed data: Part 107 regulatory minimums
-- -----------------------------------------------
INSERT INTO public.weather_thresholds
  (aircraft_model, package_type, label, min_visibility_sm, min_cloud_ceiling_ft, is_part_107_minimum, notes)
VALUES
  (NULL, NULL, 'FAA Part 107 Regulatory Minimums', 3.0, 500, true,
   '14 CFR 107.51: 3 SM visibility, 500 ft below clouds, 2000 ft horizontal from clouds');

-- Aircraft-specific limits
INSERT INTO public.weather_thresholds
  (aircraft_model, package_type, label, max_wind_speed_ms, min_temp_c, max_temp_c, max_kp_index, notes)
VALUES
  ('DJI Mini 4 Pro', NULL, 'DJI Mini 4 Pro Operating Limits', 10.7, 0, 40, 5,
   'Sub-250g — more susceptible to wind. Max wind per DJI specs: 10.7 m/s (24 mph)'),
  ('DJI Matrice 4E', NULL, 'DJI Matrice 4E Operating Limits', 12.0, -20, 50, 7,
   'Enterprise platform with wider temperature and wind tolerances'),
  ('DJI Mavic 3 Enterprise', NULL, 'DJI Mavic 3 Enterprise Operating Limits', 12.0, -10, 40, 6,
   'Mid-tier enterprise drone. Max wind per DJI specs: 12 m/s (27 mph)');

-- Mission-type modifiers (tighter limits for precision work)
INSERT INTO public.weather_thresholds
  (aircraft_model, package_type, label, max_wind_speed_ms, notes)
VALUES
  (NULL, 'PROGRESS_800', 'Photogrammetry Wind Limit', 8.0,
   'Mapping/photogrammetry requires calmer conditions for consistent overlap'),
  (NULL, 'PREMIUM_1250', 'Premium Package Wind Limit', 6.0,
   'Premium video requires smooth footage — lower wind tolerance');
