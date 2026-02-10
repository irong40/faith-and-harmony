-- =====================================================
-- FLEET MANAGEMENT MODULE
-- Aircraft, batteries, controllers, accessories,
-- maintenance tracking, and mission-equipment linkage
-- =====================================================

-- -----------------------------------------------
-- 1. Enums
-- -----------------------------------------------
CREATE TYPE public.accessory_type AS ENUM (
  'filter', 'lens', 'propeller', 'case', 'charger', 'antenna', 'mount', 'other'
);

CREATE TYPE public.equipment_type AS ENUM (
  'aircraft', 'battery', 'controller', 'accessory'
);

CREATE TYPE public.maintenance_type AS ENUM (
  'scheduled', 'unscheduled', 'repair', 'inspection', 'firmware_update', 'calibration'
);

-- -----------------------------------------------
-- 2. Aircraft table
-- -----------------------------------------------
CREATE TABLE public.aircraft (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  nickname TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grounded', 'maintenance', 'retired', 'planned')),
  faa_registration TEXT,
  total_flight_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_flights INTEGER NOT NULL DEFAULT 0,
  purchase_date DATE,
  insurance_expiry DATE,
  firmware_version TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.aircraft IS 'Drone fleet inventory with flight hour tracking';
COMMENT ON COLUMN public.aircraft.status IS 'Operational status: active, grounded, maintenance, retired, planned';
COMMENT ON COLUMN public.aircraft.total_flight_hours IS 'Cumulative flight hours, updated by log_flight()';

-- -----------------------------------------------
-- 3. Batteries table
-- -----------------------------------------------
CREATE TABLE public.batteries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  model TEXT,
  capacity_mah INTEGER NOT NULL,
  cycle_count INTEGER NOT NULL DEFAULT 0,
  health_percentage INTEGER NOT NULL DEFAULT 100 CHECK (health_percentage BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'retired', 'lost')),
  aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE SET NULL,
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.batteries IS 'Battery inventory with cycle count and health tracking';
COMMENT ON COLUMN public.batteries.cycle_count IS 'Total charge cycles, incremented by log_flight()';

-- -----------------------------------------------
-- 4. Controllers table
-- -----------------------------------------------
CREATE TABLE public.controllers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  paired_aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE SET NULL,
  firmware_version TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.controllers IS 'Remote controller inventory with aircraft pairing';

-- -----------------------------------------------
-- 5. Accessories table
-- -----------------------------------------------
CREATE TABLE public.accessories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.accessory_type NOT NULL DEFAULT 'other',
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired', 'lost')),
  compatible_aircraft TEXT[] DEFAULT '{}',
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.accessories IS 'Equipment and parts inventory (filters, props, mounts, etc.)';
COMMENT ON COLUMN public.accessories.compatible_aircraft IS 'Array of aircraft model names this accessory works with';

-- -----------------------------------------------
-- 6. Maintenance log
-- -----------------------------------------------
CREATE TABLE public.maintenance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_type public.equipment_type NOT NULL,
  equipment_id UUID NOT NULL,
  maintenance_type public.maintenance_type NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cost_cents INTEGER DEFAULT 0,
  parts_used TEXT[],
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.maintenance_log IS 'Service history for all fleet equipment';
COMMENT ON COLUMN public.maintenance_log.equipment_id IS 'UUID of the aircraft, battery, controller, or accessory';
COMMENT ON COLUMN public.maintenance_log.cost_cents IS 'Maintenance cost in cents to avoid floating-point issues';

-- -----------------------------------------------
-- 7. Mission equipment (mission-to-gear linkage)
-- -----------------------------------------------
CREATE TABLE public.mission_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.drone_jobs(id) ON DELETE CASCADE,
  aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE RESTRICT,
  battery_ids UUID[] DEFAULT '{}',
  controller_id UUID REFERENCES public.controllers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mission_equipment IS 'Links a drone mission to the specific gear used';
COMMENT ON COLUMN public.mission_equipment.battery_ids IS 'Array of battery UUIDs used during the mission';

-- -----------------------------------------------
-- 8. Aircraft capabilities (drone-to-package matrix)
-- -----------------------------------------------
CREATE TABLE public.aircraft_capabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.drone_packages(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aircraft_id, package_id)
);

COMMENT ON TABLE public.aircraft_capabilities IS 'Matrix of which aircraft can fulfill which drone packages';

-- -----------------------------------------------
-- 9. Indexes
-- -----------------------------------------------
CREATE INDEX idx_batteries_aircraft_id ON public.batteries(aircraft_id);
CREATE INDEX idx_controllers_paired_aircraft ON public.controllers(paired_aircraft_id);
CREATE INDEX idx_maintenance_log_equipment ON public.maintenance_log(equipment_type, equipment_id);
CREATE INDEX idx_maintenance_log_performed_by ON public.maintenance_log(performed_by);
CREATE INDEX idx_mission_equipment_mission ON public.mission_equipment(mission_id);
CREATE INDEX idx_mission_equipment_aircraft ON public.mission_equipment(aircraft_id);
CREATE INDEX idx_aircraft_capabilities_aircraft ON public.aircraft_capabilities(aircraft_id);
CREATE INDEX idx_aircraft_capabilities_package ON public.aircraft_capabilities(package_id);

