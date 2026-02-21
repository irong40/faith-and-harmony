-- Add nearest_weather_station to drone_jobs for METAR auto-lookup
ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS nearest_weather_station TEXT;

COMMENT ON COLUMN public.drone_jobs.nearest_weather_station IS 'ICAO code of nearest METAR station for automated weather briefings';
