-- Phase 4: Scheduling and Availability
-- blackout_dates: full-day blocks with a reason

CREATE TABLE public.blackout_dates (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,

  blackout_date date        NOT NULL UNIQUE,
  reason        text        NOT NULL,
  -- Suggested reason values: weather_hold | holiday | maintenance | personal
  created_by    uuid        REFERENCES auth.users(id)
);

ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.blackout_dates
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all" ON public.blackout_dates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_blackout_dates_date
  ON public.blackout_dates (blackout_date);

COMMENT ON TABLE public.blackout_dates IS 'Full-day availability blocks. Dates in this table are excluded from all availability calculations regardless of weekly slot defaults.';
