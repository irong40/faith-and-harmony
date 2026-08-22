-- Atomic queue operations for the Substack review worker.
-- Every function is service-role only and records state changes in the audit log.

create or replace function public.enforce_substack_review_version_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  transition_is_legal boolean;
  token_rotation_is_authorized boolean :=
    current_setting('app.substack_review_token_rotation', true) = 'on';
begin
  if new.draft_id is distinct from old.draft_id
    or new.version is distinct from old.version
    or new.selected_headline is distinct from old.selected_headline
    or new.subtitle is distinct from old.subtitle
    or new.article_markdown is distinct from old.article_markdown
    or new.notes_teaser is distinct from old.notes_teaser
    or new.subscribe_call is distinct from old.subscribe_call
    or new.source_path is distinct from old.source_path
    or new.content_hash is distinct from old.content_hash
    or (
      new.token_hash is distinct from old.token_hash
      and not (
        token_rotation_is_authorized
        and old.status = 'pending_review'
        and new.status = 'pending_review'
        and old.review_sent_at is null
      )
    )
    or new.review_email is distinct from old.review_email
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Reviewed content is immutable';
  end if;

  if new.status is distinct from old.status then
    transition_is_legal := case old.status
      when 'pending_review' then new.status in (
        'changes_requested', 'approved', 'expired', 'superseded'
      )
      when 'changes_requested' then new.status = 'superseded'
      when 'approved' then new.status in ('publishing', 'superseded')
      when 'publishing' then new.status in ('published', 'verification_failed')
      when 'verification_failed' then new.status in ('publishing', 'superseded')
      else false
    end;

    if not transition_is_legal then
      raise exception 'Illegal Substack review status transition from % to %',
        old.status,
        new.status;
    end if;
  end if;

  if new.status = 'changes_requested' and (
    new.requested_at is null
    or new.requested_changes is null
    or length(btrim(new.requested_changes)) = 0
  ) then
    raise exception 'A change request requires editorial notes and a timestamp';
  end if;

  if new.status = 'approved' and (
    new.approved_at is null or new.approved_by is null
  ) then
    raise exception 'Approval requires the reviewer identity and timestamp';
  end if;

  if new.status = 'publishing' and (
    new.claimed_at is null
    or new.claimed_by is null
    or length(btrim(new.claimed_by)) = 0
  ) then
    raise exception 'Publishing requires a worker claim';
  end if;

  if new.status = 'published' and (
    new.published_at is null
    or new.published_url is null
    or new.published_url !~ '^https://([a-z0-9-]+\.)*substack\.com/'
  ) then
    raise exception 'Published status requires a verified Substack URL and timestamp';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enqueue_substack_review_version(
  input_draft_id text,
  input_selected_headline text,
  input_subtitle text,
  input_article_markdown text,
  input_notes_teaser text,
  input_subscribe_call text,
  input_source_path text,
  input_content_hash text,
  input_token_hash text,
  input_review_email text,
  input_expires_at timestamptz
)
returns table (
  id uuid,
  draft_id text,
  version integer,
  status text,
  selected_headline text,
  subtitle text,
  article_markdown text,
  notes_teaser text,
  subscribe_call text,
  source_path text,
  content_hash text,
  token_hash text,
  review_sent_at timestamptz,
  reused boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active public.substack_review_versions%rowtype;
  inserted public.substack_review_versions%rowtype;
  next_version integer;
begin
  if lower(btrim(input_review_email)) <> 'dradamopierce@gmail.com' then
    raise exception 'The approved review email is required';
  end if;
  if input_content_hash !~ '^[0-9a-f]{64}$' or input_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Valid content and token hashes are required';
  end if;
  if input_expires_at <= now() then
    raise exception 'The review expiry must be in the future';
  end if;

  perform substack_review_versions.id
    from public.substack_review_versions
   where substack_review_versions.draft_id = btrim(input_draft_id)
   for update;

  select *
    into active
    from public.substack_review_versions
   where substack_review_versions.draft_id = btrim(input_draft_id)
     and substack_review_versions.status in (
       'pending_review', 'changes_requested', 'approved', 'publishing', 'verification_failed'
     )
   order by substack_review_versions.version desc
   limit 1;

  if found and active.status = 'publishing' then
    raise exception 'A publication is already in progress for this draft';
  end if;

  if found
    and active.status = 'pending_review'
    and active.content_hash = input_content_hash
  then
    return query select
      active.id,
      active.draft_id,
      active.version,
      active.status,
      active.selected_headline,
      active.subtitle,
      active.article_markdown,
      active.notes_teaser,
      active.subscribe_call,
      active.source_path,
      active.content_hash,
      active.token_hash,
      active.review_sent_at,
      true;
    return;
  end if;

  if exists (
    select 1 from public.substack_review_versions
     where substack_review_versions.draft_id = btrim(input_draft_id)
       and substack_review_versions.status = 'published'
  ) then
    raise exception 'This draft identifier has already been published';
  end if;

  update public.substack_review_versions
     set status = 'superseded'
   where substack_review_versions.draft_id = btrim(input_draft_id)
     and substack_review_versions.status in (
       'pending_review', 'changes_requested', 'approved', 'verification_failed'
     );

  select coalesce(max(substack_review_versions.version), 0) + 1
    into next_version
    from public.substack_review_versions
   where substack_review_versions.draft_id = btrim(input_draft_id);

  insert into public.substack_review_versions (
    draft_id,
    version,
    status,
    selected_headline,
    subtitle,
    article_markdown,
    notes_teaser,
    subscribe_call,
    source_path,
    content_hash,
    token_hash,
    review_email,
    expires_at
  ) values (
    btrim(input_draft_id),
    next_version,
    'pending_review',
    btrim(input_selected_headline),
    btrim(input_subtitle),
    btrim(input_article_markdown),
    btrim(input_notes_teaser),
    btrim(input_subscribe_call),
    btrim(input_source_path),
    input_content_hash,
    input_token_hash,
    lower(btrim(input_review_email)),
    input_expires_at
  ) returning * into inserted;

  insert into public.substack_review_events (
    version_id, event_type, actor_type, actor_identifier, metadata
  ) values (
    inserted.id,
    'review_enqueued',
    'worker',
    'substack-review-queue',
    jsonb_build_object('version', inserted.version, 'content_hash', inserted.content_hash)
  );

  return query select
    inserted.id,
    inserted.draft_id,
    inserted.version,
    inserted.status,
    inserted.selected_headline,
    inserted.subtitle,
    inserted.article_markdown,
    inserted.notes_teaser,
    inserted.subscribe_call,
    inserted.source_path,
    inserted.content_hash,
    inserted.token_hash,
    inserted.review_sent_at,
    false;
end;
$$;

create or replace function public.rotate_substack_review_token(
  version_id uuid,
  new_token_hash text
)
returns setof public.substack_review_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rotated public.substack_review_versions%rowtype;
begin
  if new_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid token hash is required';
  end if;

  perform set_config('app.substack_review_token_rotation', 'on', true);
  update public.substack_review_versions
     set token_hash = new_token_hash
   where id = version_id
     and status = 'pending_review'
     and review_sent_at is null
   returning * into rotated;

  if not found then
    raise exception 'Only an unsent pending review token can be rotated';
  end if;

  insert into public.substack_review_events (
    version_id, event_type, actor_type, actor_identifier, metadata
  ) values (
    rotated.id, 'review_token_rotated', 'worker', 'substack-review-queue', '{}'::jsonb
  );

  return next rotated;
end;
$$;

create or replace function public.next_substack_review_action()
returns table (
  action text,
  id uuid,
  draft_id text,
  version integer,
  status text,
  source_path text,
  content_hash text,
  requested_changes text,
  published_url text,
  rss_guid text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when v.status = 'changes_requested' then 'revise'
      when v.status = 'pending_review' and v.review_sent_at is null then 'retry_review_email'
      when v.status = 'approved' then 'publish'
      when v.status = 'published' and v.publication_notice_sent_at is null then 'send_publication_notice'
      when v.status = 'verification_failed' then 'publication_verification_failed'
    end,
    v.id,
    v.draft_id,
    v.version,
    v.status,
    v.source_path,
    v.content_hash,
    v.requested_changes,
    v.published_url,
    v.rss_guid
  from public.substack_review_versions v
  where (
      v.status = 'changes_requested'
      or (v.status = 'pending_review' and v.review_sent_at is null and v.expires_at > now())
      or (v.status = 'approved' and v.expires_at > now())
      or (v.status = 'published' and v.publication_notice_sent_at is null)
      or v.status = 'verification_failed'
    )
  order by
    case v.status
      when 'changes_requested' then 1
      when 'pending_review' then 2
      when 'approved' then 3
      when 'published' then 4
      when 'verification_failed' then 5
    end,
    v.created_at
  limit 1;
$$;

create or replace function public.mark_substack_review_published(
  version_id uuid,
  publication_url text,
  publication_rss_guid text
)
returns setof public.substack_review_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_version public.substack_review_versions%rowtype;
begin
  if publication_url !~ '^https://([a-z0-9-]+\.)*substack\.com/' then
    raise exception 'A verified HTTPS Substack URL is required';
  end if;
  if publication_rss_guid is null or length(btrim(publication_rss_guid)) = 0 then
    raise exception 'An RSS GUID is required';
  end if;

  select * into current_version
    from public.substack_review_versions
   where id = version_id
   for update;

  if not found then raise exception 'Review version not found'; end if;

  if current_version.status = 'published'
    and current_version.published_url = publication_url
    and current_version.rss_guid = btrim(publication_rss_guid)
  then
    return next current_version;
    return;
  end if;

  if current_version.status <> 'publishing' then
    raise exception 'Only a claimed publication can be marked published';
  end if;

  update public.substack_review_versions
     set status = 'published',
         published_at = now(),
         published_url = publication_url,
         rss_guid = btrim(publication_rss_guid),
         last_error = null
   where id = version_id
   returning * into current_version;

  insert into public.substack_review_events (
    version_id, event_type, actor_type, actor_identifier, metadata
  ) values (
    current_version.id,
    'publication_verified',
    'worker',
    current_version.claimed_by,
    jsonb_build_object('published_url', current_version.published_url, 'rss_guid', current_version.rss_guid)
  );

  return next current_version;
end;
$$;

create or replace function public.mark_substack_review_verification_failed(
  version_id uuid,
  failure_message text
)
returns setof public.substack_review_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  failed public.substack_review_versions%rowtype;
begin
  if failure_message is null or length(btrim(failure_message)) = 0 then
    raise exception 'A verification failure message is required';
  end if;

  update public.substack_review_versions
     set status = 'verification_failed', last_error = btrim(failure_message)
   where id = version_id and status = 'publishing'
   returning * into failed;

  if not found then raise exception 'Only a claimed publication can fail verification'; end if;

  insert into public.substack_review_events (
    version_id, event_type, actor_type, actor_identifier, metadata
  ) values (
    failed.id,
    'publication_verification_failed',
    'worker',
    failed.claimed_by,
    jsonb_build_object('message', btrim(failure_message))
  );

  return next failed;
end;
$$;

create or replace function public.record_substack_review_email_failure(
  version_id uuid,
  failure_message text
)
returns setof public.substack_review_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  failed public.substack_review_versions%rowtype;
begin
  if failure_message is null or length(btrim(failure_message)) = 0 then
    raise exception 'An email failure message is required';
  end if;

  update public.substack_review_versions
     set last_error = btrim(failure_message)
   where id = version_id and status = 'pending_review'
   returning * into failed;

  if not found then raise exception 'Only a pending review can record an email failure'; end if;

  insert into public.substack_review_events (
    version_id, event_type, actor_type, actor_identifier, metadata
  ) values (
    failed.id,
    'review_email_failed',
    'worker',
    'substack-review-queue',
    jsonb_build_object('message', btrim(failure_message))
  );

  return next failed;
end;
$$;

revoke all on function public.enqueue_substack_review_version(
  text, text, text, text, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.enqueue_substack_review_version(
  text, text, text, text, text, text, text, text, text, text, timestamptz
) to service_role;

revoke all on function public.rotate_substack_review_token(uuid, text)
  from public, anon, authenticated;
grant execute on function public.rotate_substack_review_token(uuid, text)
  to service_role;

revoke all on function public.next_substack_review_action()
  from public, anon, authenticated;
grant execute on function public.next_substack_review_action()
  to service_role;

revoke all on function public.mark_substack_review_published(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.mark_substack_review_published(uuid, text, text)
  to service_role;

revoke all on function public.mark_substack_review_verification_failed(uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_substack_review_verification_failed(uuid, text)
  to service_role;

revoke all on function public.record_substack_review_email_failure(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_substack_review_email_failure(uuid, text)
  to service_role;
