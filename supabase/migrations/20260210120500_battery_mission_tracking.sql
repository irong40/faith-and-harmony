-- Trestle Fleet Management Schema
-- Migration: 002_battery_mission_tracking
-- Created: February 2026
-- Purpose: Add battery to mission junction table for bidirectional query support.
--          Enables "show all missions for battery X" without array scanning.

-- ============================================================================
-- BATTERY MISSION ASSIGNMENTS (junction table)
-- ============================================================================
-- The existing mission_equipment.battery_ids UUID[] column stores which
-- batteries were assigned to a mission. That works for forward lookups
-- (mission -> batteries). This junction table enables reverse lookups
-- (battery -> missions) with proper indexing and per battery metadata
-- like which slot it occupied during the flight.

CREATE TABLE IF NOT EXISTS battery_mission_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  battery_id UUID NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL,  -- References missions table (same pattern as mission_equipment)
  mission_equipment_id UUID REFERENCES mission_equipment(id) ON DELETE CASCADE,

  -- Flight context
  slot_position INTEGER DEFAULT 1,  -- Which bay the battery occupied (1 or 2 for dual battery aircraft like M4E)
  aircraft_id UUID REFERENCES aircraft(id),

  -- Cycle tracking
  cycle_before INTEGER NOT NULL DEFAULT 0,  -- Cycle count when mission started
  cycle_after INTEGER NOT NULL DEFAULT 0,   -- Cycle count after mission (normally cycle_before + 1)

  -- Timestamp
  flight_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Primary query patterns
CREATE INDEX idx_bml_battery ON battery_mission_log(battery_id, flight_date DESC);
CREATE INDEX idx_bml_mission ON battery_mission_log(mission_id);
CREATE INDEX idx_bml_aircraft ON battery_mission_log(aircraft_id);
CREATE INDEX idx_bml_date ON battery_mission_log(flight_date DESC);

-- Prevent duplicate battery assignments to the same mission
CREATE UNIQUE INDEX idx_bml_unique_assignment
  ON battery_mission_log(battery_id, mission_id);

-- ============================================================================
-- UPDATED log_flight FUNCTION
-- ============================================================================
-- Extends the existing log_flight() to also insert rows into
-- battery_mission_log when batteries are used on a mission.
-- The original function only incremented cycle_count on the batteries table.

CREATE OR REPLACE FUNCTION log_flight(
  p_aircraft_id UUID,
  p_battery_ids UUID[],
  p_duration_minutes INTEGER,
  p_flight_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_mission_id UUID DEFAULT NULL,
  p_mission_equipment_id UUID DEFAULT NULL
)
RETURNS VOID AS $
DECLARE
  v_battery_id UUID;
  v_cycle_before INTEGER;
  v_slot INTEGER := 0;
BEGIN
  -- Update aircraft stats
  UPDATE aircraft
  SET
    total_flight_hours = total_flight_hours + (p_duration_minutes / 60.0),
    total_flights = total_flights + 1,
    last_flight_date = p_flight_date,
    updated_at = NOW()
  WHERE id = p_aircraft_id;

  -- Update each battery and log the assignment
  FOREACH v_battery_id IN ARRAY p_battery_ids
  LOOP
    v_slot := v_slot + 1;

    -- Capture current cycle count before incrementing
    SELECT cycle_count INTO v_cycle_before
    FROM batteries
    WHERE id = v_battery_id;

    -- Increment cycle count (triggers battery_status_check for auto degradation)
    UPDATE batteries
    SET
      cycle_count = cycle_count + 1,
      last_used_date = p_flight_date::DATE,
      updated_at = NOW()
    WHERE id = v_battery_id;

    -- Log the battery to mission assignment if mission context provided
    IF p_mission_id IS NOT NULL THEN
      INSERT INTO battery_mission_log (
        battery_id,
        mission_id,
        mission_equipment_id,
        slot_position,
        aircraft_id,
        cycle_before,
        cycle_after,
        flight_date
      ) VALUES (
        v_battery_id,
        p_mission_id,
        p_mission_equipment_id,
        v_slot,
        p_aircraft_id,
        COALESCE(v_cycle_before, 0),
        COALESCE(v_cycle_before, 0) + 1,
        p_flight_date
      )
      ON CONFLICT (battery_id, mission_id) DO UPDATE SET
        cycle_after = COALESCE(v_cycle_before, 0) + 1,
        flight_date = p_flight_date;
    END IF;
  END LOOP;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATED flight_log_fleet_sync TRIGGER
-- ============================================================================
-- The existing trigger calls log_flight() when a row inserts into flight_logs.
-- This updated version passes mission_id so battery_mission_log gets populated.

CREATE OR REPLACE FUNCTION sync_flight_log_to_fleet()
RETURNS TRIGGER AS $
DECLARE
  v_aircraft_id UUID;
  v_battery_ids UUID[];
  v_me_id UUID;
