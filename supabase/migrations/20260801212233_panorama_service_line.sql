-- =====================================================================
-- Panorama / 360 — the missing catalogue layer
--
-- Fourth instance of "engine exists, catalogue entry does not", after
-- gaussian_splat (2026-07-27) and pavement/steeple/church_campus
-- (2026-07-30). Sortie main already carried the whole panorama path
-- (odm_presets.JOB_TYPES, PRESETS["panorama"] engine "local", min_photos 8,
-- report_type "panorama", crm_sync.PRESET_TO_JOB_TYPE). What never existed
-- is a processing_templates row, and both CRM dropdowns (JobIntake.tsx:131,
-- DroneJobs.tsx:125) populate exclusively from that table where
-- active = true. No row, no option.
--
-- Unlike pavement/steeple/church_campus — rows that existed and were
-- switched off — panorama had no row at any point, so no reactivation
-- would ever have surfaced it.
--
-- SHIPS WITH PortfolioMaker crm_sync.py:
--   REPORT_TEMPLATE_CODES["panorama"] = "panorama_delivery"
-- Without that key push_report() logs "No CRM report template for job type
-- panorama — skipping push" and returns. Soft-fail, no crash, no operator
-- warning — the exact silent class these migrations exist to prevent.
--
-- Section keys: EXISTING report_section_key enum values only, the same
-- constraint held by 20260730184129. Sortie's local PANORAMA template
-- (report_templates.py) uses "panorama_sets" and "photo_grid", neither of
-- which is an enum value, so model_3d_link carries the interactive viewers
-- and annotated_imagery the stills. No enum change, no frontend change, no
-- doc-generator change.
--
-- path_code 'PA': panorama runs no ODM at all, so it deliberately does not
-- join the C+ family (C+S, C+U, C+F, C+V, C+PS, C+3D).
--
-- Applied live 2026-08-01 as version 20260801212233.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Report template
-- ---------------------------------------------------------------------

insert into report_templates (code, name, description, service_type, sections_manifest, is_active)
values
('panorama_delivery',
 '360 Panorama Delivery Report',
 'Equirectangular panorama imagery plus self-hosted interactive viewers. Stitching is fully local (DJI pre-stitched fast path or the OpenCV worker) — no photogrammetry and no georeferenced raster, so no GIS sidecars and no accuracy statement.',
 'panorama',
 '[
   {"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Delivery Summary","required":true},
   {"key":"methodology","label":"Capture & Stitching Method","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Summary","required":true},
   {"key":"weather_conditions","label":"Weather at Capture","required":false},
   {"key":"property_overview","label":"Site Overview","required":false},
   {"key":"model_3d_link","label":"Interactive Panorama Viewers","required":true},
   {"key":"annotated_imagery","label":"Panorama Stills","required":true},
   {"key":"coverage_qa","label":"Coverage & Stitch Quality","required":true},
   {"key":"scope_limitations","label":"Limitations","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Index","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
 ]'::jsonb,
 true)
on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- 2. Processing template — the row that makes panorama appear in both
--    CRM dropdowns. preset_name went UNIQUE in 20260727193240, so
--    on conflict is a real guard here.
-- ---------------------------------------------------------------------

insert into processing_templates
  (preset_name, path_code, display_name, description, output_format, active)
values
('panorama', 'PA',
 'Panorama / 360 — equirectangular + web viewer',
 'Local 360 panorama stitching and web viewer export. Minimum 8 source frames per set. No ODM, no orthomosaic, no GIS sidecars — the viewer is the deliverable.',
 'jpg_web', true)
on conflict (preset_name) do nothing;


-- =====================================================================
-- POST-APPLY VERIFICATION — run live 2026-08-01, all four passed
-- =====================================================================
-- select count(*) from processing_templates where preset_name='panorama' and active;
--   -- expect 1
-- select jsonb_array_length(sections_manifest) from report_templates where code='panorama_delivery';
--   -- expect 14
-- select count(*) from report_templates r, jsonb_array_elements(r.sections_manifest) s
--  where r.code='panorama_delivery'
--    and (s->>'key') not in (select enumlabel from pg_enum e
--          join pg_type t on t.oid = e.enumtypid where t.typname='report_section_key');
--   -- expect 0
-- select count(*) from processing_templates where active;
--   -- expect 23
--
-- Sortie side, from the repo root (these now hit the LIVE catalogue):
--   python -m pytest test_crm_sync.py -q -k live
