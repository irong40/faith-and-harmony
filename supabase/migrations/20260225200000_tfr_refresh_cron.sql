-- Enable pg_cron extension (requires Supabase Pro or enabling via Dashboard)
-- Dashboard: Database > Extensions > pg_cron
-- This migration registers the cron job; the extension must be enabled first.

-- Add last_refreshed_at tracking column to tfr_cache if not present
ALTER TABLE public.tfr_cache
  ADD COLUMN IF NOT EXISTS last_refresh_batch text;

-- Schedule TFR auto-refresh every 30 minutes via pg_cron + pg_net
-- Replace <service_role_key> with actual key in Supabase Dashboard secrets
-- Note: Run this manually in SQL editor after enabling pg_cron extension

-- SELECT cron.schedule(
--   'tfr-refresh',
--   '*/30 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/tfr-refresh',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   )
--   $$
-- );

-- Create a tfr_refresh_log table to track refresh history
CREATE TABLE IF NOT EXISTS public.tfr_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  total_fetched integer,
  in_area integer,
  upserted integer,
  expired_count integer,
  errors text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tfr_refresh_log IS 'Audit log of TFR auto-refresh runs';

-- Index for recency queries
CREATE INDEX idx_tfr_refresh_log_refreshed_at ON public.tfr_refresh_log(refreshed_at DESC);

-- RLS: admins and service role can view
ALTER TABLE public.tfr_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tfr refresh log"
  ON public.tfr_refresh_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
