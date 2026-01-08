-- Create project status enum
CREATE TYPE project_status AS ENUM (
  'kickoff', 'in_progress', 'review', 
  'revision', 'complete', 'on_hold', 'cancelled'
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT UNIQUE NOT NULL,
  proposal_id UUID REFERENCES proposals(id),
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  title TEXT NOT NULL,
  status project_status DEFAULT 'kickoff',
  description TEXT,
  admin_notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage projects"
ON public.projects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create sequence for project numbers
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1;

-- Function to generate project number
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_part TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  seq_part := lpad(nextval('project_number_seq')::TEXT, 4, '0');
  RETURN 'PRJ-' || year_part || '-' || seq_part;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate project number
CREATE OR REPLACE FUNCTION set_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := generate_project_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_project_number
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION set_project_number();

-- Trigger to update updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create project from approved proposal (for non-Aerial services)
CREATE OR REPLACE FUNCTION create_project_from_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_service_code TEXT;
  v_customer_id UUID;
  v_service_id UUID;
  v_title TEXT;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get service code from service request
    SELECT s.code, s.id INTO v_service_code, v_service_id
    FROM service_requests sr
    JOIN services s ON s.id = sr.service_id
    WHERE sr.id = NEW.service_request_id;
    
    -- Skip if Aerial (handled by drone_jobs)
    IF v_service_code = 'AERIAL' THEN
      RETURN NEW;
    END IF;
    
    -- Get or create customer
    SELECT id INTO v_customer_id
    FROM customers
    WHERE email = (SELECT client_email FROM service_requests WHERE id = NEW.service_request_id)
    LIMIT 1;
    
    -- Get title from service request
    SELECT COALESCE(project_title, 'Project') INTO v_title
    FROM service_requests
    WHERE id = NEW.service_request_id;
    
    -- Create project
    INSERT INTO projects (
      proposal_id,
      customer_id,
      service_id,
      title,
      status,
      description,
      started_at
    ) VALUES (
      NEW.id,
      v_customer_id,
      v_service_id,
      v_title,
      'kickoff',
      NEW.scope_of_work,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for project creation
CREATE TRIGGER trigger_create_project_from_proposal
AFTER UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION create_project_from_proposal();