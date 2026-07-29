-- ============================================================================
-- Post-delivery retention drip enrollment (Wave 7, activated 2026-07-28)
-- ============================================================================
-- Staged 2026-07-27 (CTO/backend-architect thread); applied 2026-07-28 after
-- Adam approved the marketing copy (v1_approved_2026-07-28, deployed in
-- process-drip v10 templates.ts BEFORE this migration per the runbook).
-- Design doc: obsidian-dev/projects/sentinel-aerial/retention-drip-mechanism-2026-07-27.md
--
-- WHAT THIS DOES:
--   1. Unique backstop index: at most one post_delivery enrollment per job+step.
--   2. enroll_post_delivery_drip(): AFTER UPDATE trigger fn on drone_jobs that
--      inserts two pending scheduled_emails rows (day-7 feedback = step 2,
--      day-30 rebook = step 4) when delivery_status first transitions to
--      'sent' or 'delivery_confirmed'.
--   3. Trigger trg_post_delivery_drip_enroll — created DISABLED. Activation is
--      a separate, deliberate ENABLE statement (last runbook step).
--   4. stop_post_delivery_drip(job_id, reason): manual stop helper — cancels
--      remaining pending steps for a job (client replied / asked to stop).
--
-- SAFETY PROPERTIES:
--   - Idempotent: CREATE OR REPLACE / IF NOT EXISTS / DROP IF EXISTS throughout.
--   - Trigger ships DISABLED: applying this file alone sends nothing, enrolls
--     nothing. Historic delivered jobs cannot retro-enroll (triggers only fire
--     on future UPDATEs).
--   - AFTER UPDATE timing: never shares an event queue with the BEFORE UPDATE
--     trigger zz_sync_delivery_state. No column list on the trigger
--     (deliberately NOT "AFTER UPDATE OF ..."), because UPDATE OF matches the
--     columns NAMED in the SET clause — the gotcha documented in staged
--     migration 20260728093000_payments_direct_booked_billing.sql. A WHEN
--     clause gates on the actual value transition instead.
--   - EXCEPTION WHEN OTHERS swallow: drip enrollment can never roll back a
--     delivery (house pattern from on_drone_job_delivered).
--
-- Context carried for template rendering (process-drip templates.ts v1 copy):
--   job_preset (processing_templates.preset_name via processing_template_id),
--   property_address (COALESCE property_address, site_address),
--   delivery_date (YYYY-MM-DD in America/New_York).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Dedupe backstop: one enrollment per job per step.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_emails_post_delivery_job_step
  ON public.scheduled_emails ((context->>'job_id'), sequence_step)
  WHERE sequence_type = 'post_delivery';

COMMENT ON INDEX public.uq_scheduled_emails_post_delivery_job_step IS
  'Retention drip: at most one post_delivery scheduled email per drone_job per step. Backstop behind trg_post_delivery_drip_enroll idempotency guard.';

-- ----------------------------------------------------------------------------
-- 2. Enrollment trigger function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_post_delivery_drip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client   RECORD;
  v_email    TEXT;
  v_name     TEXT;
  v_preset   TEXT;
  v_date_iso TEXT;
  v_site     TEXT;
  v_base     TIMESTAMPTZ;
