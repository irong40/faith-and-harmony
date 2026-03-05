-- =====================================================
-- Path E: Vegetation Analysis schema additions
-- vegetation_detections + vegetation_analysis_summary tables
-- already exist in the database. This migration only adds:
--   1. drone_jobs columns needed by the Path E n8n workflow
--   2. Any missing columns on existing vegetation tables
--   3. Processing template entry for path_code = 'E'
-- =====================================================

-- ---------------------------------------------------
-- drone_jobs columns (read/written by Path E workflow)
-- vegetation_analysis and vegetation_status already exist.
-- Only output_path and processing_job_id are missing.
-- ---------------------------------------------------
ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS output_path TEXT,
  ADD COLUMN IF NOT EXISTS processing_job_id UUID REFERENCES public.processing_jobs(id);

COMMENT ON COLUMN public.drone_jobs.output_path IS 'Base path to mission output on E:\ drive (ortho at {output_path}\mapping\orthomosaic.tif)';
COMMENT ON COLUMN public.drone_jobs.processing_job_id IS 'FK to processing_jobs, used by Python scripts';

-- ---------------------------------------------------
-- Add any missing columns to existing vegetation_detections
-- (table already has: id, mission_id, detection_index,
--  geometry_wkt, centroid_lat/lon, canopy_*, species_*,
--  health_score, health_status, etc.)
-- ---------------------------------------------------
ALTER TABLE public.vegetation_detections
  ADD COLUMN IF NOT EXISTS processing_job_id UUID REFERENCES public.processing_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS excluded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_vegetation_detections_processing_job
  ON public.vegetation_detections(processing_job_id);

-- ---------------------------------------------------
-- Processing template for Path E
-- ---------------------------------------------------
INSERT INTO public.processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT
  NULL,
  'E',
  'Vegetation Analysis',
  'Vegetation detection, species classification, health assessment, and report generation',
  'vegetation',
  75,
  false,
  false,
  NULL,
  'geotiff',
  true,
  '["canopy_detection", "species_classification", "health_assessment", "report_generation"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.processing_templates WHERE path_code = 'E'
);
