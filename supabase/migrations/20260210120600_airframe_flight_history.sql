-- Trestle Fleet Management Schema
-- Migration: 002b_airframe_flight_history
-- Created: February 2026
-- Purpose: Add airframe flight history view for per flight duration tracking
--          and cumulative hour progression on each aircraft frame.

-- ============================================================================
-- AIRFRAME FLIGHT HISTORY VIEW
-- ============================================================================
-- Query: "Show me every flight on the M4E with individual durations"
-- Pulls from mission_equipment (duration, aircraft assignment) and
-- joins battery_mission_log for battery context per flight.

CREATE OR REPLACE VIEW airframe_flight_history AS
SELECT
  a.id AS aircraft_id,
  a.nickname AS aircraft_nickname,
  a.model AS aircraft_model,
  a.serial_number,
  a.total_flight_hours AS current_total_hours,
  a.total_flights AS current_total_flights,
  me.mission_id,
  me.flight_duration_minutes,
  ROUND(me.flight_duration_minutes / 60.0, 2) AS flight_duration_hours,
  me.preflight_check_completed,
  me.created_at AS flight_logged_at,
  -- Running cumulative hours per aircraft (ordered by flight date)
  SUM(COALESCE(me.flight_duration_minutes, 0)) OVER (
    PARTITION BY a.id
    ORDER BY me.created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) / 60.0 AS cumulative_hours_at_flight,
  -- Flight number for this airframe
  ROW_NUMBER() OVER (
    PARTITION BY a.id
    ORDER BY me.created_at
  ) AS flight_number,
  -- Batteries used on this flight
  me.battery_ids,
  me.notes
FROM aircraft a
JOIN mission_equipment me ON me.aircraft_id = a.id
WHERE me.flight_duration_minutes IS NOT NULL
ORDER BY a.id, me.created_at DESC;

-- ============================================================================
-- AIRFRAME UTILIZATION SUMMARY VIEW
-- ============================================================================
-- Query: "How hard am I running each airframe?"

CREATE OR REPLACE VIEW airframe_utilization AS
SELECT
  a.id,
  a.nickname,
  a.model,
  a.status,
  a.total_flight_hours,
  a.total_flights,
  a.acquired_date,
  -- Days since acquisition
  EXTRACT(DAY FROM NOW() - a.acquired_date::TIMESTAMP) AS days_owned,
  -- Average flight duration
  ROUND(AVG(me.flight_duration_minutes), 1) AS avg_flight_minutes,
  -- Average flights per week since acquisition
  CASE
    WHEN EXTRACT(DAY FROM NOW() - a.acquired_date::TIMESTAMP) > 0
    THEN ROUND(
      a.total_flights::DECIMAL / (EXTRACT(DAY FROM NOW() - a.acquired_date::TIMESTAMP) / 7.0),
      1
    )
    ELSE 0
  END AS avg_flights_per_week,
  -- Hours per week
  CASE
    WHEN EXTRACT(DAY FROM NOW() - a.acquired_date::TIMESTAMP) > 0
    THEN ROUND(
      a.total_flight_hours / (EXTRACT(DAY FROM NOW() - a.acquired_date::TIMESTAMP) / 7.0),
      2
    )
    ELSE 0
  END AS avg_hours_per_week,
  -- Last flight
  a.last_flight_date,
  -- Days since last flight
  EXTRACT(DAY FROM NOW() - a.last_flight_date) AS days_since_last_flight
FROM aircraft a
LEFT JOIN mission_equipment me ON me.aircraft_id = a.id
  AND me.flight_duration_minutes IS NOT NULL
GROUP BY a.id, a.nickname, a.model, a.status, a.total_flight_hours,
         a.total_flights, a.acquired_date, a.last_flight_date;

-- ============================================================================
-- HELPER FUNCTION: Get flight history for a specific aircraft
-- ============================================================================

CREATE OR REPLACE FUNCTION get_airframe_history(p_aircraft_id UUID)
RETURNS TABLE (
  flight_number BIGINT,
  mission_id UUID,
  flight_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  cumulative_hours NUMERIC,
  batteries_used UUID[],
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY me.created_at) AS flight_number,
    me.mission_id,
    me.created_at AS flight_date,
    me.flight_duration_minutes AS duration_minutes,
    ROUND(SUM(COALESCE(me.flight_duration_minutes, 0)) OVER (
      ORDER BY me.created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) / 60.0, 2) AS cumulative_hours,
    me.battery_ids AS batteries_used,
    me.notes
  FROM mission_equipment me
  WHERE me.aircraft_id = p_aircraft_id
    AND me.flight_duration_minutes IS NOT NULL
  ORDER BY me.created_at DESC;
END;
$$ LANGUAGE plpgsql;
