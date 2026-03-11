-- Allow admins to insert quote_requests (needed for lead conversion flow)
-- The existing 20260303500000 migration added SELECT and UPDATE policies.
-- This adds INSERT so authenticated admins can create quote_requests during lead conversion.

CREATE POLICY "admins_insert_quote_requests"
  ON public.quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
