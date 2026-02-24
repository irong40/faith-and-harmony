-- Extend processing_templates for Sentinel 6-path pipeline model
-- Adds path_code, display_name, description, default_steps columns
-- Seeds all 6 processing paths (A, B, C, D, V, B+C)
-- Phase 1: Strip & Rebrand

-- Add new columns to support path-based routing
ALTER TABLE processing_templates
  ADD COLUMN IF NOT EXISTS path_code TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS default_steps JSONB DEFAULT '[]'::jsonb;

-- Unique path code per active template
CREATE UNIQUE INDEX IF NOT EXISTS idx_processing_templates_path_code
  ON processing_templates (path_code)
  WHERE path_code IS NOT NULL AND active = true;

-- Seed the 6 pipeline processing paths
-- These reference drone_packages by code where a package exists,
-- or use a dedicated null-package row for paths without a package counterpart.
-- Path A: Real Estate Photos
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT
  dp.id,
  'A',
  'RE Photos',
  'Standard real estate photography processing — Lightroom edit, QA gate, web export',
  're_basic',
  65,
  false,
  false,
  'RE_Basic_v2',
  'jpg_web',
  true,
  '["ingest", "qa", "lightroom_edit", "export_web", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'PHOTO_495'
ON CONFLICT DO NOTHING;

-- Path B: Construction Progress
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT
  dp.id,
  'B',
  'Construction Progress',
  'Construction site progress documentation — orthomosaic, date-stamped archive',
  'construction',
  60,
  false,
  false,
  'Construction_v1',
  'jpg_web',
  true,
  '["ingest", "qa", "lightroom_edit", "export_web", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'PROGRESS_800'
ON CONFLICT DO NOTHING;

-- Path C: Mapping/WebODM
-- No direct package match — insert without package_id
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT NULL, 'C', 'Mapping/WebODM', 'Photogrammetry processing via WebODM — orthomosaic, point cloud, 3D mesh',
  'mapping', 70, false, false, NULL, 'geotiff', true,
  '["ingest", "qa", "webodm_process", "export_ortho", "delivery"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM processing_templates WHERE path_code = 'C'
);

-- Path D: ADIAT (As-Delivered Inspection & Aerial Tour)
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT NULL, 'D', 'ADIAT', 'Inspection and aerial tour — annotated report, grid photography, exportable data',
  'adiat', 80, true, false, 'Inspection_v1', 'jpg_hq', true,
  '["ingest", "qa", "adiat_review", "annotate", "export_hq", "delivery"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM processing_templates WHERE path_code = 'D'
);

-- Path V: Video
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT NULL, 'V', 'Video', 'Cinematic video processing — color grade, proxy generation, DaVinci Resolve export',
  'video', 70, false, false, NULL, 'mp4_4k', true,
  '["ingest", "color_grade", "proxy_gen", "qa", "export_video", "delivery"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM processing_templates WHERE path_code = 'V'
);

-- Path B+C: Hybrid (Construction + Mapping)
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT NULL, 'B+C', 'Construction + Mapping', 'Combined construction progress and photogrammetry mapping run',
  'hybrid_bc', 65, false, false, 'Construction_v1', 'jpg_web', true,
  '["ingest", "qa", "lightroom_edit", "webodm_process", "export_web", "export_ortho", "delivery"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM processing_templates WHERE path_code = 'B+C'
);
