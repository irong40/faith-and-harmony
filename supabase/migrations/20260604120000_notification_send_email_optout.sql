-- Decouple the notification bell from the notification email.
--
-- The on_notification_send_email trigger fires an email for EVERY row inserted
-- into public.notifications. Some events already send their own richer email
-- (for example, web quote requests send a reply-to-prospect email directly from
-- the quote-request function). For those we still want the in-app bell, but not a
-- second, generic email. This adds an opt-out flag the trigger honors.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS send_email boolean NOT NULL DEFAULT true;

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
  -- Bell-only notifications opt out of the email.
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