BEGIN
  -- Single-shot guard (redundant with the trigger WHEN clause; kept per house
  -- style so the function is safe even if re-attached without the clause).
  IF NOT (NEW.delivery_status IS DISTINCT FROM OLD.delivery_status
          AND NEW.delivery_status IN ('sent', 'delivery_confirmed')) THEN
    RETURN NEW;
  END IF;

  -- Exclusion: portfolio/practice flights (no customer, no billing).
  -- delivery_status = 'portfolio_complete' never enters the IN list above,
  -- so speculative/portfolio terminal states are structurally excluded too.
  IF COALESCE(NEW.is_test, false) THEN
    RAISE LOG '[retention-drip] job % is_test — not enrolling', NEW.id;
    RETURN NEW;
  END IF;

  -- Idempotency: at most one enrollment per job, ever. Covers the legitimate
  -- second transition sent -> delivery_confirmed (portal confirm-receipt) and
  -- any re-delivery cycle.
  IF EXISTS (
    SELECT 1 FROM scheduled_emails
    WHERE sequence_type = 'post_delivery'
      AND context->>'job_id' = NEW.id::text
  ) THEN
    RAISE LOG '[retention-drip] job % already enrolled — skipping', NEW.id;
    RETURN NEW;
  END IF;

  -- Resolve the client email. drone-delivery-email stamps delivery_email_to
  -- in the same UPDATE that sets delivery_status='sent', so it is visible to
  -- this AFTER trigger. Fallback: clients.email via client_id (clients is the
  -- only party table; drone_jobs.customer_id is deprecated).
  SELECT c.name, c.company, c.email
    INTO v_client
    FROM clients c
   WHERE c.id = NEW.client_id;

  v_email := NULLIF(BTRIM(COALESCE(NEW.delivery_email_to, v_client.email, '')), '');

  -- Exclusion: no client email -> no enrollment.
  IF v_email IS NULL THEN
    RAISE LOG '[retention-drip] job % delivered with no client email — not enrolling', NEW.id;
    RETURN NEW;
  END IF;

  v_name := COALESCE(v_client.name, v_client.company);

  -- Template merge fields (approved copy v1 renders these in process-drip).
  SELECT pt.preset_name INTO v_preset
    FROM processing_templates pt
   WHERE pt.id = NEW.processing_template_id;

  v_site     := NULLIF(BTRIM(COALESCE(NEW.property_address, NEW.site_address, '')), '');
  v_date_iso := to_char((timezone('America/New_York',
                          COALESCE(NEW.delivery_sent_at, now())))::date, 'YYYY-MM-DD');

  -- Schedule convention copied from enqueue-drip (buildScheduleRows):
  -- target calendar day in UTC at 13:00 UTC (9 AM EDT / 8 AM EST).
  -- post_delivery offsets there are [0,6,13,29]; we enroll only steps 2 and 4:
  --   step 2 = "day 7"  = +6 days  (feedback check-in)
  --   step 4 = "day 30" = +29 days (rebook)
  v_base := (date_trunc('day', now() AT TIME ZONE 'utc') + INTERVAL '13 hours') AT TIME ZONE 'utc';

  INSERT INTO scheduled_emails
    (lead_id, recipient_email, recipient_name, sequence_type, sequence_step,
     scheduled_for, status, context)
  SELECT
    NULL,                                  -- client jobs are not drone_leads rows;
                                           -- NULL lead_id makes process-drip skip
                                           -- its outreach-only lead checks (by design)
    v_email,
    v_name,
    'post_delivery'::drip_sequence_type,
    s.step,
    v_base + s.offset_days,
    'pending'::scheduled_email_status,
    jsonb_build_object(
      'job_id',           NEW.id::text,
      'job_number',       NEW.job_number,
      'property_address', v_site,
      'client_id',        NEW.client_id::text,
      'job_preset',       v_preset,
      'delivery_date',    v_date_iso,
      'enrolled_by',      'trg_post_delivery_drip_enroll',
      'copy_version',     'v1_approved_2026-07-28'
    )
  FROM (VALUES
         (2, INTERVAL '6 days'),   -- day-7 feedback  -> templates.ts key post_delivery_2
         (4, INTERVAL '29 days')   -- day-30 rebook   -> templates.ts key post_delivery_4
       ) AS s(step, offset_days)
  ON CONFLICT ((context->>'job_id'), sequence_step)
    WHERE sequence_type = 'post_delivery'
    DO NOTHING;

  RAISE LOG '[retention-drip] job % (% -> %) enrolled: steps 2 & 4 for %',
    NEW.id, OLD.delivery_status, NEW.delivery_status, v_email;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- CRITICAL: AFTER UPDATE, shares the caller's transaction. A drip failure
    -- must never un-deliver a mission (same contract as on_drone_job_delivered).
    RAISE LOG '[retention-drip] enrollment FAILED for job %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enroll_post_delivery_drip() IS
  'Retention drip: enrolls client jobs into post_delivery steps 2 (day-7 feedback) and 4 (day-30 rebook) in scheduled_emails when delivery_status first becomes sent/delivery_confirmed. Excludes is_test, portfolio flights, and jobs without a client email. Idempotent per job.';

-- ----------------------------------------------------------------------------
-- 3. Trigger — AFTER UPDATE, no column list, created DISABLED.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_post_delivery_drip_enroll ON public.drone_jobs;

CREATE TRIGGER trg_post_delivery_drip_enroll
  AFTER UPDATE ON public.drone_jobs
  FOR EACH ROW
  WHEN (NEW.delivery_status IS DISTINCT FROM OLD.delivery_status
        AND NEW.delivery_status IN ('sent', 'delivery_confirmed'))
  EXECUTE FUNCTION public.enroll_post_delivery_drip();

COMMENT ON TRIGGER trg_post_delivery_drip_enroll ON public.drone_jobs IS
  'Retention drip enrollment (day-7 feedback + day-30 rebook). Ships DISABLED; enable only after approved copy is deployed in process-drip. See obsidian-dev/projects/sentinel-aerial/retention-drip-mechanism-2026-07-27.md.';

-- SAFETY: ship disabled. Activation is the LAST runbook step:
--   ALTER TABLE public.drone_jobs ENABLE TRIGGER trg_post_delivery_drip_enroll;
ALTER TABLE public.drone_jobs DISABLE TRIGGER trg_post_delivery_drip_enroll;

-- ----------------------------------------------------------------------------
-- 4. Manual stop helper (client replied / asked to stop / rebooked early).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stop_post_delivery_drip(
  p_job_id UUID,
  p_reason TEXT DEFAULT 'manual stop'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'stop_post_delivery_drip: not authorized';
  END IF;

  UPDATE scheduled_emails
     SET status      = 'cancelled',
         skip_reason = COALESCE(NULLIF(BTRIM(p_reason), ''), 'manual stop')
   WHERE sequence_type = 'post_delivery'
     AND context->>'job_id' = p_job_id::text
     AND status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.stop_post_delivery_drip(UUID, TEXT) IS
  'Cancels remaining pending post_delivery drip steps for a drone_job (client reply, unsubscribe request, or early rebook). Returns number of steps cancelled. Admin or service role only.';

REVOKE ALL ON FUNCTION public.stop_post_delivery_drip(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stop_post_delivery_drip(UUID, TEXT) TO authenticated, service_role;
