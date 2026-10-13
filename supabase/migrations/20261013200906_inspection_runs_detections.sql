-- Unified surface inspection (PRD v2.0) E4 storage: one run row per pipeline run,
-- one detection row per E1 detection, the same two tables for all four profiles.
-- Drafted 2026-10-13 and approved by Adam the same day. Design notes and the
-- local test: obsidian-dev/projects/sentinel-aerial/unified-inspection/schema-draft/.
--
-- Written by Sortie with the service key (bypasses RLS). Read by admins, and by
-- the pilot of a linked drone job. The review gate's state lives HERE: n8n only
-- delivers the "ready for review" notice. A run cannot reach awaiting_review
-- until every detection it declared has arrived, and once review starts its
-- detections cannot change except for the operator's own verdict.
--
-- Geometry is stored as WKT in the survey CRS plus GeoJSON in WGS84, the same
-- choice as vegetation_detections: PostGIS is available on this project but not
-- enabled, and enabling it on the shared instance is a separate decision.

create table if not exists public.inspection_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,                 -- idempotency key, e.g. profile/site/date/run-001
  drone_job_id uuid null references public.drone_jobs(id) on delete set null,
  profile text not null check (profile in ('cemetery', 'canopy', 'roof', 'pavement')),
  status text not null default 'uploading'
    check (status in ('uploading', 'awaiting_review', 'approved', 'rejected', 'failed')),
  expected_detections int not null check (expected_detections >= 0),
  ortho_path text not null,
  crs_wkt text not null,                        -- CRS of every geometry_wkt in this run
  gsd_m numeric(10, 5) not null check (gsd_m > 0),
  documented_extent_geojson jsonb not null,     -- WGS84
  documented_extent_m2 numeric(14, 1) not null check (documented_extent_m2 >= 0),
  profile_settings jsonb not null,              -- the e1/e3/e4 blocks exactly as run
  e1_summary jsonb not null,
  e3_summary jsonb null,                        -- null for profiles with no E3 yet
  outputs jsonb null,                           -- E4 manifest: files and their sha256
  code_version text not null,                   -- Sortie commit that produced the run
  review_requested_at timestamptz null,
  reviewed_at timestamptz null,
  reviewed_by text null,                        -- approver identity (email or user id)
  review_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Reviewed runs carry both stamps; every other run carries neither, so a stray
  -- reviewed_at can never make an unreviewed run look half-approved.
  constraint inspection_runs_review_complete check (
    case when status in ('approved', 'rejected')
         then reviewed_at is not null and reviewed_by is not null
         else reviewed_at is null and reviewed_by is null end)
);

create index if not exists inspection_runs_drone_job_id_idx on public.inspection_runs (drone_job_id);
create index if not exists inspection_runs_awaiting_idx on public.inspection_runs (created_at)
  where status = 'awaiting_review';

create table if not exists public.inspection_detections (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.inspection_runs(id) on delete cascade,
  detection_key text not null,                  -- E1 index or E3 crown id, stable within a run
  label text not null,
  detector_score real null check (detector_score between 0 and 1),
  truncated boolean not null default false,
  geometry_wkt text not null,                   -- survey CRS (inspection_runs.crs_wkt)
  geometry_geojson jsonb not null,              -- WGS84
  centroid_lat double precision not null check (centroid_lat between -90 and 90),
  centroid_lon double precision not null check (centroid_lon between -180 and 180),
  area_m2 double precision not null check (area_m2 >= 0),
  e3_status text null check (e3_status in ('scored', 'unscored')),
  e3_reason text null,
  e3_rank int null check (e3_rank >= 1),
  outlier boolean not null default false,
  metrics jsonb not null default '{}'::jsonb,   -- e.g. vari_median, exg_median
  classification jsonb null,                    -- E2, not built yet
  operator_verdict text not null default 'pending'
    check (operator_verdict in ('pending', 'confirmed', 'rejected')),
  operator_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, detection_key),
  -- Only a scored detection can be an E3 outlier, and an unscored one says why.
  constraint inspection_detections_outlier_scored check (not outlier or e3_status = 'scored'),
  constraint inspection_detections_reason check (
    (e3_status is distinct from 'unscored') = (e3_reason is null))
);

create index if not exists inspection_detections_run_id_idx on public.inspection_detections (run_id);
create index if not exists inspection_detections_outliers_idx on public.inspection_detections (run_id)
  where outlier;

-- ─── Gate: run status transitions ─────────────────────────────────────────

