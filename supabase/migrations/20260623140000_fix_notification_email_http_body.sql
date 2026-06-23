-- ============================================
-- Fix: send_notification_email() passed body as TEXT to extensions.http_post
-- (pg_net), whose `body` param is JSONB. No signature matched, so every
-- notification email silently failed ("function extensions.http_post(... body
-- => text ...) does not exist", swallowed by the EXCEPTION handler). Pass
-- v_payload as JSONB. Repairs ALL notification emails (messages, tickets,
-- voice orders, and the new marketplace review alerts).
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

  PERFORM extensions.http_post(
    url := v_url,
    body := v_payload,  -- JSONB (was v_payload::TEXT, which matched no signature)
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
