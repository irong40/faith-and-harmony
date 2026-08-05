-- All 15 drone_assets rows were seeded demo data whose files have never existed
-- in storage. Every one is verified orphaned: no object in the drone-jobs
-- bucket matches its file_path, and none matches its file_name at any prefix.
--
-- They are synthetic, not a lost upload:
--   * camera_model 'Zenmuse H30T' on all 15 -- SAI owns no thermal payload
--   * file_size exactly 2048000 bytes on all 15
--   * names T1..T12_THERMAL_%.RJPEG across thermal/flight1..4
--   * coverage_tag transect_N_start|mid|end, a wildlife-census shape
--   * qa_status 'passed' with qa_results null, created in one 2026-04-16 batch
--
-- They all hang off DJ-2026-0003, which is status 'cancelled' with no client,
-- so nothing references them and no deliverable depends on them. Left in place
-- they make any asset count report 15 files that cannot be opened, which is the
-- kind of number that gets quoted before it gets checked.
--
-- Scoped to rows whose object is genuinely absent rather than a blanket delete,
-- so a real asset could never be caught by this even if one arrived between
-- writing and running.
--
-- Full row backup taken before this ran (scratchpad
-- drone_assets_backup_2026-08-05.json, 15 rows).
--
-- Verified after: 0 assets remain, 0 orphans remain, and the drone-jobs bucket
-- still holds its 1 real object (branding/sentinel-logo.png).

delete from public.drone_assets a
where not exists (
  select 1 from storage.objects o
  where o.bucket_id = 'drone-jobs'
    and o.name = a.file_path
);
