-- Notification email trigger
-- Fires on every INSERT to the notifications table, calling the
-- notification-email edge function via pg_net so the admin always
-- gets an email when something needs attention.

-- pg_net is already enabled (see 20260305300100_drone_job_webhook.sql)

CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payload JSONB;
  v_url TEXT;
BEGIN
  v_payload := jsonb_build_object(
    'notification_id', NEW.id,
    'user_email', NEW.user_email,
    'type', NEW.type,
    'title', NEW.title,
    'body', COALESCE(NEW.body, ''),
    'link', NEW.link
  );

  v_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://qjpujskwqaehxnqypxzu.supabase.co'
  ) || '/functions/v1/notification-email';

  PERFORM extensions.http_post(
    url := v_url,
    body := v_payload::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('app.settings.service_role_key', true),
        current_setting('supabase.service_role_key', true),
        ''
      )
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notification-email trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_send_email ON public.notifications;

CREATE TRIGGER on_notification_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_email();

COMMENT ON TRIGGER on_notification_send_email ON public.notifications IS
  'Sends an email via notification-email edge function whenever a notification is created';