BEGIN
  -- Pull equipment assignments for this mission
  SELECT
    me.aircraft_id,
    me.battery_ids,
    me.id
  INTO v_aircraft_id, v_battery_ids, v_me_id
  FROM mission_equipment me
  WHERE me.mission_id = NEW.mission_id
  LIMIT 1;

  -- Only proceed if equipment was assigned
  IF v_aircraft_id IS NOT NULL AND v_battery_ids IS NOT NULL THEN
    PERFORM log_flight(
      v_aircraft_id,
      v_battery_ids,
      NEW.duration_minutes,
      COALESCE(NEW.logged_at, NOW()),
      NEW.mission_id,
      v_me_id
    );
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Recreate the trigger (DROP first to avoid duplicate)
DROP TRIGGER IF EXISTS flight_log_fleet_sync ON flight_logs;

CREATE TRIGGER flight_log_fleet_sync
  AFTER INSERT ON flight_logs
  FOR EACH ROW EXECUTE FUNCTION sync_flight_log_to_fleet();

-- ============================================================================
-- BATTERY HISTORY VIEW
-- ============================================================================
-- Query: "Show me every flight this battery has been on"

CREATE OR REPLACE VIEW battery_flight_history AS
SELECT
  b.id AS battery_id,
  b.battery_id AS battery_label,
  b.compatible_aircraft_models,
  b.status AS battery_status,
  b.cycle_count AS current_cycles,
  b.max_rated_cycles,
  b.health_percent,
  bml.mission_id,
  bml.flight_date,
  bml.slot_position,
  bml.cycle_before,
  bml.cycle_after,
  a.nickname AS aircraft_nickname,
  a.model AS aircraft_model,
  bml.notes AS flight_notes
FROM batteries b
LEFT JOIN battery_mission_log bml ON bml.battery_id = b.id
LEFT JOIN aircraft a ON a.id = bml.aircraft_id
ORDER BY b.battery_id, bml.flight_date DESC;

-- ============================================================================
-- BATTERY UTILIZATION SUMMARY VIEW
-- ============================================================================
-- Query: "Which batteries are getting used the most/least?"

CREATE OR REPLACE VIEW battery_utilization AS
SELECT
  b.id,
  b.battery_id AS battery_label,
  b.status,
  b.cycle_count,
  b.max_rated_cycles,
  b.health_percent,
  ROUND((b.cycle_count::DECIMAL / NULLIF(b.max_rated_cycles, 0)) * 100, 1) AS cycle_percent_used,
  COUNT(bml.id) AS logged_missions,
  MIN(bml.flight_date) AS first_flight,
  MAX(bml.flight_date) AS last_flight,
  -- Average days between flights (usage frequency)
  CASE
    WHEN COUNT(bml.id) > 1
    THEN ROUND(
      EXTRACT(EPOCH FROM (MAX(bml.flight_date) - MIN(bml.flight_date))) /
      (86400.0 * GREATEST(COUNT(bml.id) - 1, 1)),
      1
    )
    ELSE NULL
  END AS avg_days_between_flights,
  -- Estimated remaining life in missions
  GREATEST(b.max_rated_cycles - b.cycle_count, 0) AS remaining_cycles
FROM batteries b
LEFT JOIN battery_mission_log bml ON bml.battery_id = b.id
GROUP BY b.id, b.battery_id, b.status, b.cycle_count, b.max_rated_cycles, b.health_percent;

-- ============================================================================
-- HELPER FUNCTION: Get battery history for a specific battery
-- ============================================================================

CREATE OR REPLACE FUNCTION get_battery_history(p_battery_id UUID)
RETURNS TABLE (
  mission_id UUID,
  flight_date TIMESTAMP WITH TIME ZONE,
  aircraft_name TEXT,
  slot_position INTEGER,
  cycle_at_flight INTEGER,
  notes TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT
    bml.mission_id,
    bml.flight_date,
    COALESCE(a.nickname, a.model) AS aircraft_name,
    bml.slot_position,
    bml.cycle_after,
    bml.notes
  FROM battery_mission_log bml
  LEFT JOIN aircraft a ON a.id = bml.aircraft_id
  WHERE bml.battery_id = p_battery_id
  ORDER BY bml.flight_date DESC;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get all batteries used on a specific mission
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mission_batteries(p_mission_id UUID)
RETURNS TABLE (
  battery_label TEXT,
  battery_status TEXT,
  slot_position INTEGER,
  cycle_before INTEGER,
  cycle_after INTEGER,
  current_cycles INTEGER,
  health_percent INTEGER
) AS $
BEGIN
  RETURN QUERY
  SELECT
    b.battery_id AS battery_label,
    b.status::TEXT AS battery_status,
    bml.slot_position,
    bml.cycle_before,
    bml.cycle_after,
    b.cycle_count AS current_cycles,
    b.health_percent
  FROM battery_mission_log bml
  JOIN batteries b ON b.id = bml.battery_id
  WHERE bml.mission_id = p_mission_id
  ORDER BY bml.slot_position;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE battery_mission_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view battery logs" ON battery_mission_log
  FOR SELECT USING (true);

CREATE POLICY "System can insert battery logs" ON battery_mission_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can manage battery logs" ON battery_mission_log
  FOR ALL USING (true);
