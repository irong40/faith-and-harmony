-- Flight activity per aircraft (Adam decision 2026-11-22 #0, build part 2).
--
-- Kept SEPARATE from public.maintenance_log on purpose: a flight-hours total is
-- flight activity, never evidence that maintenance was done. Each row is one
-- dated reading of an aircraft's total flight hours, stamped with its source,
-- who entered it and when. The existing aircraft.total_flight_hours column is
-- not touched and is not treated as verified.
--
-- Sources:
--   manual            typed in by a person (e.g. from DJI Pilot 2 or AirData UI)
--   export_import     summed from an exported flight-log file (source_detail = file name)
--   airdata_verified  a total read through existing AirData access, as of a date
--
-- Add-only. Undo while no row exists:
--   DROP TABLE IF EXISTS public.aircraft_flight_hours;

CREATE TABLE IF NOT EXISTS public.aircraft_flight_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id uuid NOT NULL REFERENCES public.aircraft(id) ON DELETE RESTRICT,
  total_flight_hours numeric(8,2) NOT NULL CHECK (total_flight_hours >= 0),
  as_of_date date NOT NULL,
  source text NOT NULL CHECK (source IN ('manual', 'export_import', 'airdata_verified')),
  source_detail text,
  entered_by uuid REFERENCES public.profiles(id),
  entered_by_name text NOT NULL CHECK (length(btrim(entered_by_name)) > 0),
  entered_at timestamptz NOT NULL DEFAULT now(),
  is_test boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_aircraft_flight_hours_aircraft_asof
  ON public.aircraft_flight_hours (aircraft_id, as_of_date DESC, entered_at DESC);

ALTER TABLE public.aircraft_flight_hours ENABLE ROW LEVEL SECURITY;

-- Same access as public.maintenance_log (20260210120100_fleet_management.sql).
CREATE POLICY "Admins can manage aircraft flight hours"
  ON public.aircraft_flight_hours FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pilots can view aircraft flight hours"
  ON public.aircraft_flight_hours FOR SELECT
  USING (auth.uid() IS NOT NULL);
