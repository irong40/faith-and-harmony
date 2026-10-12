-- Sortie mapping branch run log: one row per mapping job (Step 7).
-- Proposed 2026-10-11, approved in principle by Adam (decision 9); applied only
-- after he sees this file. Written by Sortie with the service key; read by admins
-- and by the pilot of a linked drone job.

create table if not exists public.mapping_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique,              -- run folder slug, e.g. site/date/mapping_full-run-001
  drone_job_id uuid null references public.drone_jobs(id) on delete set null,
  job_number text null,                      -- snapshot for readability only
  output_dir text not null,
  photo_count int not null,
  exposure_normalized boolean not null default false,
  metadata_gate text not null check (metadata_gate in ('pass', 'fail', 'skipped')),
  metadata_gate_failures jsonb null,         -- {"file": ["field", ...]}
  odm_task_ids jsonb null,                   -- {"mapping": uuid, "mesh": uuid, "sfm": uuid}
  odm_seconds int null,                      -- NodeODM processing time, all tasks
  opensplat_seconds int null,
  opensplat_iterations int null,
  hand_repair boolean not null default false,
  hand_repair_notes text null,
  ingest_at timestamptz not null,            -- drone_jobs.ingested_at if linked, else Step 1 start
  outputs_at timestamptz null,
  total_hours numeric generated always as
    (round((extract(epoch from (outputs_at - ingest_at)) / 3600.0)::numeric, 2)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mapping_runs_drone_job_id_idx on public.mapping_runs (drone_job_id);

drop trigger if exists mapping_runs_updated_at on public.mapping_runs;
create trigger mapping_runs_updated_at
  before update on public.mapping_runs
  for each row execute function public.update_updated_at_column();

alter table public.mapping_runs enable row level security;

revoke all on public.mapping_runs from anon;

drop policy if exists "Admins manage mapping runs" on public.mapping_runs;
create policy "Admins manage mapping runs" on public.mapping_runs
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Pilots read own mapping runs" on public.mapping_runs;
create policy "Pilots read own mapping runs" on public.mapping_runs
  for select to authenticated
  using (exists (select 1 from public.drone_jobs j
                 where j.id = mapping_runs.drone_job_id and j.pilot_id = auth.uid()));
