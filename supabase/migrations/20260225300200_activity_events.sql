-- =====================================================
-- Phase 6: Activity events table for team awareness
-- =====================================================

CREATE TABLE public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  -- Types: mission_created, mission_assigned, pipeline_started,
  -- pipeline_complete, pipeline_failed, delivery_sent, delivery_confirmed,
  -- weather_checked, checklist_completed, pilot_added
  entity_type TEXT NOT NULL, -- 'mission', 'delivery', 'pilot', etc.
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

-- RLS: all authenticated users can read (team visibility)
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activity events"
  ON public.activity_events FOR SELECT TO authenticated
  USING (true);

-- Authenticated users (service role, edge functions) can insert events
CREATE POLICY "Authenticated can insert activity events"
  ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- Index for recent events query (created_at DESC for last-20 queries)
CREATE INDEX idx_activity_events_created ON public.activity_events(created_at DESC);

-- Index for entity lookups
CREATE INDEX idx_activity_events_entity ON public.activity_events(entity_type, entity_id);
