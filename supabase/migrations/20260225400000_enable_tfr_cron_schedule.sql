-- Enable TFR auto-refresh cron job (30-min interval)
-- Requires pg_cron and pg_net extensions enabled via Supabase Dashboard
-- Phase 8 gap closure: original migration had cron.schedule() commented out

SELECT cron.schedule(
  'tfr-refresh',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/tfr-refresh',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
