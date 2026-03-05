-- Fix: re-create anon insert policy on quote_requests
-- The original policy may have been lost during table recreation

-- Drop if exists to avoid duplicate policy error
DROP POLICY IF EXISTS "anon_insert_quote_requests" ON public.quote_requests;

-- Re-create: anonymous users can insert quote requests from the landing page
CREATE POLICY "anon_insert_quote_requests"
  ON public.quote_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);
