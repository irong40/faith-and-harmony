-- Aircraft maintenance history: add-only extension of the EXISTING
-- public.maintenance_log table (fleet_management, 20260210120100).
-- Adam decision 2026-11-22 #0: build on the existing CRM records, never a new
-- fleet list or spreadsheet. Scoping: agent-office/reports/2026-11-23-crm-maintenance-records-scoping.md
--
-- ADD ONLY. No column is dropped, renamed or retyped, no existing row is
-- changed, and no RLS policy or grant is touched (the table keeps its
-- existing policies: admins full access, signed-in users read).
--
-- Unknown stays unknown: every new value column is NULLABLE with NO default,
-- so an empty value means "not known" and the UI shows "unknown". The only
-- default is is_test = false, a row label, not a maintenance fact.
--
-- Undo (only while no row uses the new columns or enum values):
--   ALTER TABLE public.maintenance_log
--     DROP COLUMN IF EXISTS aircraft_id, DROP COLUMN IF EXISTS component_id,
--     DROP COLUMN IF EXISTS flight_hours_at_service, DROP COLUMN IF EXISTS results,
--     DROP COLUMN IF EXISTS performed_by_name, DROP COLUMN IF EXISTS evidence_url,
--     DROP COLUMN IF EXISTS open_issues, DROP COLUMN IF EXISTS next_due_flight_hours,
--     DROP COLUMN IF EXISTS is_test;
--   (Postgres cannot drop an enum value; the three added maintenance_type
--   values stay harmless when unused.)

-- 1. Event types Adam asked for that the enum lacks.
ALTER TYPE public.maintenance_type ADD VALUE IF NOT EXISTS 'service';
ALTER TYPE public.maintenance_type ADD VALUE IF NOT EXISTS 'part_replacement';
ALTER TYPE public.maintenance_type ADD VALUE IF NOT EXISTS 'battery_replacement';

-- 2. New nullable columns on the existing table.
ALTER TABLE public.maintenance_log
  ADD COLUMN IF NOT EXISTS aircraft_id UUID
    REFERENCES public.aircraft(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS component_id TEXT,
  ADD COLUMN IF NOT EXISTS flight_hours_at_service NUMERIC(8,2)
    CHECK (flight_hours_at_service IS NULL OR flight_hours_at_service >= 0),
  ADD COLUMN IF NOT EXISTS results TEXT,
  ADD COLUMN IF NOT EXISTS performed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS open_issues TEXT,
  ADD COLUMN IF NOT EXISTS next_due_flight_hours NUMERIC(8,2)
    CHECK (next_due_flight_hours IS NULL OR next_due_flight_hours >= 0),
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_maintenance_log_aircraft_performed
  ON public.maintenance_log (aircraft_id, performed_at DESC);

COMMENT ON COLUMN public.maintenance_log.aircraft_id IS
  'The aircraft this event belongs to (aircraft.id). Set for aircraft events and for components fitted to an aircraft.';
COMMENT ON COLUMN public.maintenance_log.component_id IS
  'Component serial or label (battery, propeller, gimbal) when the event is on a part, not the airframe. NULL = airframe or not recorded.';
COMMENT ON COLUMN public.maintenance_log.flight_hours_at_service IS
  'Aircraft flight hours when the work was done. NULL = unknown; never fill with an estimate.';
COMMENT ON COLUMN public.maintenance_log.results IS
  'Result of the work (passed, fixed, replaced, deferred). description holds the work performed.';
COMMENT ON COLUMN public.maintenance_log.performed_by_name IS
  'Free-text performer for an outside shop or person without a profile (performed_by is FK to profiles).';
COMMENT ON COLUMN public.maintenance_log.evidence_url IS
  'Link or file path to the source record (receipt, service order, photo, log).';
COMMENT ON COLUMN public.maintenance_log.open_issues IS
  'Issues found and not yet resolved. NULL = none recorded.';
COMMENT ON COLUMN public.maintenance_log.next_due_flight_hours IS
  'Flight-hour threshold at which the next service is due. NULL = none set.';
COMMENT ON COLUMN public.maintenance_log.is_test IS
  'TRUE for TEST rows made in dev/staging. Live history views exclude them.';
