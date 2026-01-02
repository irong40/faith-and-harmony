-- Create storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('generated-documents', 'generated-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for generated-documents bucket
CREATE POLICY "Admins can manage generated documents"
ON storage.objects FOR ALL
USING (bucket_id = 'generated-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own generated documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create document_templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  output_format TEXT NOT NULL DEFAULT 'pdf',
  schema JSONB NOT NULL DEFAULT '{}',
  template_config JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_templates
CREATE POLICY "Anyone can view active templates"
ON public.document_templates FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage templates"
ON public.document_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create generated_documents log table
CREATE TABLE public.generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.document_templates(id),
  template_code TEXT NOT NULL,
  user_id UUID,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  output_format TEXT NOT NULL,
  input_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for generated_documents
CREATE POLICY "Users can view their own documents"
ON public.generated_documents FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create documents"
ON public.generated_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all documents"
ON public.generated_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert system templates
INSERT INTO public.document_templates (code, name, description, category, output_format, schema, template_config, is_system) VALUES
('invoice', 'Invoice', 'Generate professional invoice PDFs for orders', 'financial', 'pdf', 
  '{"order_id": {"type": "string", "required": true}, "include_logo": {"type": "boolean", "default": true}}'::jsonb,
  '{"header": "Faith & Harmony LLC", "footer": "Thank you for your business!"}'::jsonb, true),

('coa', 'Certificate of Analysis', 'Hemp/CBD product analysis certificate', 'compliance', 'pdf',
  '{"product_name": {"type": "string", "required": true}, "batch_number": {"type": "string", "required": true}, "test_results": {"type": "object"}}'::jsonb,
  '{"template_style": "certificate"}'::jsonb, true),

('inventory-export', 'Inventory Export', 'Export current inventory to spreadsheet', 'inventory', 'xlsx',
  '{"category": {"type": "string"}, "include_inactive": {"type": "boolean", "default": false}}'::jsonb,
  '{"sheets": ["Products", "Summary"]}'::jsonb, true),

('order-summary', 'Order Summary', 'Summarized order report for a date range', 'financial', 'pdf',
  '{"start_date": {"type": "string", "format": "date", "required": true}, "end_date": {"type": "string", "format": "date", "required": true}}'::jsonb,
  '{"include_charts": true}'::jsonb, true),

('drone-proposal', 'Drone Service Proposal', 'Professional proposal for drone photography services', 'sales', 'docx',
  '{"client_name": {"type": "string", "required": true}, "property_address": {"type": "string", "required": true}, "package_id": {"type": "string"}, "custom_notes": {"type": "string"}}'::jsonb,
  '{"template_style": "professional"}'::jsonb, true),

('photo-manifest', 'Photo Delivery Manifest', 'Manifest of delivered drone photos for a job', 'drone', 'pdf',
  '{"job_id": {"type": "string", "required": true}}'::jsonb,
  '{"include_thumbnails": true}'::jsonb, true),

('member-report', 'Member Report', 'Membership and activity report', 'organization', 'xlsx',
  '{"organization_type": {"type": "string", "enum": ["church", "masonic", "oes"]}, "date_range": {"type": "string"}}'::jsonb,
  '{"sheets": ["Members", "Activity", "Summary"]}'::jsonb, true),

('quarterly-report', 'Quarterly District Report', 'Quarterly summary report for district leadership', 'organization', 'pdf',
  '{"quarter": {"type": "integer", "minimum": 1, "maximum": 4, "required": true}, "year": {"type": "integer", "required": true}, "district": {"type": "string"}}'::jsonb,
  '{"include_financials": true, "include_membership": true}'::jsonb, true),

('data-export', 'Generic Data Export', 'Export any data table to CSV', 'utility', 'csv',
  '{"table_name": {"type": "string", "required": true}, "columns": {"type": "array"}, "filters": {"type": "object"}}'::jsonb,
  '{"delimiter": ",", "include_headers": true}'::jsonb, true);

-- Update trigger for document_templates
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();