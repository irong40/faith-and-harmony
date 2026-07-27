-- M3 — populate drone_deliverables from the paths sortie already writes.
--
-- crm_sync.mark_complete() PATCHes output_path, orthophoto_path,
-- pointcloud_path, model_file_path (and share_delivery_folder() writes
-- delivery_drive_url) onto drone_jobs. Nothing has ever turned those into
-- drone_deliverables rows, so the Delivery Review deliverables list has been
-- empty for every mission ever flown. A DB trigger sourced from columns sortie
-- ALREADY writes closes this with ZERO sortie change — no new endpoint, no new
-- field, nothing for crm_sync.py to swallow.
--
-- output_path / orthophoto_path / pointcloud_path / model_file_path are LOCAL
-- RIG PATHS (E:\Portfolio\HempHavenLand\orthophoto.tif), not URLs. They go into
-- file_paths and download_url stays NULL so the UI does not render a dead link.
-- Only delivery_drive_url is a real URL, and only that row gets download_url.
--
-- file_count / total_size_bytes are deliberately left at their defaults (0):
-- the DB cannot know them, and DeliveryReview renders `{d.file_count && ...}`,
-- so 0 renders nothing rather than a wrong "1 files".
--
-- SORTIE CONTRACT: reads five drone_jobs columns, renames nothing, alters no
-- FK, touches no enum, adds no NOT NULL. The trigger is AFTER, so it cannot
-- change what sortie wrote.
--
-- additive   : yes — one unique index, one function, one trigger, one backfill
-- idempotent : yes — create unique index if not exists / create or replace /
--              drop trigger if exists + create / backfill is an upsert on
--              (job_id, name)
-- reversible : yes —
--                drop trigger if exists trg_sync_drone_deliverables on public.drone_jobs;
--                drop function if exists public.sync_drone_deliverables();
--                drop index if exists public.drone_deliverables_job_name_uidx;
--                delete from drone_deliverables where name in (...names below...);
--
-- verification:
--   select indexname from pg_indexes
--    where schemaname='public' and indexname='drone_deliverables_job_name_uidx';
--   select j.job_number, d.name, d.file_paths, d.download_url
--     from drone_deliverables d join drone_jobs j on j.id = d.job_id
--    order by j.job_number, d.name;
--   -- as of 2026-07-27 exactly one job has any of the five columns populated:
--   -- SAI-SPEC-010 carries output_path, orthophoto_path AND pointcloud_path,
--   -- so the backfill yields THREE rows (the brief said two — pointcloud_path
--   -- is also set: E:\Portfolio\HempHavenLand\georeferenced_model.laz).

-- ---------------------------------------------------------------------------
-- 1. the upsert target. No unique index existed on (job_id, name).
-- ---------------------------------------------------------------------------

create unique index if not exists drone_deliverables_job_name_uidx
  on public.drone_deliverables (job_id, name);

-- ---------------------------------------------------------------------------
-- 2. sync function
-- ---------------------------------------------------------------------------

create or replace function public.sync_drone_deliverables()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into drone_deliverables (job_id, name, description, file_paths, download_url)
  select
    new.id,
    v.name,
    v.description,
    case when v.is_url then '{}'::text[] else array[v.src] end,
    case when v.is_url then v.src else null end
  from (values
    ('Processed Output Folder',
     'ODM output directory on the processing rig',
     nullif(btrim(coalesce(new.output_path, '')), ''),      false),
    ('Orthophoto',
     'Georeferenced orthomosaic (GeoTIFF) on the processing rig',
     nullif(btrim(coalesce(new.orthophoto_path, '')), ''),  false),
    ('Point Cloud',
     'Georeferenced point cloud (LAS/LAZ) on the processing rig',
     nullif(btrim(coalesce(new.pointcloud_path, '')), ''),  false),
    ('3D Model',
     'Textured mesh / 3D model on the processing rig',
     nullif(btrim(coalesce(new.model_file_path, '')), ''),  false),
    ('Client Drive Folder',
     'Shared Google Drive folder delivered to the client',
     nullif(btrim(coalesce(new.delivery_drive_url, '')), ''), true)
  ) as v(name, description, src, is_url)
  where v.src is not null
  on conflict (job_id, name) do update
    set description  = excluded.description,
        file_paths   = excluded.file_paths,
        download_url = excluded.download_url;

  return null;

exception
  when others then
    -- AFTER trigger inside sortie's PATCH transaction. A deliverables bookkeeping
    -- failure must never roll back the processing result crm_sync just wrote —
    -- crm_sync.update_mission() swallows the HTTP error, so the rig would go
    -- silently dark instead of reporting anything.
    raise log '[sync_drone_deliverables] failed for job %: % (SQLSTATE %)', new.id, sqlerrm, sqlstate;
    return null;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. trigger — only the five columns sortie writes
-- ---------------------------------------------------------------------------

drop trigger if exists trg_sync_drone_deliverables on public.drone_jobs;

create trigger trg_sync_drone_deliverables
after insert or update of
  output_path, orthophoto_path, pointcloud_path, model_file_path, delivery_drive_url
on public.drone_jobs
for each row
execute function public.sync_drone_deliverables();

-- ---------------------------------------------------------------------------
-- 4. backfill existing rows
-- ---------------------------------------------------------------------------

insert into public.drone_deliverables (job_id, name, description, file_paths, download_url)
select
  j.id,
  v.name,
  v.description,
  case when v.is_url then '{}'::text[] else array[v.src] end,
  case when v.is_url then v.src else null end
from public.drone_jobs j
cross join lateral (values
  ('Processed Output Folder',
   'ODM output directory on the processing rig',
   nullif(btrim(coalesce(j.output_path, '')), ''),        false),
  ('Orthophoto',
   'Georeferenced orthomosaic (GeoTIFF) on the processing rig',
   nullif(btrim(coalesce(j.orthophoto_path, '')), ''),    false),
  ('Point Cloud',
   'Georeferenced point cloud (LAS/LAZ) on the processing rig',
   nullif(btrim(coalesce(j.pointcloud_path, '')), ''),    false),
  ('3D Model',
   'Textured mesh / 3D model on the processing rig',
   nullif(btrim(coalesce(j.model_file_path, '')), ''),    false),
  ('Client Drive Folder',
   'Shared Google Drive folder delivered to the client',
   nullif(btrim(coalesce(j.delivery_drive_url, '')), ''), true)
) as v(name, description, src, is_url)
where v.src is not null
on conflict (job_id, name) do update
  set description  = excluded.description,
      file_paths   = excluded.file_paths,
      download_url = excluded.download_url;
