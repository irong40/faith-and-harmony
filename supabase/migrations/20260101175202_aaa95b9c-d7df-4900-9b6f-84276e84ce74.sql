-- Add review_pending status to drone_job_status enum
ALTER TYPE drone_job_status ADD VALUE IF NOT EXISTS 'review_pending' AFTER 'processing';

-- Add compass_direction to drone_assets for construction labeling
ALTER TABLE drone_assets ADD COLUMN IF NOT EXISTS compass_direction text;

-- Add download_url to drone_jobs for final ZIP delivery URL
ALTER TABLE drone_jobs ADD COLUMN IF NOT EXISTS download_url text;

-- Create jobs view for n8n compatibility (matches n8n workflow queries)
CREATE OR REPLACE VIEW jobs AS
SELECT 
  j.id,
  j.job_number,
  j.property_address as project_name,
  j.status::text as status,
  j.package_id,
  j.scheduled_date,
  j.delivered_at,
  j.qa_score,
  j.download_url,
  j.created_at,
  j.updated_at,
  c.email as client_email,
  c.name as client_name,
  c.phone as client_phone
FROM drone_jobs j
LEFT JOIN customers c ON j.customer_id = c.id;

-- Create packages view for n8n compatibility
CREATE OR REPLACE VIEW packages AS
SELECT 
  id,
  name,
  code,
  price,
  edit_budget_minutes,
  shot_manifest,
  processing_profile,
  features,
  category,
  description,
  active
FROM drone_packages;

-- Update drone_packages processing_profile preset names to match actual Lightroom presets
UPDATE drone_packages
SET processing_profile = jsonb_set(
  COALESCE(processing_profile, '{}'::jsonb),
  '{preset}',
  '"Drone_Basic_v1"'
)
WHERE code = 'PHOTO_495';

UPDATE drone_packages
SET processing_profile = jsonb_set(
  COALESCE(processing_profile, '{}'::jsonb),
  '{preset}',
  '"Drone_Standard_v1"'
)
WHERE code = 'PHOTO_VIDEO_795';

UPDATE drone_packages
SET processing_profile = jsonb_set(
  jsonb_set(
    COALESCE(processing_profile, '{}'::jsonb),
    '{preset}',
    '"Drone_Premium_v1"'
  ),
  '{sky_replacement}',
  '{"enabled": true, "review_gate": true}'
)
WHERE code = 'PREMIUM_1250';

UPDATE drone_packages
SET processing_profile = jsonb_set(
  jsonb_set(
    COALESCE(processing_profile, '{}'::jsonb),
    '{preset}',
    '"Drone_Construction_v1"'
  ),
  '{labeling}',
  '{"enabled": true, "format": "COMPASS • PROJECT • DATE", "font": "Arial Bold", "bar_opacity": 70, "bar_height_percent": 5}'
)
WHERE code = 'PROGRESS_800';