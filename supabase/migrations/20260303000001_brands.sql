-- Multi-brand support: brands table as single source of truth for customer-facing branding
CREATE TABLE public.brands (
  slug            text PRIMARY KEY,
  company_name    text NOT NULL,
  legal_name      text NOT NULL,
  dba             text,
  tagline         text NOT NULL,
  -- Colors (4 hex values — enough for emails + acceptance page)
  color_primary   text NOT NULL,
  color_accent    text NOT NULL,
  color_cta       text NOT NULL,
  color_light     text NOT NULL,
  -- Contact
  from_email      text NOT NULL,
  reply_to        text NOT NULL,
  phone           text,
  website         text,
  -- URLs
  base_url        text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS: admins can manage, edge functions use service_role (bypasses RLS)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage brands"
  ON public.brands
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed SAI and F&H brands
INSERT INTO public.brands (slug, company_name, legal_name, dba, tagline, color_primary, color_accent, color_cta, color_light, from_email, reply_to, phone, website, base_url)
VALUES
  ('sai', 'Sentinel Aerial Inspections', 'Faith & Harmony LLC', 'Sentinel Aerial Inspections',
   'Professional Drone Services — Hampton Roads',
   '#1C1C1C', '#FF6B35', '#FF6B35', '#F5F5F0',
   'quotes@sentinelaerialinspections.com', 'contact@sentinelaerial.com',
   '760.575.4876', 'sentinelaerial.com', 'https://faithandharmonyllc.com'),
  ('fh', 'Faith & Harmony LLC', 'Faith & Harmony LLC', NULL,
   'Part 107 Training & Certification',
   '#5B2C6F', '#C9A227', '#5B2C6F', '#FFFFFF',
   'quotes@faithandharmonyllc.com', 'contact@faithandharmonyllc.com',
   '760.575.4876', 'faithandharmonyllc.com', 'https://faithandharmonyllc.com');
