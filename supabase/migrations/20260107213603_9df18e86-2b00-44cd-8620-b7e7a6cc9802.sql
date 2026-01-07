-- Backfill invoices for approved proposals missing invoices
DO $$
DECLARE
  r RECORD;
  v_customer_id UUID;
  v_payment_terms TEXT;
  v_due_days INTEGER := 14;
BEGIN
  FOR r IN 
    SELECT p.*, sr.client_name, sr.client_email, sr.client_phone, sr.company_name
    FROM proposals p
    JOIN service_requests sr ON sr.id = p.service_request_id
    LEFT JOIN invoices i ON i.proposal_id = p.id
    WHERE p.status IN ('approved', 'sent') 
      AND p.approved_at IS NOT NULL
      AND i.id IS NULL
  LOOP
    -- Get or create customer
    SELECT id INTO v_customer_id FROM customers WHERE email = r.client_email;
    
    IF v_customer_id IS NULL THEN
      INSERT INTO customers (name, email, phone, company_name)
      VALUES (r.client_name, r.client_email, r.client_phone, r.company_name)
      RETURNING id INTO v_customer_id;
    END IF;
    
    -- Determine payment terms based on total
    IF r.total < 500 THEN
      v_payment_terms := 'Net 14 - Payment due within 14 days of invoice';
    ELSIF r.total < 2000 THEN
      v_payment_terms := '50% Deposit Required - 50% deposit due now, remainder upon completion';
    ELSE
      v_payment_terms := 'Milestone Payments - 50% deposit, 25% at midpoint, 25% upon completion';
    END IF;
    
    -- Create the invoice as SENT (auto-send)
    INSERT INTO invoices (
      invoice_number,
      proposal_id,
      customer_id,
      status,
      issue_date,
      due_date,
      subtotal,
      discount,
      total,
      payment_terms,
      line_items,
      notes,
      sent_at
    ) VALUES (
      generate_invoice_number(),
      r.id,
      v_customer_id,
      'sent',
      CURRENT_DATE,
      CURRENT_DATE + v_due_days,
      r.subtotal,
      r.discount,
      r.total,
      v_payment_terms,
      r.pricing_items,
      'Invoice generated from approved proposal ' || r.proposal_number,
      now()
    );
    
    RAISE NOTICE 'Created invoice for proposal %', r.proposal_number;
  END LOOP;
END $$;