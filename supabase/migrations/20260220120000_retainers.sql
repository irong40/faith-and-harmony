-- Enable moddatetime extension (idempotent)
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- Retainers table for brokerage retainer billing
CREATE TABLE public.retainers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'canceled')),
  monthly_rate INTEGER NOT NULL DEFAULT 1500,
  shoots_included INTEGER NOT NULL DEFAULT 5,
  shoots_used INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER retainers_updated_at
  BEFORE UPDATE ON public.retainers
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE public.retainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retainers"
  ON public.retainers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );
