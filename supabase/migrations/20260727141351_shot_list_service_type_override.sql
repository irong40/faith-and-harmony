-- Allow explicit service_type when (re)generating a shot list, e.g.
-- select generate_job_shot_list('<job>', true, 'cemetery');
-- Needed because the 8 new verticals have no property_type mapping or package yet.
drop function if exists public.generate_job_shot_list(uuid, boolean);
create or replace function public.generate_job_shot_list(p_job_id uuid, p_force boolean default false, p_service_type text default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_job drone_jobs%rowtype;
  v_manifest jsonb;
  v_source text;
  v_service text := p_service_type;
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

  -- explicit service type skips package resolution
  if v_service is null and v_job.package_id is not null then
    select shot_manifest, service_type into v_manifest, v_service
    from drone_packages where id = v_job.package_id;
    if v_manifest is not null and jsonb_array_length(v_manifest) > 0 then
      v_source := 'package';
    else
      v_manifest := null;
    end if;
  end if;

  if v_manifest is null then
    v_service := coalesce(nullif(v_service, ''), case
      when v_job.property_type = 'land' then 'land_listing'
      when v_job.property_type in ('residential','commercial') then 're_aerial'
      when v_job.property_type = 'wildlife_census' then 'wildlife_census'
      else 'generic' end);
    select items into v_manifest from shot_list_templates
    where service_type = v_service and is_active;
    v_source := 'service_template';
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
