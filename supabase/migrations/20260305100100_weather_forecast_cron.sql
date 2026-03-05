-- Weather forecast daily cron job
-- Schedule: 06:00 UTC daily (02:00 EDT, before morning flights)
-- Requires pg_cron and pg_net extensions (already enabled for TFR refresh)
-- Calls the weather-forecast-fetch edge function via pg_net HTTP POST

SELECT cron.schedule(
  'weather-forecast-check',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/weather-forecast-fetch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
