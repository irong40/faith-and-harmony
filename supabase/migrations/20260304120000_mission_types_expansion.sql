-- Mission Types Expansion: 6 drone mission types with SOP checklists, shot lists, pipeline integration
-- Adds new columns to drone_packages, deactivates old packages, inserts 9 new packages,
-- seeds weather thresholds and processing templates for new types.

-- =====================================================
-- 1. Add columns to drone_packages
-- =====================================================
ALTER TABLE drone_packages ADD COLUMN IF NOT EXISTS requires_thermal BOOLEAN DEFAULT false;
ALTER TABLE drone_packages ADD COLUMN IF NOT EXISTS requires_raw BOOLEAN DEFAULT false;
ALTER TABLE drone_packages ADD COLUMN IF NOT EXISTS min_altitude_ft INTEGER;
ALTER TABLE drone_packages ADD COLUMN IF NOT EXISTS max_altitude_ft INTEGER;
ALTER TABLE drone_packages ADD COLUMN IF NOT EXISTS processing_profile JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- 2. Deactivate old packages (keeps FK references valid)
-- =====================================================
UPDATE drone_packages SET active = false
WHERE code IN ('PHOTO_495', 'PHOTO_VIDEO_795', 'PREMIUM_1250', 'PROGRESS_800');

-- =====================================================
-- 3. Insert new packages with canonical pricing
-- =====================================================

