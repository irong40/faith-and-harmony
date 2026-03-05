-- Add admin SELECT policy on quote_requests
-- Without this, the QuoteRequests admin page silently returns empty results
-- because RLS only had an anon INSERT policy.

CREATE POLICY "admins_read_quote_requests"
  ON public.quote_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_update_quote_requests"
  ON public.quote_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
