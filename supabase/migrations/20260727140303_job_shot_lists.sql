-- =====================================================================
-- JOB SHOT LISTS — auto-generated capture checklist per mission
-- When a drone_job is inserted, a shot list is created so the operator
-- knows every shot needed before the data leaves the site / gets processed.
-- Resolution order: package.shot_manifest -> shot_list_templates by
-- service_type -> generic template.
-- Additive only, idempotent, transaction-wrapped by migration runner.
-- =====================================================================

-- 1. Templates keyed by service_type (aligned to report_templates.service_type)
create table if not exists public.shot_list_templates (
  id uuid primary key default gen_random_uuid(),
  service_type text not null unique,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Per-job checkable shot items
create table if not exists public.job_shot_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.drone_jobs(id) on delete cascade,
  seq integer not null,
  group_label text,
  shot_name text not null,
  shot_type text not null default 'photo',
  required boolean not null default true,
  is_captured boolean not null default false,
  captured_at timestamptz,
  note text,
  source text not null default 'service_template',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_job_shot_items_job on public.job_shot_items(job_id);

-- 3. Map existing packages to service types (additive column)
alter table public.drone_packages add column if not exists service_type text;
update public.drone_packages p set service_type = v.st
from (values
  ('ROOF_INSPECTION','roof_inspection'),
  ('INSURANCE_DOC','roof_inspection'),
  ('SOLAR_INSPECTION','solar'),
  ('CONSTRUCTION_450','construction'),
  ('PROGRESS_800','construction'),
  ('LAND_SURVEY','property_survey'),
  ('COMMERCIAL_850','re_aerial'),
  ('LISTING_LITE_225','re_aerial'),
  ('LISTING_PRO_450','re_aerial'),
  ('LUXURY_750','re_aerial'),
  ('PHOTO_495','re_aerial'),
  ('PHOTO_VIDEO_795','re_aerial'),
  ('PREMIUM_1250','re_aerial')
) v(code, st)
where p.code = v.code and p.service_type is distinct from v.st;

-- 4. updated_at + captured_at maintenance
create or replace function public.job_shot_items_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.is_captured and not old.is_captured then
    new.captured_at := coalesce(new.captured_at, now());
  elsif not new.is_captured then
    new.captured_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_job_shot_items_touch on public.job_shot_items;
create trigger trg_job_shot_items_touch before update on public.job_shot_items
for each row execute function public.job_shot_items_touch();

-- 5. Generator: package manifest -> service template -> generic
create or replace function public.generate_job_shot_list(p_job_id uuid, p_force boolean default false)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_job drone_jobs%rowtype;
  v_manifest jsonb;
  v_source text;
  v_service text;
  v_seq int := 0;
  v_group jsonb;
  v_shot jsonb;
  v_count int := 0;
begin
  select * into v_job from drone_jobs where id = p_job_id;
  if not found then return 0; end if;

  if exists (select 1 from job_shot_items where job_id = p_job_id) then
    if p_force then
      delete from job_shot_items
      where job_id = p_job_id and source <> 'manual' and is_captured = false;
    else
      return 0;
    end if;
  end if;

  -- 5a. package shot manifest wins
  if v_job.package_id is not null then
    select shot_manifest, service_type into v_manifest, v_service
    from drone_packages where id = v_job.package_id;
    if v_manifest is not null and jsonb_array_length(v_manifest) > 0 then
      v_source := 'package';
    else
      v_manifest := null;
    end if;
  end if;

  -- 5b. service-type template
  if v_manifest is null then
    v_service := coalesce(nullif(v_service, ''), case
      when v_job.property_type = 'land' then 'land_listing'
      when v_job.property_type in ('residential','commercial') then 're_aerial'
      when v_job.property_type = 'wildlife_census' then 'wildlife_census'
      else 'generic' end);
    select items into v_manifest from shot_list_templates
    where service_type = v_service and is_active;
    v_source := 'service_template';
    -- 5c. generic fallback
    if v_manifest is null then
      select items into v_manifest from shot_list_templates
      where service_type = 'generic' and is_active;
      v_source := 'generic';
    end if;
  end if;

  if v_manifest is null then return 0; end if;

  for v_group in select value from jsonb_array_elements(v_manifest) loop
    for v_shot in select value from jsonb_array_elements(coalesce(v_group->'shots','[]'::jsonb)) loop
      v_seq := v_seq + 10;
      insert into job_shot_items (job_id, seq, group_label, shot_name, shot_type, required, source)
      values (p_job_id, v_seq, v_group->>'group', v_shot->>'name',
              coalesce(v_shot->>'type','photo'),
              coalesce((v_shot->>'required')::boolean, true),
              v_source);
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end $$;

-- 6. Trigger: every new mission gets its shot list
create or replace function public.trg_drone_job_create_shot_list()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform generate_job_shot_list(new.id);
  return new;
end $$;
drop trigger if exists trg_drone_job_shot_list on public.drone_jobs;
create trigger trg_drone_job_shot_list after insert on public.drone_jobs
for each row execute function public.trg_drone_job_create_shot_list();

-- 7. Readiness view (checklist only — no status gating)
create or replace view public.v_job_shot_readiness
with (security_invoker = on) as
select j.id as job_id, j.job_number, j.status, j.scheduled_date,
  count(i.id) as total_shots,
  count(i.id) filter (where i.required) as required_shots,
  count(i.id) filter (where i.required and i.is_captured) as captured_required,
  count(i.id) filter (where i.required and not i.is_captured) as missing_required,
  (count(i.id) filter (where i.required and not i.is_captured)) = 0 as capture_ready
from drone_jobs j
join job_shot_items i on i.job_id = j.id
where j.status not in ('delivered','cancelled','failed','photos_delivered')
group by j.id, j.job_number, j.status, j.scheduled_date;

-- 8. RLS — mirror drone_jobs pattern (admin manage, pilots own missions)
alter table public.shot_list_templates enable row level security;
alter table public.job_shot_items enable row level security;

drop policy if exists "Admins manage shot list templates" on public.shot_list_templates;
create policy "Admins manage shot list templates" on public.shot_list_templates
  for all using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Authenticated read active shot templates" on public.shot_list_templates;
create policy "Authenticated read active shot templates" on public.shot_list_templates
  for select using (is_active and auth.uid() is not null);

drop policy if exists "Admins manage job shot items" on public.job_shot_items;
create policy "Admins manage job shot items" on public.job_shot_items
  for all using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Pilots view own mission shot items" on public.job_shot_items;
create policy "Pilots view own mission shot items" on public.job_shot_items
  for select using (exists (
    select 1 from drone_jobs j where j.id = job_id and j.pilot_id = auth.uid()));

drop policy if exists "Pilots update own mission shot items" on public.job_shot_items;
create policy "Pilots update own mission shot items" on public.job_shot_items
  for update using (exists (
    select 1 from drone_jobs j where j.id = job_id and j.pilot_id = auth.uid()))
  with check (exists (
    select 1 from drone_jobs j where j.id = job_id and j.pilot_id = auth.uid()));
