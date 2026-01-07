-- Update the trigger function to auto-send invoices instead of keeping as draft
CREATE OR REPLACE FUNCTION public.create_invoice_from_approved_proposal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_payment_terms TEXT;
  v_due_days INTEGER;
  v_invoice_id UUID;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Get or create customer from service request
    SELECT id INTO v_customer_id
    FROM public.customers c
    WHERE c.email = (
      SELECT sr.client_email 
      FROM public.service_requests sr 
      WHERE sr.id = NEW.service_request_id
    );
    
    -- If no customer exists, create one
    IF v_customer_id IS NULL THEN
      INSERT INTO public.customers (name, email, phone, company_name)
      SELECT sr.client_name, sr.client_email, sr.client_phone, sr.company_name
      FROM public.service_requests sr
      WHERE sr.id = NEW.service_request_id
      RETURNING id INTO v_customer_id;
    END IF;
    
    -- Determine payment terms based on total
    IF NEW.total < 500 THEN
      v_payment_terms := 'Net 14 - Payment due within 14 days of invoice';
      v_due_days := 14;
    ELSIF NEW.total < 2000 THEN
      v_payment_terms := '50% Deposit Required - 50% deposit due now, remainder upon completion';
      v_due_days := 14;
    ELSE
      v_payment_terms := 'Milestone Payments - 50% deposit, 25% at midpoint, 25% upon completion';
      v_due_days := 14;
    END IF;
    
    -- Create the invoice as SENT (auto-send)
    INSERT INTO public.invoices (
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
      NEW.id,
      v_customer_id,
      'sent',
      CURRENT_DATE,
      CURRENT_DATE + v_due_days,
      NEW.subtotal,
      NEW.discount,
      NEW.total,
      v_payment_terms,
      NEW.pricing_items,
      'Invoice generated from approved proposal ' || NEW.proposal_number,
      now()
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;