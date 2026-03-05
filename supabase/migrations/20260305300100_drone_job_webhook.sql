-- Database webhook: notify n8n when a drone_job is created
-- This fires for BOTH paths: proposal-approved and quote-accepted

-- Use pg_net extension for async HTTP calls (available on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: POST to n8n webhook on drone_jobs INSERT
CREATE OR REPLACE FUNCTION public.notify_n8n_drone_job_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payload JSONB;
  v_n8n_url TEXT;
BEGIN
  -- Build webhook payload matching Supabase webhook format
  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'drone_jobs',
    'schema', 'public',
    'record', to_jsonb(NEW),
    'old_record', NULL
  );

  -- n8n webhook URL (set via Supabase vault or hardcode for local dev)
  -- For production: use Supabase vault secrets or env var
  -- For local dev: n8n must be exposed via tunnel (e.g., ngrok, cloudflared)
  v_n8n_url := COALESCE(
    current_setting('app.n8n_webhook_url', true),
    'https://divided-champion-chance-agricultural.trycloudflare.com/webhook/drone-job-created'
  );

  -- Fire-and-forget HTTP POST via pg_net
  PERFORM extensions.http_post(
    url := v_n8n_url,
    body := v_payload::TEXT,
    headers := '{"Content-Type": "application/json"}'::JSONB
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail the INSERT
    RAISE WARNING 'n8n webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_drone_job_created_notify_n8n
  AFTER INSERT ON public.drone_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_n8n_drone_job_created();

COMMENT ON TRIGGER on_drone_job_created_notify_n8n ON public.drone_jobs IS
  'WF6: Notifies n8n to create Google Calendar event when a drone_job is created (from quote or proposal)';
