-- Sentinel Pipeline Orchestrator schema
-- New tables, drone_assets extensions, seed data, and RLS

-- ============================================================
-- processing_templates: pipeline config per package
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES drone_packages(id),
  preset_name TEXT NOT NULL,
  adiat_enabled BOOLEAN DEFAULT false,
  qa_threshold INTEGER DEFAULT 70,
  qa_api_threshold_low INTEGER DEFAULT 60,
  qa_api_threshold_high INTEGER DEFAULT 85,
  shot_requirements JSONB DEFAULT '[]'::jsonb,
  raw_workflow BOOLEAN DEFAULT false,
  lightroom_preset TEXT,
  output_format TEXT DEFAULT 'jpg_web',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one active template per package
CREATE UNIQUE INDEX IF NOT EXISTS idx_processing_templates_active_package
  ON processing_templates (package_id)
  WHERE active = true;

-- ============================================================
-- processing_steps: per-step execution tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES drone_jobs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'running', 'complete', 'failed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  items_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processing_steps_mission
  ON processing_steps (mission_id, step_order);

-- ============================================================
-- delivery_log: output packaging records
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES drone_jobs(id) ON DELETE CASCADE,
  output_path TEXT NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  file_count INTEGER,
  total_size_bytes BIGINT,
  recipient_email TEXT,
  notification_sent BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_mission
  ON delivery_log (mission_id);

-- ============================================================
-- Extend drone_assets with pipeline columns
-- ============================================================
ALTER TABLE drone_assets
  ADD COLUMN IF NOT EXISTS media_format TEXT,
  ADD COLUMN IF NOT EXISTS compass_bearing NUMERIC,
  ADD COLUMN IF NOT EXISTS lr_exported_path TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_excluded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coverage_tag TEXT;

-- ============================================================
-- updated_at trigger for processing_templates
-- ============================================================
CREATE OR REPLACE FUNCTION update_processing_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_processing_templates_updated_at ON processing_templates;
CREATE TRIGGER set_processing_templates_updated_at
  BEFORE UPDATE ON processing_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_processing_templates_updated_at();

-- ============================================================
-- Seed processing_templates
-- ============================================================
INSERT INTO processing_templates (package_id, preset_name, qa_threshold, adiat_enabled, raw_workflow, lightroom_preset, output_format, shot_requirements)
SELECT dp.id, 'basic', 65, false, false, 'RE_Basic_v2', 'jpg_web', '[]'::jsonb
FROM drone_packages dp WHERE dp.code = 'PHOTO_495'
ON CONFLICT DO NOTHING;

INSERT INTO processing_templates (package_id, preset_name, qa_threshold, adiat_enabled, raw_workflow, lightroom_preset, output_format, shot_requirements)
SELECT dp.id, 'standard', 70, true, false, 'RE_Standard_v2', 'jpg_web', '[]'::jsonb
FROM drone_packages dp WHERE dp.code = 'PHOTO_VIDEO_795'
ON CONFLICT DO NOTHING;

INSERT INTO processing_templates (package_id, preset_name, qa_threshold, adiat_enabled, raw_workflow, lightroom_preset, output_format, shot_requirements)
SELECT dp.id, 'premium', 80, true, true, 'RE_Premium_v2', 'jpg_hq', '[]'::jsonb
FROM drone_packages dp WHERE dp.code = 'PREMIUM_1250'
ON CONFLICT DO NOTHING;

INSERT INTO processing_templates (package_id, preset_name, qa_threshold, adiat_enabled, raw_workflow, lightroom_preset, output_format, shot_requirements)
SELECT dp.id, 'construction', 60, false, false, 'Construction_v1', 'jpg_web', '[]'::jsonb
FROM drone_packages dp WHERE dp.code = 'PROGRESS_800'
ON CONFLICT DO NOTHING;

-- ============================================================
-- RLS
-- ============================================================

-- processing_templates
ALTER TABLE processing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on processing_templates"
  ON processing_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- processing_steps
ALTER TABLE processing_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on processing_steps"
  ON processing_steps FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pilots can view own mission steps"
  ON processing_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drone_jobs dj
      WHERE dj.id = processing_steps.mission_id
        AND dj.pilot_id = auth.uid()
    )
  );

-- delivery_log
ALTER TABLE delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on delivery_log"
  ON delivery_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