-- Real Estate: Listing Lite $225
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'LISTING_LITE_225', 'Listing Lite', 'real_estate', 225,
  'Quick aerial photo pack for standard listings — 10 edited photos with sky replacement',
  ARRAY['10 edited photos', 'Sky replacement', 'MLS-ready formats', 'Next-day delivery'],
  20, 'low', false, false,
  100, 400,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Front Hero Oblique", "type": "photo"},
      {"name": "Front Left Corner", "type": "photo"},
      {"name": "Front Right Corner", "type": "photo"},
      {"name": "Rear Oblique", "type": "photo"},
      {"name": "Top-Down Property", "type": "photo"}
    ]},
    {"group": "Aerial Situational", "shots": [
      {"name": "Neighborhood Context", "type": "photo"},
      {"name": "Street Approach", "type": "photo"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Front Elevation", "type": "photo"},
      {"name": "Backyard Overview", "type": "photo"},
      {"name": "Feature Detail", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "RE_Basic_v2", "sky_replacement": true, "output_formats": ["jpg_web", "jpg_mls"]}'::jsonb
);

-- Real Estate: Listing Pro $450
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'LISTING_PRO_450', 'Listing Pro', 'real_estate', 450,
  'Full aerial media package — 25 photos, 60-second highlight reel, 2D overlay',
  ARRAY['25 edited photos', '60s highlight reel', '2D property overlay', 'Sky replacement', '48hr delivery'],
  45, 'medium', false, false,
  100, 400,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Front Hero Oblique", "type": "photo"},
      {"name": "Front Left Corner", "type": "photo"},
      {"name": "Front Right Corner", "type": "photo"},
      {"name": "Rear Oblique", "type": "photo"},
      {"name": "Side Elevation Left", "type": "photo"},
      {"name": "Side Elevation Right", "type": "photo"},
      {"name": "Top-Down Property", "type": "photo"},
      {"name": "Top-Down Roof", "type": "photo"},
      {"name": "Neighborhood Context Wide", "type": "photo"},
      {"name": "Neighborhood Context Tight", "type": "photo"}
    ]},
    {"group": "Aerial Situational", "shots": [
      {"name": "Pool/Patio Detail", "type": "photo"},
      {"name": "Driveway Approach", "type": "photo"},
      {"name": "Backyard Feature", "type": "photo"}
    ]},
    {"group": "Video", "shots": [
      {"name": "Reveal Shot", "type": "video"},
      {"name": "Orbit 360", "type": "video"},
      {"name": "Fly-Away Closing", "type": "video"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Front Elevation", "type": "photo"},
      {"name": "Backyard Overview", "type": "photo"},
      {"name": "Feature Detail 1", "type": "photo"},
      {"name": "Feature Detail 2", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "RE_Pro_v2", "sky_replacement": true, "video_edit": true, "output_formats": ["jpg_web", "jpg_mls", "mp4_1080p"]}'::jsonb
);

-- Real Estate: Luxury $750
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'LUXURY_750', 'Luxury Listing', 'real_estate', 750,
  'Premium aerial marketing — 40+ photos, 2-minute cinematic video, twilight session, 24hr priority',
  ARRAY['40+ edited photos', '2-minute cinematic video', 'Twilight session included', 'Premium color grading', '24hr priority delivery'],
  90, 'high', false, false,
  100, 400,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Front Hero Oblique", "type": "photo"},
      {"name": "Front Left Corner", "type": "photo"},
      {"name": "Front Right Corner", "type": "photo"},
      {"name": "Rear Oblique", "type": "photo"},
      {"name": "Side Elevation Left", "type": "photo"},
      {"name": "Side Elevation Right", "type": "photo"},
      {"name": "Top-Down Property", "type": "photo"},
      {"name": "Top-Down Roof", "type": "photo"},
      {"name": "Neighborhood Context Wide", "type": "photo"},
      {"name": "Neighborhood Context Tight", "type": "photo"},
      {"name": "Approach Shot Long", "type": "photo"},
      {"name": "Feature Detail Aerial", "type": "photo"}
    ]},
    {"group": "Aerial Situational", "shots": [
      {"name": "Pool Aerial", "type": "photo"},
      {"name": "Garden/Landscape Detail", "type": "photo"},
      {"name": "Guest House/ADU", "type": "photo"},
      {"name": "Waterfront/View Showcase", "type": "photo"}
    ]},
    {"group": "Video", "shots": [
      {"name": "Cinematic Reveal", "type": "video"},
      {"name": "Full Orbit 360", "type": "video"},
      {"name": "Property Tour Flyover", "type": "video"},
      {"name": "Fly-Away Closing", "type": "video"}
    ]},
    {"group": "Twilight", "shots": [
      {"name": "Twilight Front Hero", "type": "photo"},
      {"name": "Twilight Rear/Pool", "type": "photo"},
      {"name": "Twilight Wide Context", "type": "photo"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Front Elevation", "type": "photo"},
      {"name": "Backyard Panoramic", "type": "photo"},
      {"name": "Feature Detail 1", "type": "photo"},
      {"name": "Feature Detail 2", "type": "photo"},
      {"name": "Feature Detail 3", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "Luxury_v1", "sky_replacement": true, "video_edit": true, "twilight_blend": true, "output_formats": ["jpg_web", "jpg_mls", "jpg_print", "mp4_4k", "mp4_1080p"]}'::jsonb
);

-- Construction: Progress $450
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'CONSTRUCTION_450', 'Construction Progress', 'construction', 450,
  'Single-visit construction progress documentation with consistent compass angles',
  ARRAY['25 labeled photos', '4 short video clips', 'Compass-bearing shots', 'Progress comparison ready', '48hr delivery'],
  30, 'critical_only', false, false,
  150, 400,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "North Compass 45deg", "type": "photo"},
      {"name": "East Compass 45deg", "type": "photo"},
      {"name": "South Compass 45deg", "type": "photo"},
      {"name": "West Compass 45deg", "type": "photo"},
      {"name": "Nadir/Top-Down", "type": "photo"},
      {"name": "Perimeter Wide", "type": "photo"},
      {"name": "Workface Detail", "type": "photo"}
    ]},
    {"group": "Video", "shots": [
      {"name": "Full Orbit Overview", "type": "video"},
      {"name": "North Approach", "type": "video"},
      {"name": "South Approach", "type": "video"},
      {"name": "Workface Flyby", "type": "video"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Site Entry", "type": "photo"},
      {"name": "Safety Signage", "type": "photo"},
      {"name": "Material Staging", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "Construction_v1", "date_stamp": true, "compass_overlay": true, "output_formats": ["jpg_web", "jpg_hq"]}'::jsonb
);

-- Commercial: Marketing $850
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'COMMERCIAL_850', 'Commercial Marketing', 'commercial', 850,
  'Commercial property marketing with aerial photos and highlight video',
  ARRAY['30+ edited photos', '90s highlight video', 'Property boundaries overlay', 'Premium color grading', '48hr delivery'],
  60, 'medium', false, false,
  100, 400,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Building Front Hero", "type": "photo"},
      {"name": "Building Rear", "type": "photo"},
      {"name": "Parking/Access Overview", "type": "photo"},
      {"name": "Property Boundary Wide", "type": "photo"},
      {"name": "Top-Down Full Site", "type": "photo"},
      {"name": "Signage/Branding", "type": "photo"},
      {"name": "Neighboring Context", "type": "photo"}
    ]},
    {"group": "Video", "shots": [
      {"name": "Reveal Shot", "type": "video"},
      {"name": "Full Orbit", "type": "video"},
      {"name": "Fly-Away Closing", "type": "video"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Main Entrance", "type": "photo"},
      {"name": "Loading/Dock Area", "type": "photo"},
      {"name": "Tenant Spaces", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "Commercial_v1", "video_edit": true, "output_formats": ["jpg_web", "jpg_print", "mp4_1080p"]}'::jsonb
);

-- Inspection: Roof $0 (quote-based)
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'ROOF_INSPECTION', 'Roof Inspection', 'inspection', 0,
  'Systematic roof inspection with grid photography and annotated report',
  ARRAY['Grid photography coverage', 'Close-up detail shots', 'Annotated damage report', 'GPS-tagged images', 'Quote-based pricing'],
  45, 'critical_only', false, false,
  30, 150,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Nadir Grid Pass 1", "type": "photo"},
      {"name": "Nadir Grid Pass 2", "type": "photo"},
      {"name": "North Slope 45deg", "type": "photo"},
      {"name": "East Slope 45deg", "type": "photo"},
      {"name": "South Slope 45deg", "type": "photo"},
      {"name": "West Slope 45deg", "type": "photo"},
      {"name": "Ridge Line Detail", "type": "photo"},
      {"name": "Flashing/Penetration Detail", "type": "photo"},
      {"name": "Gutter/Edge Detail", "type": "photo"}
    ]},
    {"group": "Aerial Situational", "shots": [
      {"name": "Chimney Close-Up", "type": "photo"},
      {"name": "Skylight Detail", "type": "photo"},
      {"name": "Vent/HVAC Detail", "type": "photo"},
      {"name": "Damage Area Close-Up", "type": "photo"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Property Overview", "type": "photo"},
      {"name": "Gutter Ground View", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "Inspection_v1", "annotation": true, "gps_embed": true, "output_formats": ["jpg_hq", "pdf_report"]}'::jsonb
);

-- Survey: Land Survey $0 (quote-based)
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'LAND_SURVEY', 'Land Survey and Mapping', 'survey', 0,
  'Photogrammetry mapping with orthomosaic, point cloud, and optional 3D mesh',
  ARRAY['Orthomosaic output', 'Point cloud generation', '3D mesh (optional)', 'GCP integration', 'GeoTIFF export', 'Quote-based pricing'],
  0, 'critical_only', false, false,
  200, 400,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Grid Flight Plan (80% overlap)", "type": "photo"},
      {"name": "Cross-Hatch Flight Plan (70% sidelap)", "type": "photo"},
      {"name": "GCP Marker Verification", "type": "photo"},
      {"name": "Boundary Context Wide", "type": "photo"}
    ]},
    {"group": "Aerial Situational", "shots": [
      {"name": "Terrain Feature Detail", "type": "photo"},
      {"name": "Access Road Documentation", "type": "photo"},
      {"name": "Water Feature/Drainage", "type": "photo"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "GCP Photo with Scale", "type": "photo"},
      {"name": "Site Entry Point", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"pipeline": "webodm", "overlap_percent": 80, "sidelap_percent": 70, "output_formats": ["geotiff", "las", "obj"]}'::jsonb
);

-- Insurance: Documentation $0 (quote-based)
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'INSURANCE_DOC', 'Insurance Documentation', 'insurance', 0,
  'Comprehensive damage documentation with RAW capture, GPS metadata, and evidence chain',
  ARRAY['RAW + JPEG capture', 'GPS-embedded metadata', 'Thermal imaging (if needed)', 'Evidence chain documentation', 'Timestamped photos', 'Quote-based pricing'],
  30, 'critical_only', true, true,
  30, 200,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Property Overview Wide", "type": "photo"},
      {"name": "Damage Area Overview", "type": "photo"},
      {"name": "Damage Close-Up 1", "type": "photo"},
      {"name": "Damage Close-Up 2", "type": "photo"},
      {"name": "Damage Close-Up 3", "type": "photo"},
      {"name": "Roof Nadir Full", "type": "photo"},
      {"name": "Adjacent Undamaged Reference", "type": "photo"}
    ]},
    {"group": "Thermal", "shots": [
      {"name": "Thermal Roof Overview", "type": "thermal"},
      {"name": "Thermal Damage Area", "type": "thermal"},
      {"name": "Thermal Moisture Detection", "type": "thermal"}
    ]},
    {"group": "Aerial Situational", "shots": [
      {"name": "Storm Direction Context", "type": "photo"},
      {"name": "Neighboring Property Comparison", "type": "photo"},
      {"name": "Debris Field Documentation", "type": "photo"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Property Address Verification", "type": "photo"},
      {"name": "Ground-Level Damage", "type": "photo"},
      {"name": "Evidence Scale Reference", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "None", "raw_workflow": true, "gps_embed": true, "timestamp_overlay": true, "evidence_chain": true, "output_formats": ["jpg_hq", "raw_dng", "pdf_report"]}'::jsonb
);

-- Inspection: Solar Panel $0 (quote-based)
INSERT INTO drone_packages (
  code, name, category, price, description, features,
  edit_budget_minutes, reshoot_tolerance, requires_thermal, requires_raw,
  min_altitude_ft, max_altitude_ft,
  shot_manifest, processing_profile
) VALUES (
  'SOLAR_INSPECTION', 'Solar Panel Inspection', 'inspection', 0,
  'Thermal and visual inspection of solar panel arrays for hotspots and defects',
  ARRAY['Thermal + visual dual capture', 'Hotspot detection', 'Panel-level defect mapping', 'Temperature differential analysis', 'Quote-based pricing'],
  45, 'critical_only', true, false,
  30, 150,
  '[
    {"group": "Aerial Mandatory", "shots": [
      {"name": "Array Overview Visual", "type": "photo"},
      {"name": "Array Overview Thermal", "type": "thermal"},
      {"name": "Row-by-Row Visual Pass", "type": "photo"},
      {"name": "Row-by-Row Thermal Pass", "type": "thermal"},
      {"name": "Inverter/Junction Box", "type": "photo"}
    ]},
    {"group": "Thermal", "shots": [
      {"name": "Hotspot Close-Up 1", "type": "thermal"},
      {"name": "Hotspot Close-Up 2", "type": "thermal"},
      {"name": "String Comparison Thermal", "type": "thermal"},
      {"name": "Reference Panel Thermal", "type": "thermal"}
    ]},
    {"group": "Aerial Situational", "shots": [
      {"name": "Shading Analysis", "type": "photo"},
      {"name": "Soiling/Debris Detection", "type": "photo"},
      {"name": "Wiring/Conduit Check", "type": "photo"}
    ]},
    {"group": "Ground Level", "shots": [
      {"name": "Inverter Readings", "type": "photo"},
      {"name": "Panel Serial Numbers", "type": "photo"}
    ]}
  ]'::jsonb,
  '{"color_grade": "Inspection_v1", "thermal_analysis": true, "gps_embed": true, "output_formats": ["jpg_hq", "thermal_raw", "pdf_report"]}'::jsonb
);

-- =====================================================
-- 4. Weather thresholds for new mission types
-- =====================================================

INSERT INTO weather_thresholds (aircraft_model, package_type, label, max_wind_speed_ms, notes)
VALUES
  (NULL, 'ROOF_INSPECTION', 'Roof Inspection Wind Limit', 6.0,
   'Low-altitude close-up work requires calmer conditions for stability and image sharpness'),
  (NULL, 'LAND_SURVEY', 'Land Survey Wind Limit', 8.0,
   'Mapping flights require consistent altitude and overlap — moderate wind tolerance'),
  (NULL, 'INSURANCE_DOC', 'Insurance Documentation Wind Limit', 8.0,
   'Post-damage sites may have debris hazards — moderate wind tolerance');

INSERT INTO weather_thresholds (aircraft_model, package_type, label, max_wind_speed_ms, min_temp_c, notes)
VALUES
  (NULL, 'SOLAR_INSPECTION', 'Solar Panel Inspection Limits', 6.0, 15.0,
   'Thermal imaging requires calm air and minimum 15C ambient for accurate temperature differential readings');

-- =====================================================
-- 5. Processing templates for new packages
-- =====================================================

-- LISTING_LITE_225 → Path A
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Listing Lite Processing', 'Basic real estate photo processing',
  're_basic', 65, false, false, 'RE_Basic_v2', 'jpg_web', true,
  '["ingest", "qa", "lightroom_edit", "sky_replace", "export_web", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'LISTING_LITE_225'
ON CONFLICT DO NOTHING;

-- LISTING_PRO_450 → Path A (with video steps)
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Listing Pro Processing', 'Real estate photo + video processing',
  're_pro', 65, false, false, 'RE_Pro_v2', 'jpg_web', true,
  '["ingest", "qa", "lightroom_edit", "sky_replace", "video_edit", "export_web", "export_video", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'LISTING_PRO_450'
ON CONFLICT DO NOTHING;

-- LUXURY_750 → Path A (with video + twilight steps)
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Luxury Processing', 'Premium photo + video + twilight processing',
  'luxury', 70, false, false, 'Luxury_v1', 'jpg_web', true,
  '["ingest", "qa", "lightroom_edit", "sky_replace", "twilight_blend", "video_edit", "export_web", "export_video", "export_print", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'LUXURY_750'
ON CONFLICT DO NOTHING;

-- CONSTRUCTION_450 → Path B
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Construction Processing', 'Construction progress photo processing',
  'construction', 60, false, false, 'Construction_v1', 'jpg_web', true,
  '["ingest", "qa", "lightroom_edit", "date_stamp", "compass_overlay", "export_web", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'CONSTRUCTION_450'
ON CONFLICT DO NOTHING;

-- COMMERCIAL_850 → Path A (with video)
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Commercial Processing', 'Commercial marketing photo + video processing',
  'commercial', 65, false, false, 'Commercial_v1', 'jpg_web', true,
  '["ingest", "qa", "lightroom_edit", "video_edit", "export_web", "export_video", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'COMMERCIAL_850'
ON CONFLICT DO NOTHING;

-- ROOF_INSPECTION → Path D
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Roof Inspection Processing', 'Roof inspection with annotation',
  'adiat', 80, true, false, 'Inspection_v1', 'jpg_hq', true,
  '["ingest", "qa", "adiat_review", "annotate", "export_hq", "report_gen", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'ROOF_INSPECTION'
ON CONFLICT DO NOTHING;

-- LAND_SURVEY → Path C
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Land Survey Processing', 'Photogrammetry via WebODM',
  'mapping', 70, false, false, NULL, 'geotiff', true,
  '["ingest", "qa", "webodm_process", "export_ortho", "export_pointcloud", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'LAND_SURVEY'
ON CONFLICT DO NOTHING;

-- INSURANCE_DOC → Path D (raw_workflow = true)
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, NULL, 'Insurance Documentation Processing', 'Evidence-grade processing with RAW preservation',
  'adiat', 85, true, true, 'Inspection_v1', 'jpg_hq', true,
  '["ingest", "qa", "raw_preserve", "adiat_review", "annotate", "gps_verify", "export_hq", "report_gen", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'INSURANCE_DOC'
ON CONFLICT DO NOTHING;

-- SOLAR_INSPECTION → Path D+T (Path D + thermal_analysis)
INSERT INTO processing_templates (
  package_id, path_code, display_name, description,
  preset_name, qa_threshold, adiat_enabled, raw_workflow,
  lightroom_preset, output_format, active, default_steps
)
SELECT dp.id, 'D+T', 'Solar/Thermal Inspection', 'Inspection with thermal analysis overlay',
  'thermal_inspection', 80, true, false, 'Inspection_v1', 'jpg_hq', true,
  '["ingest", "qa", "thermal_analysis", "adiat_review", "annotate", "hotspot_map", "export_hq", "report_gen", "delivery"]'::jsonb
FROM drone_packages dp WHERE dp.code = 'SOLAR_INSPECTION'
ON CONFLICT DO NOTHING;
