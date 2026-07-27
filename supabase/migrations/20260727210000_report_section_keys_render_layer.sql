-- =====================================================================
-- Report section keys: render layer for the 2026-07-25 deliverables
-- templates (applied live as 20260727141229_deliverables_report_templates).
-- That migration added templates whose sections_manifest keys had no
-- report_section_key enum value; the frontend components for all 23 keys
-- ship with this change (ReportSection.tsx + sections/renderLayerSections).
--
-- STAGED, NOT APPLIED. Enum-only and additive: no template rows touched,
-- no template activated. ADD VALUE IF NOT EXISTS is idempotent.
-- Values are appended in alphabetical order; the generated TS enum in
-- src/integrations/supabase/types.ts lists them in the same order.
-- =====================================================================

alter type public.report_section_key add value if not exists 'accuracy_checkpoint_report';
alter type public.report_section_key add value if not exists 'appendix_field_forms';
alter type public.report_section_key add value if not exists 'cad_handoff';
alter type public.report_section_key add value if not exists 'canopy_height_model';
alter type public.report_section_key add value if not exists 'contours_topo';
alter type public.report_section_key add value if not exists 'coverage_qa';
alter type public.report_section_key add value if not exists 'cross_sections';
alter type public.report_section_key add value if not exists 'cut_fill';
alter type public.report_section_key add value if not exists 'datum_metadata';
alter type public.report_section_key add value if not exists 'hydrology_drainage';
alter type public.report_section_key add value if not exists 'measurements_appendix';
alter type public.report_section_key add value if not exists 'model_3d_link';
alter type public.report_section_key add value if not exists 'observation_log';
alter type public.report_section_key add value if not exists 'pci_rating';
alter type public.report_section_key add value if not exists 'planimetric_linework';
alter type public.report_section_key add value if not exists 'point_cloud_classification';
alter type public.report_section_key add value if not exists 'property_overview';
alter type public.report_section_key add value if not exists 'roof_plan_annotated';
alter type public.report_section_key add value if not exists 'scope_limitations';
alter type public.report_section_key add value if not exists 'sensor_limitations';
alter type public.report_section_key add value if not exists 'stockpile_inventory';
alter type public.report_section_key add value if not exists 'storm_history';
alter type public.report_section_key add value if not exists 'viewshed_los';

-- =====================================================================
-- POST-APPLY VERIFICATION (run separately)
-- select count(*) from pg_enum e
--   join pg_type t on t.oid = e.enumtypid
--  where t.typname = 'report_section_key';        -- expect 42 (was 19)
-- =====================================================================
