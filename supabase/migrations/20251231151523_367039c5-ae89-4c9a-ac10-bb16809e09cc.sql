-- Create enums for lead status and engagement types
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'responded', 'qualified', 'client');
CREATE TYPE public.engagement_type AS ENUM ('turnover', 'inspection', 'quarterly', 'project', 'storm', 'marketing');
CREATE TYPE public.engagement_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.outreach_contact_method AS ENUM ('email', 'call', 'linkedin', 'meeting', 'other');
CREATE TYPE public.outreach_outcome AS ENUM ('no_answer', 'voicemail', 'spoke', 'email_sent', 'meeting_scheduled', 'not_interested');
CREATE TYPE public.lead_gen_job_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create drone_leads table
CREATE TABLE public.drone_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'VA',
  portfolio_type TEXT,
  estimated_portfolio_size INTEGER,
  google_rating NUMERIC(2,1),
  review_count INTEGER,
  serper_place_id TEXT,
  hunter_io_score INTEGER,
  email_status TEXT,
  ai_email_subject TEXT,
  ai_email_body TEXT,
  status public.lead_status NOT NULL DEFAULT 'new',
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create drone_engagements table
CREATE TABLE public.drone_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.drone_leads(id) ON DELETE CASCADE,
  engagement_date DATE NOT NULL,
  property_address TEXT,
  engagement_type public.engagement_type NOT NULL,
  status public.engagement_status NOT NULL DEFAULT 'scheduled',
  quoted_price NUMERIC(10,2),
  actual_revenue NUMERIC(10,2),
  cost NUMERIC(10,2),
  photo_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  delivery_date DATE,
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create outreach_log table
CREATE TABLE public.outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.drone_leads(id) ON DELETE CASCADE,
  contact_method public.outreach_contact_method NOT NULL,
  outcome public.outreach_outcome,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lead_gen_jobs table
CREATE TABLE public.lead_gen_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL DEFAULT 'manual',
  search_config JSONB,
  status public.lead_gen_job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  searches_performed INTEGER DEFAULT 0,
  raw_results_found INTEGER DEFAULT 0,
  duplicates_filtered INTEGER DEFAULT 0,
  emails_found INTEGER DEFAULT 0,
  ai_drafts_generated INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  serper_cost NUMERIC(10,4) DEFAULT 0,
  hunter_io_cost NUMERIC(10,4) DEFAULT 0,
  openai_cost NUMERIC(10,4) DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.drone_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_gen_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drone_leads
CREATE POLICY "Admins can manage drone leads"
  ON public.drone_leads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for drone_engagements
CREATE POLICY "Admins can manage drone engagements"
  ON public.drone_engagements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for outreach_log
CREATE POLICY "Admins can manage outreach log"
  ON public.outreach_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lead_gen_jobs
CREATE POLICY "Admins can manage lead gen jobs"
  ON public.lead_gen_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at triggers
CREATE TRIGGER update_drone_leads_updated_at
  BEFORE UPDATE ON public.drone_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drone_engagements_updated_at
  BEFORE UPDATE ON public.drone_engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for pipeline summary
CREATE VIEW public.drone_pipeline_summary AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as new_this_week
FROM public.drone_leads
GROUP BY status;

-- Create view for client summary
CREATE VIEW public.drone_client_summary AS
SELECT
  dl.id,
  dl.company_name,
  dl.city,
  dl.portfolio_type,
  COUNT(de.id) as total_engagements,
  COUNT(de.id) FILTER (WHERE de.engagement_date > now() - interval '30 days') as engagements_this_month,
  SUM(de.actual_revenue) as total_revenue,
  AVG(de.satisfaction_score) as avg_satisfaction,
  MAX(de.engagement_date) as last_engagement,
  MIN(de.engagement_date) FILTER (WHERE de.status = 'scheduled' AND de.engagement_date >= CURRENT_DATE) as next_scheduled
FROM public.drone_leads dl
LEFT JOIN public.drone_engagements de ON de.lead_id = dl.id
WHERE dl.status = 'client'
GROUP BY dl.id, dl.company_name, dl.city, dl.portfolio_type;