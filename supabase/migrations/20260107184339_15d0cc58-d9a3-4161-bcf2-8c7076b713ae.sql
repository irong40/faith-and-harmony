
-- Create invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC GENERATED ALWAYS AS (total - COALESCE(amount_paid, 0)) STORED,
  payment_terms TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  admin_notes TEXT,
  view_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  customer_payment_claim JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast token lookups
CREATE INDEX idx_invoices_view_token ON public.invoices(view_token);
CREATE INDEX idx_invoices_proposal_id ON public.invoices(proposal_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- Create invoice number generator function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';
  
  new_number := 'INV-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for invoice creation on proposal approval
CREATE OR REPLACE FUNCTION public.create_invoice_from_approved_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_payment_terms TEXT;
  v_due_days INTEGER;
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
    
    -- Create the draft invoice
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
      notes
    ) VALUES (
      generate_invoice_number(),
      NEW.id,
      v_customer_id,
      'draft',
      CURRENT_DATE,
      CURRENT_DATE + v_due_days,
      NEW.subtotal,
      NEW.discount,
      NEW.total,
      v_payment_terms,
      NEW.pricing_items,
      'Invoice generated from approved proposal ' || NEW.proposal_number
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on proposals table
CREATE TRIGGER on_proposal_approved_create_invoice
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_invoice_from_approved_proposal();

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage invoices"
  ON public.invoices
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view invoices by token"
  ON public.invoices
  FOR SELECT
  USING (view_token IS NOT NULL);

CREATE POLICY "Public can update invoice payment claim by token"
  ON public.invoices
  FOR UPDATE
  USING (view_token IS NOT NULL)
  WITH CHECK (view_token IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
