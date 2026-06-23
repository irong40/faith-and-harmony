-- ============================================
-- Email Adam when a marketplace lead is ready to review/bid
--
-- When DroneSniper queues an in-region, decent-confidence job (bid_status
-- 'new', confidence high/medium, within range), insert a notification row.
-- The existing on_notification_send_email trigger -> notification-email edge
-- function (Resend) then emails him. One email per lead (review_notified_at guard).
-- This is "have Paula send an email when a job is ready to look at."
-- ============================================

ALTER TABLE public.marketplace_leads
  ADD COLUMN IF NOT EXISTS review_notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.fn_marketplace_lead_notify_review()
RETURNS TRIGGER AS $$
DECLARE
  v_body text;
  v_dist text;
BEGIN
  IF NEW.bid_status = 'new'
     AND NEW.confidence IN ('high','medium')
     AND COALESCE(NEW.distance_miles, 999) <= 150
     AND NEW.review_notified_at IS NULL THEN

    v_dist := CASE
      WHEN NEW.distance_miles IS NOT NULL THEN round(NEW.distance_miles)::text || ' mi away'
      ELSE 'distance unknown'
    END;

    v_body :=
      'A new drone job scored well and is ready for your review and bid.' || E'\n\n' ||
      'Job: ' || COALESCE(NEW.title, '(untitled)') || E'\n' ||
      'Type: ' || COALESCE(NEW.job_type, '?') || '   Score: ' || COALESCE(NEW.score::text, '?') ||
        ' (' || COALESCE(NEW.confidence, '?') || ')' || E'\n' ||
      'Location: ' || COALESCE(NEW.location_text, '?') || '  (' || v_dist || ')' || E'\n' ||
      'Budget: ' || COALESCE('$' || NEW.budget::text, 'not stated') ||
        '   Suggested bid: ' || COALESCE('$' || NEW.suggested_bid::text, 'n/a') || E'\n' ||
      CASE WHEN COALESCE(NEW.competitor_count, 0) > 0
        THEN 'Competitors: ' || NEW.competitor_count || ' bids' ||
             COALESCE(' (median $' || NEW.competitor_median::text || ')', '') || E'\n'
        ELSE '' END ||
      CASE WHEN NEW.url IS NOT NULL THEN E'\n' || 'Open on droners.io: ' || NEW.url ELSE '' END;

    -- link is left NULL on purpose: notification-email treats link as a path on
    -- faithandharmonyllc.com, so an external droners URL would be mangled. The
    -- droners link is in the body instead.
    INSERT INTO public.notifications (user_email, type, title, body, link, send_email)
    VALUES (
      'dradamopierce@gmail.com',
      'system',
      'Drone job to review: ' || COALESCE(NEW.title, '(untitled)'),
      v_body,
      NULL,
      true
    );

    NEW.review_notified_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_marketplace_lead_notify_review ON public.marketplace_leads;
CREATE TRIGGER trg_marketplace_lead_notify_review
  BEFORE INSERT OR UPDATE ON public.marketplace_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_marketplace_lead_notify_review();
