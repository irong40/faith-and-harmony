-- Safety audit log for FAA compliance
-- All safety-relevant actions are recorded here with mission_id linkage.

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

-- Indexes for common queries
CREATE INDEX idx_safety_audit_log_mission ON public.safety_audit_log(mission_id);
CREATE INDEX idx_safety_audit_log_pilot ON public.safety_audit_log(pilot_id);
CREATE INDEX idx_safety_audit_log_event_type ON public.safety_audit_log(event_type);
CREATE INDEX idx_safety_audit_log_created_at ON public.safety_audit_log(created_at DESC);

-- RLS
ALTER TABLE public.safety_audit_log ENABLE ROW LEVEL SECURITY;

-- Pilots can insert their own events
CREATE POLICY "Pilots can insert safety audit events"
  ON public.safety_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (pilot_id = auth.uid());

-- Pilots can view their own audit events
CREATE POLICY "Pilots can view their own safety audit events"
  ON public.safety_audit_log FOR SELECT
  TO authenticated
  USING (pilot_id = auth.uid());

-- Admins can view all events
CREATE POLICY "Admins can view all safety audit events"
  ON public.safety_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- No UPDATE or DELETE — audit log is immutable
