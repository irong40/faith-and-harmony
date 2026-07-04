-- Re-create the daily weather forecast refresh cron job.
-- The original 20260305100100 migration skipped silently when pg_cron was not
-- yet enabled, and no job existed afterward — the forecast cache went stale
-- after 2026-04-01. pg_cron and pg_net are both enabled now.
-- weather-forecast-fetch has verify_jwt=false and authenticates internally
-- with its own service-role env, so no Authorization header is needed here.

SELECT cron.unschedule('weather-forecast-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weather-forecast-check');

SELECT cron.schedule(
  'weather-forecast-check',
  '0 6 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/weather-forecast-fetch',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $job$
);
