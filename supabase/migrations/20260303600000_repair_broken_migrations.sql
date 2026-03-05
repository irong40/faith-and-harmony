-- =====================================================
-- Repair ghost-applied migrations (20260225200000 through 20260226100000)
-- These migrations were recorded in supabase_migrations.schema_migrations
-- but their DDL never executed. Re-applies all DDL idempotently.
-- Quote tables (20260226000001, 20260226100000) excluded — already
-- repaired by 20260227100000_repair_quote_tables.sql.
-- Cron schedules (20260225400000) excluded — require pg_cron manual enable.
-- =====================================================

-- ---------------------------------------------------
-- From 20260225200000_tfr_refresh_cron.sql
-- ---------------------------------------------------
ALTER TABLE public.tfr_cache
  ADD COLUMN IF NOT EXISTS last_refresh_batch text;

CREATE TABLE IF NOT EXISTS public.tfr_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  total_fetched integer,
  in_area integer,
  upserted integer,
  expired_count integer,
  errors text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tfr_refresh_log IS 'Audit log of TFR auto-refresh runs';

CREATE INDEX IF NOT EXISTS idx_tfr_refresh_log_refreshed_at
  ON public.tfr_refresh_log(refreshed_at DESC);

ALTER TABLE public.tfr_refresh_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view tfr refresh log" ON public.tfr_refresh_log;
CREATE POLICY "Admins can view tfr refresh log"
  ON public.tfr_refresh_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------
-- From 20260225200100_safety_audit_log.sql
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.safety_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id    uuid REFERENCES public.drone_jobs(id) ON DELETE SET NULL,
  pilot_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  event_data    jsonb,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.safety_audit_log IS 'Immutable audit log for safety-critical pilot actions (FAA compliance)';
COMMENT ON COLUMN public.safety_audit_log.event_type IS 'E.g.: weather_briefing, weather_refresh, weather_override, tfr_review, checklist_complete, preflight_gate_stale_weather, final_gate_stale_weather';
COMMENT ON COLUMN public.safety_audit_log.event_data IS 'Structured data relevant to the event (METAR age, determination, station, etc.)';

CREATE INDEX IF NOT EXISTS idx_safety_audit_log_mission ON public.safety_audit_log(mission_id);
CREATE INDEX IF NOT EXISTS idx_safety_audit_log_pilot ON public.safety_audit_log(pilot_id);
CREATE INDEX IF NOT EXISTS idx_safety_audit_log_event_type ON public.safety_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_safety_audit_log_created_at ON public.safety_audit_log(created_at DESC);

ALTER TABLE public.safety_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pilots can insert safety audit events" ON public.safety_audit_log;
CREATE POLICY "Pilots can insert safety audit events"
  ON public.safety_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (pilot_id = auth.uid());

DROP POLICY IF EXISTS "Pilots can view their own safety audit events" ON public.safety_audit_log;
CREATE POLICY "Pilots can view their own safety audit events"
  ON public.safety_audit_log FOR SELECT
  TO authenticated
  USING (pilot_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all safety audit events" ON public.safety_audit_log;
CREATE POLICY "Admins can view all safety audit events"
  ON public.safety_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------
-- From 20260225300000_pilot_role_enum.sql
-- ---------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pilot'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'pilot';
  END IF;
END$$;

-- ---------------------------------------------------
-- From 20260225300100_pilot_rls_policies.sql
-- ---------------------------------------------------
DROP POLICY IF EXISTS "Pilots can view own missions" ON public.drone_jobs;
DROP POLICY IF EXISTS "Pilots can update own missions" ON public.drone_jobs;
DROP POLICY IF EXISTS "Pilots see own missions" ON public.drone_jobs;
DROP POLICY IF EXISTS "Pilots update own missions" ON public.drone_jobs;

CREATE POLICY "Pilots see own missions"
  ON public.drone_jobs FOR SELECT TO authenticated
  USING (
    pilot_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Pilots update own missions"
  ON public.drone_jobs FOR UPDATE TO authenticated
  USING (
    pilot_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    pilot_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Pilots can view own processing jobs" ON public.processing_jobs;
CREATE POLICY "Pilots can view own processing jobs"
  ON public.processing_jobs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drone_jobs
      WHERE drone_jobs.id = processing_jobs.mission_id
        AND (
          drone_jobs.pilot_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Pilots can insert own mission weather logs" ON public.mission_weather_logs;
CREATE POLICY "Pilots can insert own mission weather logs"
  ON public.mission_weather_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drone_jobs
      WHERE drone_jobs.id = mission_weather_logs.mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );

-- ---------------------------------------------------
-- From 20260225300200_activity_events.sql
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.activity_events IS 'Team activity feed — records key events for admin visibility';
COMMENT ON COLUMN public.activity_events.event_type IS 'Typed event identifier for icon/color rendering';
COMMENT ON COLUMN public.activity_events.entity_type IS 'Domain entity type: mission, delivery, pilot, pipeline, etc.';
COMMENT ON COLUMN public.activity_events.summary IS 'Human-readable description shown in the feed';

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read activity events" ON public.activity_events;
CREATE POLICY "Authenticated can read activity events"
  ON public.activity_events FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert activity events" ON public.activity_events;
CREATE POLICY "Authenticated can insert activity events"
  ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_events_created ON public.activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON public.activity_events(entity_type, entity_id);
