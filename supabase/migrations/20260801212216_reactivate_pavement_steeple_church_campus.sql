-- =====================================================================
-- Reactivate pavement / steeple / church_campus processing templates
--
-- 20260730150000 inserted these three rows with active = true. An
-- ad-hoc UPDATE on 2026-07-31 00:44:47 UTC (no migration file) switched
-- all three to active = false, because the matching sortie side was
-- still on branch feat/sortie-gui at the time. That header said the two
-- must ship together, and they hadn't.
--
-- The gate is now closed: PortfolioMaker main carries
--   odm_presets.JOB_TYPES        -> pavement, steeple, church_campus
--   odm_presets.PRESETS          -> all three, report_type set
--   crm_sync.PRESET_TO_JOB_TYPE  -> all three map to themselves
--   crm_sync.REPORT_TEMPLATE_CODES -> pavement_pci, steeple_inspection,
--                                     church_campus_survey
-- and the three report_templates rows are live and is_active
-- (17 / 16 / 21 sections, matching the 20260730150000 verification block).
--
-- Because the deactivation was never a migration, a rebuild from
-- migrations alone would already produce active = true. This file exists
-- so the live state and the migration history agree rather than agreeing
-- by accident, and so the reactivation is auditable.
--
-- Applied live 2026-08-01 21:02:34 UTC against qjpujskwqaehxnqypxzu.
-- =====================================================================

update processing_templates
   set active = true,
       updated_at = now()
 where preset_name in ('pavement', 'steeple', 'church_campus')
   and active is distinct from true;


-- =====================================================================
-- POST-APPLY VERIFICATION (run separately)
-- =====================================================================
-- select preset_name, path_code, display_name, active
--   from processing_templates
--  where preset_name in ('pavement','steeple','church_campus');
--   -- expect 3 rows, all active = true
--
-- -- every active preset must have a PRESET_TO_JOB_TYPE key on the sortie
-- -- side, otherwise the CRM offers a job type sortie cannot prefill and
-- -- the operator processes it under whatever radio was last selected:
-- select preset_name from processing_templates where active order by preset_name;
--   -- expect 22 rows; diff against crm_sync.PRESET_TO_JOB_TYPE keys
