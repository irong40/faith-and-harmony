-- =====================================================================
-- Gaussian splat processing preset (Path C+3D)
-- Target: Supabase FaithandHarmonyAPP (qjpujskwqaehxnqypxzu)
--
-- WHY: sortie has shipped a first-class `gaussian_splat` job type since the
-- OpenSplat cutover (2026-07-23) — odm_presets.py JOB_TYPES + PRESETS, engine
-- "opensplat", report_type "gaussian_splat" — but processing_templates has no
-- matching row, so it never appears in either CRM dropdown
-- (src/pages/admin/JobIntake.tsx, src/pages/admin/DroneJobDetail.tsx, both of
-- which filter on active = true). An operator booking a 3D job could not find
-- a 3D option: the closest row, 'Public Safety — scene reconstruction'
-- (C+PS, added by 20260727141229), does not read as 3D when scanning the list.
-- This adds the missing row and leads the display_name with "3D".
--
-- ⚠ Pairs with a sortie-side change: "gaussian_splat" must also be present in
-- PRESET_TO_JOB_TYPE in crm_sync.py on the desktop rig, or the mission-dropdown
-- prefill silently returns no job type — the same failure class as the NULL
-- template bug fixed 2026-07-13 and the panorama miss logged in LOOP-LOG.md.
--
-- ⚠ There is no report_templates row for gaussian_splat (verified 2026-07-27:
-- 22 codes, none of them a splat; the 8 added by 20260727141229 did not close
-- this gap). Booking this template therefore produces NO CRM report draft:
-- crm_sync.push_report logs "No CRM report template for job type ..." and
-- returns None, while mark_complete still writes status/output_path/
-- deliverables back and sortie still generates the local PDF. Operators will
-- see a completed job with deliverables and an empty Reports tab until a
-- report_templates row plus a REPORT_TEMPLATE_CODES entry are added.
--
-- Deliverable wording is deliberately literal: OpenSplat emits splat.ply +
-- cameras.json and nothing else (opensplat_service.py hard-codes gs_sog_dir =
-- None). There is NO bundled web viewer — unlike the panorama path, which does
-- ship Pannellum files. display_name/description are rendered to the operator
-- at booking time (JobIntake.tsx) and on the job card (DroneJobDetail.tsx), so
-- they must not promise a viewer link that delivery cannot include.
--
-- Properties: additive only, single statement, and idempotent for the row it
-- creates (re-running never adds a second gaussian_splat/C+3D row). It is NOT
-- idempotent against drift — see the path_code note below.
-- No inner begin/commit — the migration runner wraps the transaction.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The preset row
--
--    Guarded by NOT EXISTS rather than ON CONFLICT: there is NO unique index
--    on preset_name, so ON CONFLICT (preset_name) would raise "no unique or
--    exclusion constraint matching". The table does carry two PARTIAL unique
--    indexes, neither of which covers preset_name:
--      idx_processing_templates_path_code
--        (path_code) WHERE path_code IS NOT NULL AND active = true
--      idx_processing_templates_active_package
--        (package_id) WHERE active = true
--    The package_id one cannot bite here — package_id is NULL and Postgres
--    treats NULLs as distinct — which is why the five NULL-package rows from
--    20260727141229 applied cleanly.
--
--    The path_code one is NOT covered by the guard below, which keys on
--    (preset_name, path_code). No row holds path_code 'C+3D' today, so this
--    applies cleanly; the exposure is a re-run AFTER someone else has taken
--    'C+3D'. That collision is intended to fail loudly rather than be skipped
--    silently — two active templates disagreeing about what C+3D means is a
--    conflict for a human, not something a migration should paper over.
--
--    This guard is load-bearing, not decorative. The table already carries
--    duplicate preset_name rows from earlier unguarded seeds (adiat x3,
--    mapping x2, construction x2). Re-running this file must not add a
--    fourth class of duplicate.
--
--    Columns deliberately omitted — they take table defaults and restating
--    them would only invite drift:
--      package_id (null)     qa_threshold (70)      adiat_enabled (false)
--      raw_workflow (false)  video_included (false) default_steps ('[]')
--      step_definitions ('[]')
--
--    output_format 'ply' is accurate here rather than the 'geotiff' used by
--    the photogrammetry presets: the splat deliverable is a point-based .ply,
--    not a raster. The column is free TEXT (no CHECK constraint) and is
--    display-only in the app (ProcessingTemplates.tsx renders it verbatim);
--    sortie does not read it at all.
-- ---------------------------------------------------------------------

insert into processing_templates
  (preset_name, path_code, display_name, description, output_format, active, vegetation_enabled)
select v.preset_name, v.path_code, v.display_name, v.description, v.output_format, true, v.veg
from (values
  ('gaussian_splat', 'C+3D', '3D Gaussian Splat — photoreal 3D model (.ply)',
   'NodeODM structure-from-motion followed by OpenSplat GPU training, producing a 3D Gaussian splat (.ply) plus camera poses. No viewer is bundled: the client opens the PLY in SuperSplat, Luma AI or Polycam. Use where the client wants a photoreal, navigable 3D capture rather than an orthomosaic or a mesh.',
   'ply', false)
) as v(preset_name, path_code, display_name, description, output_format, veg)
where not exists (
  select 1 from processing_templates pt
  where pt.preset_name = v.preset_name
    and pt.path_code is not distinct from v.path_code
);



-- =====================================================================
-- POST-APPLY VERIFICATION (run separately, expect the stated results)
-- =====================================================================
-- -- the row exists exactly once and is dropdown-visible:
-- select preset_name, path_code, display_name, output_format, active
-- from processing_templates where preset_name = 'gaussian_splat';
--                                          -- expect exactly 1 row, active = t
--
-- -- re-running this migration must not change that count:
-- select preset_name, count(*) from processing_templates
-- group by 1 having count(*) > 1;
--                                          -- expect the KNOWN pre-existing
--                                          -- dupes only (adiat 3, mapping 2,
--                                          -- construction 2) and NOT
--                                          -- gaussian_splat
--
-- -- sortie round-trip: after adding "gaussian_splat" to PRESET_TO_JOB_TYPE,
-- -- crm_sync.CrmMission.suggested_job_type() must return 'gaussian_splat'
-- -- for a job on this template.
-- =====================================================================
