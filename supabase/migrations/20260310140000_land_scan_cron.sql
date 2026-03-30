-- Schedule automated land listing scans via pg_cron + pg_net.
-- Runs daily at 6:00 AM ET (10:00 UTC) to catch new overnight listings.
-- The scan-land-listings edge function handles everything: Serper search,
-- Craigslist RSS, dedup, scoring, and AI pitch generation.

-- Enable pg_cron (may already be active from Supabase dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role so cron.schedule works in migrations
GRANT USAGE ON SCHEMA cron TO postgres;

-- Daily scan at 6 AM ET (all regions, all sources)
SELECT cron.schedule(
  'daily-land-scan',
  '0 10 * * *',
  $$
  SELECT extensions.http_post(
    url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      'https://qjpujskwqaehxnqypxzu.supabase.co'
    ) || '/functions/v1/scan-land-listings',
    body := '{"manual": false, "max_results_per_source": 30}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('app.settings.service_role_key', true),
        current_setting('supabase.service_role_key', true),
        ''
      )
    )
  );
  $$
);
