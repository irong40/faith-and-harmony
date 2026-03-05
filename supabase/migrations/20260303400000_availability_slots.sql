-- Phase 4: Scheduling and Availability
-- availability_slots: recurring weekly defaults (Mon-Fri 8am-5pm)
-- availability_overrides: date-specific exceptions (extra open day or closed override)

CREATE TABLE public.availability_slots (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,

  -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  -- Matches PostgreSQL EXTRACT(DOW FROM date) and JavaScript getDay()
  day_of_week  smallint    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   time        NOT NULL DEFAULT '08:00',
  end_time     time        NOT NULL DEFAULT '17:00',
  is_active    boolean     NOT NULL DEFAULT true,
  service_type text        -- NULL = applies to all service types
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.availability_slots
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all" ON public.availability_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default Monday through Friday 8am to 5pm slots
INSERT INTO public.availability_slots (day_of_week, start_time, end_time)
VALUES (1, '08:00', '17:00'),
       (2, '08:00', '17:00'),
       (3, '08:00', '17:00'),
       (4, '08:00', '17:00'),
       (5, '08:00', '17:00');

COMMENT ON TABLE public.availability_slots IS 'Recurring weekly availability defaults. day_of_week follows PostgreSQL DOW convention: 0=Sunday, 6=Saturday. NULL service_type applies to all package types.';

-- availability_overrides: date-specific exceptions
CREATE TABLE public.availability_overrides (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL,

  override_date  date        NOT NULL,
  is_available   boolean     NOT NULL,  -- true = extra open day, false = closed override
  note           text,
  service_type   text        -- NULL = applies to all service types
);

ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.availability_overrides
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all" ON public.availability_overrides
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_availability_overrides_date
  ON public.availability_overrides (override_date);

COMMENT ON TABLE public.availability_overrides IS 'Date-specific availability exceptions. is_available=true adds an extra open day, is_available=false closes a normally open day.';
