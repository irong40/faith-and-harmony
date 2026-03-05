-- Phase 1: Bridge the quote-to-drone_job gap
-- Adds preferred_date to quote_requests, quote_id FK to drone_jobs,
-- and a function to create a drone_job when a quote is accepted.

-- 1. Add preferred_date column to quote_requests (was being buried in description text)
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS preferred_date DATE;

-- 2. Add quote_id FK to drone_jobs (links quotes to jobs, parallel to service_request_id for proposals)
ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_drone_jobs_quote_id ON public.drone_jobs(quote_id);

-- 3. Customer upsert from quote_request (mirrors upsert_customer_from_service_request)
CREATE OR REPLACE FUNCTION public.upsert_customer_from_quote_request(p_qr_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id UUID;
  v_qr RECORD;
BEGIN
  SELECT name, email, phone
  INTO v_qr
  FROM quote_requests
  WHERE id = p_qr_id;

  IF v_qr.email IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE email = v_qr.email;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, email, phone)
    VALUES (v_qr.name, v_qr.email, v_qr.phone)
    RETURNING id INTO v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$;

-- 4. Create drone_job from accepted quote
CREATE OR REPLACE FUNCTION public.create_drone_job_from_quote(p_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quote RECORD;
  v_qr RECORD;
  v_customer_id UUID;
  v_package_id UUID;
  v_job_id UUID;
  v_existing_job UUID;
BEGIN
  -- Get quote + quote_request data
  SELECT q.id, q.request_id, q.total, q.line_items, q.notes
  INTO v_quote
  FROM quotes q
  WHERE q.id = p_quote_id;

  IF v_quote IS NULL THEN
    RAISE EXCEPTION 'Quote % not found', p_quote_id;
  END IF;

  -- Check if drone_job already exists for this quote
  SELECT id INTO v_existing_job
  FROM drone_jobs
  WHERE quote_id = p_quote_id;

  IF v_existing_job IS NOT NULL THEN
    RETURN v_existing_job;
  END IF;

  -- Get quote_request details
  SELECT qr.id, qr.name, qr.email, qr.phone, qr.address, qr.job_type, qr.preferred_date
  INTO v_qr
  FROM quote_requests qr
  WHERE qr.id = v_quote.request_id;

  -- Upsert customer
  v_customer_id := upsert_customer_from_quote_request(v_quote.request_id);

  -- Best-effort package match by job_type
  SELECT id INTO v_package_id
  FROM drone_packages
  WHERE active = true
    AND (
      category = v_qr.job_type
      OR code = v_qr.job_type
    )
  ORDER BY ABS(price - v_quote.total)
  LIMIT 1;

  -- Fallback: cheapest active package
  IF v_package_id IS NULL THEN
    SELECT id INTO v_package_id
    FROM drone_packages
    WHERE active = true
    ORDER BY price
    LIMIT 1;
  END IF;

  -- Create the drone_job
  INSERT INTO drone_jobs (
    customer_id,
    quote_id,
    package_id,
    status,
    property_address,
    scheduled_date,
    job_price,
    admin_notes
  ) VALUES (
    v_customer_id,
    p_quote_id,
    v_package_id,
    'intake',
    COALESCE(v_qr.address, 'Address pending - ' || v_qr.name),
    v_qr.preferred_date,
    (v_quote.total * 100)::INTEGER,  -- quotes store dollars, drone_jobs store cents
    'Auto-created from accepted quote'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;
