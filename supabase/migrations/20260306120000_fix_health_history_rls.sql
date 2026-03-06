-- Fix app_health_history INSERT RLS
-- Previous policy allowed anonymous inserts (no TO clause)
-- Heartbeats are recorded via edge function using service_role key
-- so we restrict INSERT to service_role only

DROP POLICY IF EXISTS "Health history insertable by anyone" ON public.app_health_history;

CREATE POLICY "Health history insertable by service role"
ON public.app_health_history FOR INSERT
TO service_role
WITH CHECK (true);
