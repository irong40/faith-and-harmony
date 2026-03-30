-- Phase 15: Admin lead creation and conversion
-- Enables admin users to insert new leads manually and update existing leads
-- (status changes, client linking, conversion flows).
-- Intentionally kept as two distinct policies so future phases can revoke
-- one independently of the other.

-- Allow admins to insert new leads directly (manual entry, Phase 15)
CREATE POLICY "admins_insert_leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update leads (status changes, client linking, conversion)
CREATE POLICY "admins_update_leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
