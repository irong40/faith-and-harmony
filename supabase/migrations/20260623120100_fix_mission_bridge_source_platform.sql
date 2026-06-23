-- ============================================
-- Fix: fn_marketplace_lead_to_mission must NOT set drone_jobs.source_platform
-- source_platform is constrained to the AIRCRAFT used (mini4pro/m4e/m3e),
-- not the lead origin. The droners origin is already recorded in the
-- 'DRN-' job_number prefix and admin_notes. Leave source_platform NULL
-- (pilot sets it at capture time).
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_marketplace_lead_to_mission()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id UUID;
  v_job_number TEXT;
  v_property_type TEXT;
BEGIN
  IF NEW.bid_status = 'won'
     AND NEW.drone_job_id IS NULL
     AND (TG_OP = 'INSERT' OR OLD.bid_status IS DISTINCT FROM NEW.bid_status) THEN

    v_job_number := 'DRN-' || NEW.external_job_id;

    SELECT id INTO v_job_id FROM public.drone_jobs WHERE job_number = v_job_number;

    IF v_job_id IS NULL THEN
      v_property_type := CASE
        WHEN NEW.job_type IN ('land-assessment','commercial','commercial-inspection',
                              'infrastructure','construction','mapping','surveying','agriculture')
          THEN 'commercial'
        ELSE 'residential'
      END;

      INSERT INTO public.drone_jobs (
        job_number, property_address, property_state, property_type,
        status, latitude, longitude, job_price, site_address, admin_notes
      ) VALUES (
        v_job_number,
        COALESCE(NULLIF(NEW.location_text, ''), 'Address TBD - droners ' || NEW.external_job_id),
        'VA',
        v_property_type,
        'intake',
        NEW.latitude,
        NEW.longitude,
        ROUND(COALESCE(NEW.bid_amount, NEW.suggested_bid, 0))::INTEGER,
        NEW.location_text,
        'Auto-created from DroneSniper marketplace lead ' || NEW.external_job_id ||
          COALESCE(' - ' || NEW.title, '') ||
          COALESCE(' | ' || NEW.url, '')
      )
      RETURNING id INTO v_job_id;
    END IF;

    NEW.drone_job_id := v_job_id;
    NEW.bid_status   := 'mission_created';
    NEW.won_at       := COALESCE(NEW.won_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
