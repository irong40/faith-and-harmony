-- ============================================
-- Fix #2: send_notification_email() called extensions.http_post, but pg_net's
-- http_post lives in the `net` schema (net.http_post(url, body jsonb, params,
-- headers, timeout)). The wrong schema meant the call never resolved and every
-- email silently failed (caught by the EXCEPTION handler). Use net.http_post
-- with body as JSONB.
-- ============================================
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payload JSONB;
  v_url TEXT;
BEGIN
  IF NOT COALESCE(NEW.send_email, true) THEN
    RETURN NEW;
  END IF;

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

  PERFORM net.http_post(
    url := v_url,
    body := v_payload,
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
$function$;
