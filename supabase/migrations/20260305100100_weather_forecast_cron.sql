-- Weather forecast daily cron job
-- Schedule: 06:00 UTC daily (02:00 EDT, before morning flights)
-- Requires pg_cron and pg_net extensions
-- Wrapped in DO block: skips gracefully if pg_cron is not enabled

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'weather-forecast-check',
      '0 6 * * *',
      $job$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/weather-forecast-fetch',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      )
      $job$
    );
    RAISE NOTICE 'Weather forecast cron job scheduled';
  ELSE
    RAISE NOTICE 'pg_cron not enabled - skipping weather forecast cron job. Enable it in Supabase Dashboard > Database > Extensions.';
  END IF;
END
$$;
