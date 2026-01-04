-- 1. Enable pgcrypto extension for API key generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Package selection function
CREATE OR REPLACE FUNCTION public.select_drone_package_for_proposal(
  p_work_category TEXT,
  p_proposal_total NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_package_id UUID;
BEGIN
  IF p_work_category = 'construction' THEN
    SELECT id INTO v_package_id FROM drone_packages 
    WHERE category = 'construction' AND active = true 
    LIMIT 1;
    RETURN v_package_id;
  END IF;
  
  SELECT id INTO v_package_id FROM drone_packages
  WHERE category = 'real_estate' AND active = true
  ORDER BY ABS(price - p_proposal_total)
  LIMIT 1;
  
  RETURN v_package_id;
END;
$$;

-- 3. Customer upsert function
CREATE OR REPLACE FUNCTION public.upsert_customer_from_service_request(p_sr_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id UUID;
  v_sr RECORD;
BEGIN
  SELECT client_name, client_email, client_phone, company_name
  INTO v_sr
  FROM service_requests
  WHERE id = p_sr_id;
  
  SELECT id INTO v_customer_id
  FROM customers
  WHERE email = v_sr.client_email;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, email, phone, company_name)
    VALUES (v_sr.client_name, v_sr.client_email, v_sr.client_phone, v_sr.company_name)
    RETURNING id INTO v_customer_id;
  END IF;
  
  RETURN v_customer_id;
END;
$$;

-- 4. Main trigger function
CREATE OR REPLACE FUNCTION public.create_drone_job_from_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sr RECORD;
  v_service_code TEXT;
  v_customer_id UUID;
  v_package_id UUID;
  v_work_category TEXT;
  v_property_address TEXT;
  v_shoot_date DATE;
  v_existing_job UUID;
BEGIN
  IF NEW.status != 'approved' OR (OLD.status = 'approved') THEN
    RETURN NEW;
  END IF;
  
  SELECT sr.*, s.code as service_code
  INTO v_sr
  FROM service_requests sr
  LEFT JOIN services s ON sr.service_id = s.id
  WHERE sr.id = NEW.service_request_id;
  
  IF v_sr.service_code IS NULL OR v_sr.service_code != 'AERIAL' THEN
    RETURN NEW;
  END IF;
  
  SELECT id INTO v_existing_job
  FROM drone_jobs
  WHERE service_request_id = NEW.service_request_id;
  
  IF v_existing_job IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  v_work_category := COALESCE(v_sr.metadata->>'workCategory', 'real_estate');
  v_property_address := COALESCE(
    v_sr.metadata->>'propertyAddress',
    'Address pending - ' || v_sr.client_name
  );
  v_shoot_date := (v_sr.metadata->>'shootDatePreference')::DATE;
  
  v_customer_id := upsert_customer_from_service_request(NEW.service_request_id);
  v_package_id := select_drone_package_for_proposal(v_work_category, NEW.total);
  
  INSERT INTO drone_jobs (
    customer_id,
    service_request_id,
    package_id,
    status,
    property_address,
    property_type,
    scheduled_date,
    admin_notes
  ) VALUES (
    v_customer_id,
    NEW.service_request_id,
    v_package_id,
    'intake',
    v_property_address,
    v_work_category,
    v_shoot_date,
    'Auto-created from approved proposal ' || NEW.proposal_number
  );
  
  RETURN NEW;
END;
$$;

-- 5. Database trigger
DROP TRIGGER IF EXISTS on_proposal_approved ON proposals;
CREATE TRIGGER on_proposal_approved
  AFTER UPDATE ON proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved')
  EXECUTE FUNCTION create_drone_job_from_proposal();

-- 6. Backfill Roger Dodger (check if exists first, insert if not)
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Find or create customer
  SELECT id INTO v_customer_id FROM customers WHERE email = 'dradamopierce@gmail.com';
  
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, email, phone, company_name)
    VALUES ('Roger Dodger', 'dradamopierce@gmail.com', '7605754876', 'Rogers Construction')
    RETURNING id INTO v_customer_id;
  END IF;
  
  -- Create drone job if not exists
  IF NOT EXISTS (SELECT 1 FROM drone_jobs WHERE service_request_id = '1f0f87cd-d2a9-4d46-8168-1d06ee14aae1'::UUID) THEN
    INSERT INTO drone_jobs (
      customer_id,
      service_request_id,
      package_id,
      status,
      property_address,
      property_type,
      scheduled_date,
      admin_notes
    ) VALUES (
      v_customer_id,
      '1f0f87cd-d2a9-4d46-8168-1d06ee14aae1'::UUID,
      '26c3e1b2-2a85-4fbc-b7b5-7414ae4482b0'::UUID,
      'intake',
      'Address pending - Roger Dodger',
      'real_estate',
      '2026-01-03'::DATE,
      'Auto-created from approved proposal FH-2026-001 (backfill)'
    );
  END IF;
END;
$$;