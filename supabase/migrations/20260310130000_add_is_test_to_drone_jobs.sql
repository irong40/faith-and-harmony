-- Add is_test flag to drone_jobs for portfolio/test flights.
-- Test flights use the full pipeline but have no customer or billing.

ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_drone_jobs_is_test
  ON public.drone_jobs(is_test) WHERE is_test = true;

-- Allow pilots to insert test missions (they can already view/update their own)
CREATE POLICY "pilots_insert_test_missions"
  ON public.drone_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_test = true
    AND pilot_id = auth.uid()
  );

COMMENT ON COLUMN public.drone_jobs.is_test IS
  'Portfolio/practice flight. Full pipeline applies but no customer or billing.';
