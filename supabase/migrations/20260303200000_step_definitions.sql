-- Add step_definitions JSONB to processing_templates
-- Each entry: {name, label, script, manual}
-- Keeps default_steps (string[]) untouched for n8n backward compat

ALTER TABLE processing_templates
  ADD COLUMN IF NOT EXISTS step_definitions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN processing_templates.step_definitions IS
  'Ordered step objects: {name, label, script, manual}. Source of truth for UI rendering.';

-- Seed step_definitions for all 6 paths
-- Path A: RE Photos
UPDATE processing_templates
SET step_definitions = '[
  {"name": "ingest",         "label": "Ingest & Sort",       "script": "ingest_sorter.py",       "manual": false},
  {"name": "qa",             "label": "QA Analysis",         "script": "drone-qa-analyze",        "manual": false},
  {"name": "lightroom_edit", "label": "Lightroom Edit",      "script": null,                      "manual": true},
  {"name": "export_web",     "label": "Web Export",          "script": "export_web.py",           "manual": false},
  {"name": "delivery",       "label": "Delivery",            "script": "delivery_packaging.py",   "manual": false}
]'::jsonb
WHERE path_code = 'A' AND active = true;

-- Path B: Construction Progress
UPDATE processing_templates
SET step_definitions = '[
  {"name": "ingest",           "label": "Ingest & Sort",         "script": "ingest_sorter.py",       "manual": false},
  {"name": "exif_extract",     "label": "EXIF Extraction",       "script": "exif_extract.py",        "manual": false},
  {"name": "mapping_process",  "label": "Mapping Process",       "script": "webodm",                 "manual": false},
  {"name": "qa_review",        "label": "QA Review",             "script": "drone-qa-analyze",        "manual": false},
  {"name": "packaging",        "label": "Packaging",             "script": "delivery_packaging.py",   "manual": false},
  {"name": "delivery",         "label": "Delivery",              "script": "gdrive_upload.py",        "manual": false}
]'::jsonb
WHERE path_code = 'B' AND active = true;

-- Path C: Mapping/WebODM
UPDATE processing_templates
SET step_definitions = '[
  {"name": "ingest",           "label": "Ingest & Sort",         "script": "ingest_sorter.py",       "manual": false},
  {"name": "exif_extract",     "label": "EXIF Extraction",       "script": "exif_extract.py",        "manual": false},
  {"name": "webodm_process",   "label": "WebODM Processing",     "script": "webodm",                 "manual": false},
  {"name": "export_ortho",     "label": "Ortho Export",          "script": "export_ortho.py",        "manual": false},
  {"name": "qa_review",        "label": "QA Review",             "script": "drone-qa-analyze",        "manual": false},
  {"name": "delivery",         "label": "Delivery",              "script": "gdrive_upload.py",        "manual": false}
]'::jsonb
WHERE path_code = 'C' AND active = true;

-- Path D: ADIAT
UPDATE processing_templates
SET step_definitions = '[
  {"name": "ingest",           "label": "Ingest & Sort",         "script": "ingest_sorter.py",       "manual": false},
  {"name": "qa",               "label": "QA Analysis",           "script": "drone-qa-analyze",        "manual": false},
  {"name": "adiat_review",     "label": "ADIAT Review",          "script": null,                      "manual": true},
  {"name": "annotate",         "label": "Annotate",              "script": "annotate.py",             "manual": false},
  {"name": "export_hq",        "label": "HQ Export",             "script": "export_hq.py",           "manual": false},
  {"name": "delivery",         "label": "Delivery",              "script": "delivery_packaging.py",   "manual": false}
]'::jsonb
WHERE path_code = 'D' AND active = true;

-- Path V: Video
UPDATE processing_templates
SET step_definitions = '[
  {"name": "ingest",           "label": "Ingest & Sort",         "script": "ingest_sorter.py",       "manual": false},
  {"name": "color_grade",      "label": "Color Grade",           "script": "video_color_grade.py",   "manual": false},
  {"name": "metadata",         "label": "Video Metadata",        "script": "video_metadata.py",      "manual": false},
  {"name": "telemetry",        "label": "SRT Telemetry",         "script": "srt_telemetry_parser.py","manual": false},
  {"name": "qa",               "label": "Video QA",              "script": "video_qa.py",            "manual": false},
  {"name": "proxy_gen",        "label": "Proxy Generation",      "script": "video_proxy_gen.py",     "manual": false},
  {"name": "manual_edit",      "label": "Manual Edit",           "script": null,                      "manual": true},
  {"name": "export_video",     "label": "Video Export",          "script": "video_format_export.py", "manual": false},
  {"name": "delivery",         "label": "Delivery",              "script": "delivery_packaging.py",   "manual": false}
]'::jsonb
WHERE path_code = 'V' AND active = true;

-- Path B+C: Construction + Mapping
UPDATE processing_templates
SET step_definitions = '[
  {"name": "ingest",           "label": "Ingest & Sort",         "script": "ingest_sorter.py",       "manual": false},
  {"name": "exif_extract",     "label": "EXIF Extraction",       "script": "exif_extract.py",        "manual": false},
  {"name": "lightroom_edit",   "label": "Lightroom Edit",        "script": null,                      "manual": true},
  {"name": "webodm_process",   "label": "WebODM Processing",     "script": "webodm",                 "manual": false},
  {"name": "export_web",       "label": "Web Export",            "script": "export_web.py",           "manual": false},
  {"name": "export_ortho",     "label": "Ortho Export",          "script": "export_ortho.py",        "manual": false},
  {"name": "delivery",         "label": "Delivery",              "script": "delivery_packaging.py",   "manual": false}
]'::jsonb
WHERE path_code = 'B+C' AND active = true;