create or replace function public.inspection_runs_guard()
returns trigger language plpgsql set search_path to 'public' as $$
declare
  arrived int;
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'uploading' and new.status in ('awaiting_review', 'failed')) or
      (old.status = 'awaiting_review' and new.status in ('approved', 'rejected', 'failed')) or
      (old.status = 'failed' and new.status = 'uploading')
    ) then
      raise exception 'inspection run %: % -> % is not an allowed transition',
        old.id, old.status, new.status;
    end if;
    if new.status = 'awaiting_review' then
      select count(*) into arrived from public.inspection_detections where run_id = new.id;
      if arrived <> new.expected_detections then
        raise exception 'inspection run %: % of % detections uploaded; cannot open review',
          new.id, arrived, new.expected_detections;
      end if;
      new.review_requested_at := now();
    end if;
    if new.status in ('approved', 'rejected') then
      if coalesce(btrim(new.reviewed_by), '') = '' then
        raise exception 'inspection run %: % needs reviewed_by', new.id, new.status;
      end if;
      new.reviewed_at := now();
    end if;
  elsif old.status in ('approved', 'rejected')
     and (to_jsonb(new) - 'review_notes' - 'updated_at')
         is distinct from (to_jsonb(old) - 'review_notes' - 'updated_at') then
    -- A reviewed run is a record: only a note may be added afterwards.
    raise exception 'inspection run %: a % run is closed', old.id, old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists inspection_runs_guard on public.inspection_runs;
create trigger inspection_runs_guard
  before update on public.inspection_runs
  for each row execute function public.inspection_runs_guard();

-- ─── Gate: detections are frozen once review opens ────────────────────────

create or replace function public.inspection_detections_guard()
returns trigger language plpgsql set search_path to 'public' as $$
declare
  run_status text;
begin
  select status into run_status from public.inspection_runs
    where id = coalesce(new.run_id, old.run_id);
  if run_status is null then
    -- Parent row already gone: this is the ON DELETE CASCADE from the run.
    return coalesce(new, old);
  end if;
  if run_status in ('uploading', 'failed') then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and run_status = 'awaiting_review'
     and (to_jsonb(new) - 'operator_verdict' - 'operator_note' - 'updated_at')
       = (to_jsonb(old) - 'operator_verdict' - 'operator_note' - 'updated_at') then
    return new;  -- the operator recording a verdict is the one change review allows
  end if;
  raise exception 'inspection run % is %: its detections cannot be %',
    coalesce(new.run_id, old.run_id), run_status,
    case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'changed' else 'removed' end;
end;
$$;

drop trigger if exists inspection_detections_guard on public.inspection_detections;
create trigger inspection_detections_guard
  before insert or update or delete on public.inspection_detections
  for each row execute function public.inspection_detections_guard();

-- ─── updated_at ───────────────────────────────────────────────────────────

drop trigger if exists inspection_runs_updated_at on public.inspection_runs;
create trigger inspection_runs_updated_at
  before update on public.inspection_runs
  for each row execute function public.update_updated_at_column();

drop trigger if exists inspection_detections_updated_at on public.inspection_detections;
create trigger inspection_detections_updated_at
  before update on public.inspection_detections
  for each row execute function public.update_updated_at_column();

-- ─── RLS: same shape as mapping_runs ──────────────────────────────────────

alter table public.inspection_runs enable row level security;
alter table public.inspection_detections enable row level security;

revoke all on public.inspection_runs from anon;
revoke all on public.inspection_detections from anon;

drop policy if exists "Admins manage inspection runs" on public.inspection_runs;
create policy "Admins manage inspection runs" on public.inspection_runs
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Pilots read own inspection runs" on public.inspection_runs;
create policy "Pilots read own inspection runs" on public.inspection_runs
  for select to authenticated
  using (exists (select 1 from public.drone_jobs j
                 where j.id = inspection_runs.drone_job_id and j.pilot_id = auth.uid()));

drop policy if exists "Admins manage inspection detections" on public.inspection_detections;
create policy "Admins manage inspection detections" on public.inspection_detections
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Pilots read own inspection detections" on public.inspection_detections;
create policy "Pilots read own inspection detections" on public.inspection_detections
  for select to authenticated
  using (exists (select 1 from public.inspection_runs r
                 join public.drone_jobs j on j.id = r.drone_job_id
                 where r.id = inspection_detections.run_id and j.pilot_id = auth.uid()));

comment on table public.inspection_runs is
  'Unified surface inspection runs (PRD v2.0 E1-E4). Review state is authoritative here; n8n only notifies.';
comment on table public.inspection_detections is
  'One row per E1 detection, with E3 scores. Frozen once the run opens for review, except operator_verdict/operator_note.';
