-- =====================================================================
-- drone_jobs.deliver_flight_tracks — per-job gate on operational detail
--
-- GIS delivery itself is NOT a toggle: it is derived from whether the
-- preset produces an orthomosaic (sortie odm_presets.delivers_gis, policy
-- Adam 2026-07-30). That question is about processing and stays automatic.
--
-- This column answers a DIFFERENT question — whether THIS client, for
-- THIS site, should receive the operational detail inside the GIS bundle.
-- It is a client/site property, not a processing property, which is why
-- it lives on the job rather than on the preset.
--
-- Split, per the 2026-07-30 review:
--   photo_points.geojson / .csv  — ALWAYS delivered. Coverage evidence:
--     proof SAI flew the whole site. Nothing sensitive.
--   flight_tracks.geojson / mission.kml — gated by this column. These
--     expose the exact approach path, altitudes, pass count and time on
--     site. For a corrections perimeter or a classified area that is
--     information the client may not want leaving their custody.
--
-- Default true: current behaviour for every existing and ordinary job.
-- Withheld tracks are still written to the internal _gis/ directory, so
-- SAI keeps its own records — they just do not ship.
--
-- NOT auto-defaulted for corrections/classified work: drone_jobs has no
-- link to report_templates (only processing_template_id), and neither
-- corrections_perimeter nor classified_area has a processing_templates
-- row today, so there is nothing to key an automatic default off. When
-- those service lines get processing templates, revisit this with a
-- trigger or a column on processing_templates.
-- =====================================================================

alter table public.drone_jobs
  add column if not exists deliver_flight_tracks boolean not null default true;

comment on column public.drone_jobs.deliver_flight_tracks is
  'Whether flight_tracks.geojson and mission.kml ship to the client. Photo points always ship. False routes tracks to internal _gis/ instead. Set false for corrections, classified or any site where approach path and altitude are sensitive.';


-- =====================================================================
-- POST-APPLY VERIFICATION (run separately)
-- =====================================================================
-- select count(*) filter (where deliver_flight_tracks) as delivering,
--        count(*) filter (where not deliver_flight_tracks) as withheld
--   from drone_jobs;
--   -- expect every existing row in `delivering` — default true, no backfill
