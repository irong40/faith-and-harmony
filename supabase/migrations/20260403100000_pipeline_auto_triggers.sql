-- Pipeline auto-triggers: close the 3 manual handoff gaps
-- 1. Quote accepted → auto-create drone_job
-- 2. Drone job ingested → auto-create processing_job
-- 3. Drone job delivered → auto-create deposit invoice via Square

-- ============================================================
-- TRIGGER 1: Quote accepted → create drone_job
-- The RPC create_drone_job_from_quote() already exists.
-- This trigger fires it automatically when quotes.status → 'accepted'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Only fire when status transitions TO accepted
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    v_job_id := create_drone_job_from_quote(NEW.id);
    RAISE LOG '[auto-trigger] Quote % accepted → drone_job % created', NEW.id, v_job_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_accepted ON public.quotes;
CREATE TRIGGER trg_quote_accepted
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION public.on_quote_accepted();

COMMENT ON TRIGGER trg_quote_accepted ON public.quotes IS
  'Auto-creates drone_job when a quote is accepted. Uses existing create_drone_job_from_quote RPC.';

-- ============================================================
-- TRIGGER 2: Drone job ingested → create processing_job
-- When all assets are uploaded and EXIF extracted, drone_jobs.status
-- moves to 'ingested'. This auto-queues the processing pipeline
-- instead of requiring admin to click "Start Processing".
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_drone_job_ingested()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template_id UUID;
  v_existing UUID;
  v_idem_key TEXT;
BEGIN
  -- Only fire on transition TO ingested
  IF NEW.status = 'ingested' AND OLD.status != 'ingested' THEN

    -- Skip if a processing_job already exists (idempotent)
    SELECT id INTO v_existing
    FROM processing_jobs
    WHERE mission_id = NEW.id
      AND status NOT IN ('failed', 'cancelled');

    IF v_existing IS NOT NULL THEN
      RAISE LOG '[auto-trigger] Job % already has processing_job %, skipping', NEW.id, v_existing;
      RETURN NEW;
    END IF;

    -- Find the active processing template for this job's package
    SELECT pt.id INTO v_template_id
    FROM processing_templates pt
    WHERE pt.package_id = NEW.package_id
      AND pt.active = true
    LIMIT 1;

    -- Build idempotency key
    v_idem_key := 'auto-' || NEW.id::text || '-' || COALESCE(v_template_id::text, 'no-template') || '-' || to_char(now(), 'YYYYMMDD');

    -- Create processing_job in 'pending' status
    INSERT INTO processing_jobs (mission_id, processing_template_id, status, idempotency_key)
    VALUES (NEW.id, v_template_id, 'pending', v_idem_key)
    ON CONFLICT (idempotency_key) DO NOTHING;

    RAISE LOG '[auto-trigger] Job % ingested → processing_job queued (template: %)', NEW.id, v_template_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drone_job_ingested ON public.drone_jobs;
CREATE TRIGGER trg_drone_job_ingested
  AFTER UPDATE OF status ON public.drone_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'ingested')
  EXECUTE FUNCTION public.on_drone_job_ingested();

COMMENT ON TRIGGER trg_drone_job_ingested ON public.drone_jobs IS
  'Auto-queues processing pipeline when assets are ingested. Creates processing_job in pending status.';

-- ============================================================
-- TRIGGER 3: Drone job delivered → create deposit invoice
-- When drone_jobs.status moves to 'delivered' AND the job has a
-- quote_id, auto-create a deposit payment record. The actual
-- Square invoice is sent by the create-deposit-invoice edge
-- function (called separately or wired to processing_jobs.status).
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_drone_job_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quote RECORD;
  v_customer_email TEXT;
  v_existing UUID;
BEGIN
  -- Only fire on transition TO delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN

    -- Skip if no quote linked (manual job without quote flow)
    IF NEW.quote_id IS NULL THEN
      RAISE LOG '[auto-trigger] Job % delivered but no quote_id — skipping auto-invoice', NEW.id;
      RETURN NEW;
    END IF;

    -- Skip if payment already exists for this quote
    SELECT id INTO v_existing
    FROM payments
    WHERE quote_id = NEW.quote_id
      AND payment_type = 'deposit';

    IF v_existing IS NOT NULL THEN
      RAISE LOG '[auto-trigger] Job % already has deposit payment %, skipping', NEW.id, v_existing;
      RETURN NEW;
    END IF;

    -- Get quote details
    SELECT q.id, q.total, q.deposit_amount, q.request_id
    INTO v_quote
    FROM quotes q
    WHERE q.id = NEW.quote_id;

    IF v_quote IS NULL THEN
      RAISE WARNING '[auto-trigger] Job % quote % not found', NEW.id, NEW.quote_id;
      RETURN NEW;
    END IF;

    -- Get customer email from quote_request
    SELECT qr.email INTO v_customer_email
    FROM quote_requests qr
    WHERE qr.id = v_quote.request_id;

    -- Create deposit payment record
    -- The create-deposit-invoice edge function picks this up
    -- to actually create the Square invoice
    INSERT INTO payments (
      quote_id,
      payment_type,
      status,
      amount,
      customer_email,
      delivery_date
    ) VALUES (
      NEW.quote_id,
      'deposit',
      'pending',
      COALESCE(v_quote.deposit_amount, v_quote.total * 0.25),
      COALESCE(v_customer_email, 'unknown@pending.com'),
      now()
    );

    -- Also create the balance payment (Net 15)
    INSERT INTO payments (
      quote_id,
      payment_type,
      status,
      amount,
      customer_email,
      due_date,
      delivery_date
    ) VALUES (
      NEW.quote_id,
      'balance',
      'pending',
      v_quote.total - COALESCE(v_quote.deposit_amount, v_quote.total * 0.25),
      COALESCE(v_customer_email, 'unknown@pending.com'),
      now() + interval '15 days',
      now()
    );

    RAISE LOG '[auto-trigger] Job % delivered → deposit + balance payments created for quote %', NEW.id, NEW.quote_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drone_job_delivered ON public.drone_jobs;
CREATE TRIGGER trg_drone_job_delivered
  AFTER UPDATE OF status ON public.drone_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION public.on_drone_job_delivered();

COMMENT ON TRIGGER trg_drone_job_delivered ON public.drone_jobs IS
  'Auto-creates deposit + balance payment records when a job is delivered. Deposit = 25% (or quote.deposit_amount). Balance = remainder, Net 15.';
