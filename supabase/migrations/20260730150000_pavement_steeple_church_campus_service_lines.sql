-- =====================================================================
-- Pavement / Steeple / Church Campus — the missing catalogue layer
--
-- report-system-spec-v1 §5.2 (ASTM D6433) and §5.5 (roof + steeple
-- addendum) have been specced since 2026-07-25, and pavement_pci has had
-- a live report_templates row since 2026-07-27. What never landed is the
-- processing_templates row for any of them — and BOTH CRM job-type
-- dropdowns (JobIntake.tsx, DroneJobDetail.tsx) populate exclusively
-- from processing_templates where active = true. No row, no option.
--
-- Same failure class as the 2026-07-27 gaussian_splat gap: the engine
-- exists, the catalogue entry does not.
--
-- church_campus is the whole-campus bundle per Adam's call 2026-07-30:
-- sanctuary roof + steeple + parking lot + grounds in one visit. It is
-- the only one of the three that is NOT covered by an existing spec
-- section; its report template composes the §5.2 and §5.5 vocabularies.
--
-- Section keys: EXISTING enum values only (all 42 verified live before
-- writing). No report_section_key change, no frontend change, no
-- doc-generator change — same approach as the 2026-07-13 unification.
--
-- Matching sortie side is PortfolioMaker feat/sortie-gui 96b9655
-- (odm_presets PRESETS + JOB_TYPES, crm_sync PRESET_TO_JOB_TYPE +
-- REPORT_TEMPLATE_CODES). A preset_name here without a
-- PRESET_TO_JOB_TYPE key is a SILENT no-prefill, so the two must ship
-- together.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Report templates (pavement_pci already exists — not touched)
-- ---------------------------------------------------------------------

insert into report_templates (code, name, description, service_type, sections_manifest, is_active)
values
('steeple_inspection',
 'Steeple & Spire Documentation Report',
 'Roof inspection findings plus the six steeple zones of report-system-spec-v1 §5.5, with the Gaussian splat viewer as the added deliverable. Church, institutional and municipal work takes the L/M/H severity vocabulary, bound at job creation.',
 'steeple',
 '[
   {"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Inspection Summary","required":true},
   {"key":"methodology","label":"Method Statement","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather at Capture","required":true},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":false},
   {"key":"findings","label":"Roof & Steeple Findings (Severity L/M/H)","required":true},
   {"key":"observation_log","label":"Steeple Zone Records (Six Zones)","required":true},
   {"key":"roof_plan_annotated","label":"Annotated Roof & Steeple Zone Plan","required":true},
   {"key":"annotated_imagery","label":"Annotated Imagery","required":true},
   {"key":"model_3d_link","label":"3D Gaussian Splat Viewer","required":true},
   {"key":"scope_limitations","label":"Limitations & Structural Referral","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Index","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
 ]'::jsonb,
 true),

('church_campus_survey',
 'Church Campus Survey Report',
 'Whole-campus documentation: sanctuary roof and steeple per §5.5, parking lot pavement per §5.2 (ASTM D6433), and a grounds orthomosaic, delivered as one report. PCI scoring requires a licensed copy of D6433.',
 'church_campus',
 '[
   {"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Executive Summary","required":true},
   {"key":"methodology","label":"Method Statement","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather at Capture","required":true},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":false},
   {"key":"property_overview","label":"Campus Overview & Site Plan","required":true},
   {"key":"findings","label":"Campus Condition Findings (Severity L/M/H)","required":true},
   {"key":"roof_plan_annotated","label":"Sanctuary Roof & Steeple Zone Plan","required":true},
   {"key":"observation_log","label":"Steeple Zone Records (Six Zones)","required":true},
   {"key":"pci_rating","label":"Parking Lot PCI Score & Rating Band (requires licensed ASTM D6433)","required":false},
   {"key":"measurements_appendix","label":"Quantity Takeoff","required":false},
   {"key":"annotated_imagery","label":"Annotated Imagery","required":true},
   {"key":"model_3d_link","label":"3D Model & Splat Viewer","required":true},
   {"key":"accuracy_checkpoint_report","label":"Accuracy Checkpoint Report","required":false},
   {"key":"scope_limitations","label":"Limitations & Structural Referral","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Index","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true},
   {"key":"appendix_field_forms","label":"Appendix: D6433 Sample Unit Sheets","required":false}
 ]'::jsonb,
 true)
on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- 2. Processing templates — the rows that make the CRM dropdowns show
--    these at all. preset_name went UNIQUE in 20260727193240, so
--    on conflict is a real guard here rather than the NOT EXISTS dance
--    the gaussian_splat migration needed.
-- ---------------------------------------------------------------------

insert into processing_templates
  (preset_name, path_code, display_name, description, output_format, active)
values
('pavement', 'P',
 'Parking Lot / Pavement — ASTM D6433 condition',
 'Two-pass nadir capture (wide grid then medium-tele detail, SOP-002B) producing a 1 cm orthomosaic for sample-unit distress measurement, plus DSM for ponding and rutting.',
 'geotiff', true),

('steeple', 'S',
 'Steeple / Spire — roof + six-zone documentation',
 'Roof inspection sequence plus two steeple orbit rings and one close oblique per zone. Pair with a Gaussian Splat run over the same photos for the viewer deliverable.',
 'geotiff', true),

('church_campus', 'CH',
 'Church Campus — roof, steeple, lot & grounds',
 'Whole-campus bundle in one visit: sanctuary roof and steeple mesh, parking lot pavement at D6433 resolution, and a grounds orthomosaic. Full-day deliverable.',
 'geotiff', true)
on conflict (preset_name) do nothing;


-- =====================================================================
-- POST-APPLY VERIFICATION (run separately)
-- =====================================================================
-- select preset_name, path_code, display_name from processing_templates
--   where preset_name in ('pavement','steeple','church_campus');
--   -- expect 3 rows, all active
--
-- select code, service_type, jsonb_array_length(sections_manifest) from report_templates
--   where code in ('pavement_pci','steeple_inspection','church_campus_survey');
--   -- expect 3 rows: 17, 16, 21 sections
--
-- -- every section key must already be a report_section_key enum value,
-- -- otherwise the section silently fails to render:
-- select distinct s->>'key' from report_templates r, jsonb_array_elements(r.sections_manifest) s
--  where r.code in ('steeple_inspection','church_campus_survey')
--    and (s->>'key') not in (select enumlabel from pg_enum e
--          join pg_type t on t.oid = e.enumtypid where t.typname = 'report_section_key');
--   -- expect 0 rows
