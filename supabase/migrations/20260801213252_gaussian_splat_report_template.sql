-- =====================================================================
-- Gaussian Splat — the report half of the catalogue
--
-- 20260727164639 added the processing_templates row, so 3D jobs have been
-- BOOKABLE since 2026-07-27 — but with no report_templates row, every one
-- of them opens an empty Reports tab. crm_sync.push_report() bails at the
-- REPORT_TEMPLATE_CODES lookup before it ever builds a payload, which is a
-- soft skip: the job still completes and still writes back status, paths
-- and deliverables. Nothing errors. The client just gets no report.
--
-- This is the last open instance of the "engine exists, catalogue entry
-- does not" class, after gaussian_splat's processing row (7/27),
-- pavement/steeple/church_campus (7/30) and panorama (8/01). Note the two
-- distinct shapes it takes: a MISSING row (panorama), a row switched
-- INACTIVE (the trio), and now HALF a catalogue entry — processing row
-- present, report row absent.
--
-- SHIPS WITH PortfolioMaker crm_sync.py:
--   REPORT_TEMPLATE_CODES["gaussian_splat"] = "gaussian_splat_delivery"
-- and is locked going forward by test_every_odm_job_type_has_a_report_template
-- plus the live test_live_every_report_template_code_exists.
--
-- Section keys: EXISTING report_section_key enum values only. Sortie's
-- local GAUSSIAN_SPLAT template (report_templates.py:672) uses
-- subject_description, surface_analysis, coverage_assessment and
-- model_use_cases — none of which are enum values. They fold in as:
--   subject_description  -> property_overview
--   coverage_assessment  -> coverage_qa
--   surface_analysis     -> methodology narrative
--   model_use_cases      -> scope_limitations narrative
-- No enum change, no frontend change, no doc-generator change.
--
-- A splat is NOT georeferenced: no orthomosaic, no GIS sidecars, no
-- accuracy statement. odm_presets.delivers_gis is false for this preset,
-- so the description says so plainly rather than implying survey output.
-- Engine credit is OpenSplat, not MipMap — OpenSplat replaced it
-- 2026-07-23 and no preset yields engine == "mipmap" today.
--
-- Applied live 2026-08-01 as version 20260801213252.
-- =====================================================================

insert into report_templates (code, name, description, service_type, sections_manifest, is_active)
values
('gaussian_splat_delivery',
 '3D Gaussian Splat Model Report',
 'Photoreal 3D Gaussian Splat model (.ply) with an interactive web viewer, reconstructed by OpenSplat on GPU from a NodeODM structure-from-motion pass. Suited to virtual tours, marketing and visual documentation. Not a survey product — the model is not georeferenced and carries no accuracy statement, no orthomosaic and no GIS sidecars.',
 'gaussian_splat',
 '[
   {"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Model Summary","required":true},
   {"key":"methodology","label":"Capture & Reconstruction Method","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Summary","required":true},
   {"key":"weather_conditions","label":"Lighting & Conditions at Capture","required":false},
   {"key":"property_overview","label":"Subject Description","required":true},
   {"key":"model_3d_link","label":"Interactive 3D Splat Viewer (.ply)","required":true},
   {"key":"annotated_imagery","label":"Source Photography","required":true},
   {"key":"coverage_qa","label":"Coverage Assessment & Model Completeness","required":true},
   {"key":"scope_limitations","label":"Recommended Use & Limitations","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Index","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
 ]'::jsonb,
 true)
on conflict (code) do nothing;


-- =====================================================================
-- POST-APPLY VERIFICATION — run live 2026-08-01, all passed
-- =====================================================================
-- select code, service_type, is_active, jsonb_array_length(sections_manifest)
--   from report_templates where code = 'gaussian_splat_delivery';
--   -- expect 1 row, active, 14 sections
--
-- select count(*) from report_templates r, jsonb_array_elements(r.sections_manifest) s
--  where r.code = 'gaussian_splat_delivery'
--    and (s->>'key') not in (select enumlabel from pg_enum e
--          join pg_type t on t.oid = e.enumtypid where t.typname='report_section_key');
--   -- expect 0
--
-- Sortie side, from the repo root (these hit the LIVE catalogue):
--   python -m pytest test_crm_sync.py -q -k live
--   -- expect 3 passed: presets mapped, report codes resolve, job types dispatchable
