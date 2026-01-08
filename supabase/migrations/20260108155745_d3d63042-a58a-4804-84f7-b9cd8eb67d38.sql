-- Create shared document number generator utility function
CREATE OR REPLACE FUNCTION public.generate_document_number(
  p_prefix TEXT,
  p_table_name TEXT,
  p_column_name TEXT,
  p_padding INT DEFAULT 4
)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  year_part TEXT;
  sequence_num INT;
  new_number TEXT;
  query_text TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  -- Build dynamic query to find max sequence for the year
  query_text := format(
    'SELECT COALESCE(MAX(
      CAST(SUBSTRING(%I FROM %L) AS INT)
    ), 0) + 1
    FROM public.%I
    WHERE %I LIKE %L',
    p_column_name,
    p_prefix || '-' || year_part || '-(\d+)',
    p_table_name,
    p_column_name,
    p_prefix || '-' || year_part || '-%'
  );
  
  EXECUTE query_text INTO sequence_num;
  
  new_number := p_prefix || '-' || year_part || '-' || LPAD(sequence_num::TEXT, p_padding, '0');
  RETURN new_number;
END;
$$;

-- Refactor proposal number generator (now with 4-digit padding)
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TEXT
LANGUAGE sql
SET search_path = public
AS $$
  SELECT generate_document_number('FH', 'proposals', 'proposal_number', 4);
$$;

-- Refactor invoice number generator
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE sql
SET search_path = public
AS $$
  SELECT generate_document_number('INV', 'invoices', 'invoice_number', 4);
$$;

-- Refactor project number generator
CREATE OR REPLACE FUNCTION public.generate_project_number()
RETURNS TEXT
LANGUAGE sql
SET search_path = public
AS $$
  SELECT generate_document_number('PRJ', 'projects', 'project_number', 4);
$$;

-- Refactor drone job number generator
CREATE OR REPLACE FUNCTION public.generate_drone_job_number()
RETURNS TEXT
LANGUAGE sql
SET search_path = public
AS $$
  SELECT generate_document_number('DJ', 'drone_jobs', 'job_number', 4);
$$;

-- Refactor ticket number generator
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE sql
SET search_path = public
AS $$
  SELECT generate_document_number('TKT', 'maintenance_tickets', 'ticket_number', 4);
$$;

-- Drop unused sequence
DROP SEQUENCE IF EXISTS project_number_seq;