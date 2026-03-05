-- =====================================================
-- WEATHER FORECAST CACHE
-- Stores 48 hours of NWS forecast data for Hampton Roads
-- and adds weather_hold flag to drone_jobs
-- =====================================================

-- -----------------------------------------------
-- 1. Forecast cache table
-- -----------------------------------------------
CREATE TABLE public.weather_forecast_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  forecast_hour TIMESTAMPTZ NOT NULL,
  wind_speed_ms NUMERIC(5,2),
  wind_gust_ms NUMERIC(5,2),
  visibility_sm NUMERIC(6,3),
  cloud_ceiling_ft INTEGER,
  precipitation_probability INTEGER,
  temperature_c NUMERIC(5,1),
  sky_cover_pct INTEGER,
  determination public.weather_determination NOT NULL,
  determination_reasons TEXT[],
  CONSTRAINT uq_weather_forecast_cache_hour UNIQUE (forecast_hour)
);

COMMENT ON TABLE public.weather_forecast_cache IS 'Cached NWS forecast data evaluated against weather thresholds, refreshed daily at 06:00 UTC';
COMMENT ON COLUMN public.weather_forecast_cache.forecast_hour IS 'UTC hour this forecast row represents';
COMMENT ON COLUMN public.weather_forecast_cache.determination IS 'GO, CAUTION, or NO_GO based on evaluateWeather logic';

-- -----------------------------------------------
-- 2. Index for range queries on forecast_hour
-- -----------------------------------------------
CREATE INDEX idx_weather_forecast_cache_hour ON public.weather_forecast_cache(forecast_hour);

-- -----------------------------------------------
-- 3. RLS policies
-- -----------------------------------------------
ALTER TABLE public.weather_forecast_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage weather forecast cache"
  ON public.weather_forecast_cache FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage weather forecast cache"
  ON public.weather_forecast_cache FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view forecast cache"
  ON public.weather_forecast_cache FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- -----------------------------------------------
-- 4. Add weather_hold columns to drone_jobs
-- -----------------------------------------------
ALTER TABLE public.drone_jobs ADD COLUMN weather_hold BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.drone_jobs ADD COLUMN weather_hold_reasons TEXT[];

COMMENT ON COLUMN public.drone_jobs.weather_hold IS 'Set by automated weather check when forecast conditions are CAUTION or NO_GO for the scheduled date';
COMMENT ON COLUMN public.drone_jobs.weather_hold_reasons IS 'Array of reasons from weather evaluation explaining the hold';