-- -----------------------------------------------
-- 10. Updated-at triggers
-- -----------------------------------------------
CREATE TRIGGER update_aircraft_updated_at
  BEFORE UPDATE ON public.aircraft
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batteries_updated_at
  BEFORE UPDATE ON public.batteries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_controllers_updated_at
  BEFORE UPDATE ON public.controllers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accessories_updated_at
  BEFORE UPDATE ON public.accessories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------
-- 11. log_flight() function
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.log_flight(
  p_aircraft_id UUID,
  p_battery_ids UUID[],
  p_flight_hours NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment aircraft totals
  UPDATE aircraft
  SET total_flight_hours = total_flight_hours + p_flight_hours,
      total_flights = total_flights + 1,
      updated_at = now()
  WHERE id = p_aircraft_id;

  -- Increment battery cycle counts
  UPDATE batteries
  SET cycle_count = cycle_count + 1,
      updated_at = now()
  WHERE id = ANY(p_battery_ids);
END;
$$;

COMMENT ON FUNCTION public.log_flight IS 'Increments aircraft hours/flights and battery cycle_count after a flight';

-- -----------------------------------------------
-- 12. Trigger: auto-sync flight_logs to fleet
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_flight_to_fleet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipment RECORD;
  v_flight_hours NUMERIC;
BEGIN
  -- Look up the mission equipment for this flight's mission
  SELECT * INTO v_equipment
  FROM mission_equipment
  WHERE mission_id = NEW.mission_id
  LIMIT 1;

  -- Only sync if mission has linked equipment
  IF v_equipment IS NOT NULL THEN
    -- Default to 0.5 hours if checklist_data doesn't include flight_hours
    v_flight_hours := COALESCE(
      (NEW.checklist_data->>'flight_hours')::NUMERIC,
      0.5
    );

    PERFORM log_flight(
      v_equipment.aircraft_id,
      v_equipment.battery_ids,
      v_flight_hours
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_flight_to_fleet_trigger
  AFTER INSERT ON public.flight_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_flight_to_fleet();

-- -----------------------------------------------
-- 13. RLS Policies
-- -----------------------------------------------
ALTER TABLE public.aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controllers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircraft_capabilities ENABLE ROW LEVEL SECURITY;

-- Admin: full access to all fleet tables
CREATE POLICY "Admins can manage aircraft"
  ON public.aircraft FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage batteries"
  ON public.batteries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage controllers"
  ON public.controllers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage accessories"
  ON public.accessories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage maintenance log"
  ON public.maintenance_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage mission equipment"
  ON public.mission_equipment FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage aircraft capabilities"
  ON public.aircraft_capabilities FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pilots: read active equipment
CREATE POLICY "Pilots can view active aircraft"
  ON public.aircraft FOR SELECT
  USING (status = 'active');

CREATE POLICY "Pilots can view active batteries"
  ON public.batteries FOR SELECT
  USING (status = 'active');

CREATE POLICY "Pilots can view active controllers"
  ON public.controllers FOR SELECT
  USING (status = 'active');

CREATE POLICY "Pilots can view active accessories"
  ON public.accessories FOR SELECT
  USING (status = 'active');

CREATE POLICY "Pilots can view aircraft capabilities"
  ON public.aircraft_capabilities FOR SELECT
  USING (true);

-- Pilots: read/insert their own mission equipment
CREATE POLICY "Pilots can view own mission equipment"
  ON public.mission_equipment FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drone_jobs
      WHERE drone_jobs.id = mission_equipment.mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );

CREATE POLICY "Pilots can insert own mission equipment"
  ON public.mission_equipment FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drone_jobs
      WHERE drone_jobs.id = mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );

-- Pilots: read maintenance log (no insert — admin only)
CREATE POLICY "Pilots can view maintenance log"
  ON public.maintenance_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- -----------------------------------------------
-- 14. Seed data: initial aircraft fleet
-- -----------------------------------------------
INSERT INTO public.aircraft (model, serial_number, nickname, status, notes) VALUES
  ('DJI Mini 4 Pro', 'MINI4PRO-001', 'Scout', 'active', 'Primary real estate drone. Sub-250g, no remote ID required under certain conditions.'),
  ('DJI Matrice 4E', 'M4E-001', NULL, 'planned', 'Enterprise mapping platform. Planned acquisition for photogrammetry missions.'),
  ('DJI Mavic 3 Enterprise', 'M3E-001', NULL, 'planned', 'Enterprise inspection platform. Planned acquisition for construction/infrastructure.');

-- Seed: capability matrix (link aircraft to packages they can fulfill)
-- Mini 4 Pro can do all real estate packages
INSERT INTO public.aircraft_capabilities (aircraft_id, package_id)
SELECT a.id, p.id
FROM aircraft a, drone_packages p
WHERE a.serial_number = 'MINI4PRO-001'
  AND p.category = 'real_estate';

-- Matrice 4E can do construction + real estate
INSERT INTO public.aircraft_capabilities (aircraft_id, package_id)
SELECT a.id, p.id
FROM aircraft a, drone_packages p
WHERE a.serial_number = 'M4E-001';

-- Mavic 3 Enterprise can do all packages
INSERT INTO public.aircraft_capabilities (aircraft_id, package_id)
SELECT a.id, p.id
FROM aircraft a, drone_packages p
WHERE a.serial_number = 'M3E-001';
