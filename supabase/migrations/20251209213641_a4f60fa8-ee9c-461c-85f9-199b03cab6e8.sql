-- Create proposal status enum
CREATE TYPE public.proposal_status AS ENUM ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired', 'revision_requested');

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE NOT NULL,
  proposal_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  scope_of_work TEXT NOT NULL,
  deliverables JSONB DEFAULT '[]'::jsonb,
  pricing_items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  valid_until DATE NOT NULL,
  terms_and_conditions TEXT,
  status proposal_status DEFAULT 'draft'::proposal_status,
  approval_token TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  customer_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage proposals"
ON public.proposals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view proposals by token"
ON public.proposals
FOR SELECT
USING (approval_token IS NOT NULL);

CREATE POLICY "Public can update proposal status by token"
ON public.proposals
FOR UPDATE
USING (approval_token IS NOT NULL)
WITH CHECK (approval_token IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  sequence_num INT;
  new_number TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(proposal_number FROM 'FH-' || year_part || '-(\d+)') AS INT)
  ), 0) + 1
  INTO sequence_num
  FROM public.proposals
  WHERE proposal_number LIKE 'FH-' || year_part || '-%';
  
  new_number := 'FH-' || year_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  RETURN new_number;
END;
$$;