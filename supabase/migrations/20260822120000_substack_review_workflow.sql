-- Substack review workflow
-- Stores immutable editorial snapshots and an append only audit trail.

create table public.substack_review_versions (
  id uuid primary key default gen_random_uuid(),
  draft_id text not null check (length(btrim(draft_id)) > 0),
  version integer not null check (version > 0),
  status text not null default 'pending_review' check (
    status in (
      'pending_review',
      'changes_requested',
      'superseded',
      'approved',
      'publishing',
      'published',
      'verification_failed',
      'expired'
    )
  ),
  selected_headline text not null check (length(btrim(selected_headline)) > 0),
  subtitle text not null,
  article_markdown text not null check (length(btrim(article_markdown)) > 0),
  notes_teaser text not null,
  subscribe_call text not null,
  source_path text not null check (length(btrim(source_path)) > 0),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  review_email text not null check (
    lower(btrim(review_email)) = 'dradamopierce@gmail.com'
  ),
  expires_at timestamptz not null,
  requested_changes text,
  requested_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  claimed_at timestamptz,
  claimed_by text,
  published_at timestamptz,
  published_url text,
  rss_guid text,
  review_message_id text,
  review_sent_at timestamptz,
  publication_message_id text,
  publication_notice_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_id, version),
  check (
    status <> 'changes_requested'
    or (
      requested_at is not null
      and requested_changes is not null
      and length(btrim(requested_changes)) > 0
    )
  ),
  check (
    status <> 'approved'
    or (approved_at is not null and approved_by is not null)
  ),
  check (
    status <> 'publishing'
    or (
      claimed_at is not null
      and claimed_by is not null
      and length(btrim(claimed_by)) > 0
    )
  ),
  check (
    status <> 'published'
    or (
      published_at is not null
      and published_url ~ '^https://([a-z0-9-]+\.)*substack\.com/'
    )
  )
);

create table public.substack_review_events (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.substack_review_versions(id),
  event_type text not null check (length(btrim(event_type)) > 0),
  actor_type text not null check (actor_type in ('reviewer', 'worker', 'system')),
  actor_identifier text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index substack_review_versions_status_created
  on public.substack_review_versions (status, created_at);

create index substack_review_events_version_created
  on public.substack_review_events (version_id, created_at);

create unique index substack_review_one_open_version
  on public.substack_review_versions (draft_id)
  where status in (
    'pending_review',
    'approved',
    'publishing',
    'verification_failed'
  );

alter table public.substack_review_versions enable row level security;
alter table public.substack_review_versions force row level security;
alter table public.substack_review_events enable row level security;
alter table public.substack_review_events force row level security;

revoke all on public.substack_review_versions from anon, authenticated;
revoke all on public.substack_review_events from anon, authenticated;

grant select, insert, update on public.substack_review_versions to service_role;
grant select, insert on public.substack_review_events to service_role;

create policy substack_review_versions_service_all
  on public.substack_review_versions
  for all to service_role
  using (true)
  with check (true);

create policy substack_review_events_service_insert
  on public.substack_review_events
  for insert to service_role
  with check (true);

create policy substack_review_events_service_select
  on public.substack_review_events
  for select to service_role
  using (true);

create or replace function public.enforce_substack_review_version_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  transition_is_legal boolean;
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
    or new.token_hash is distinct from old.token_hash
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
      when 'verification_failed' then new.status = 'publishing'
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

create trigger enforce_substack_review_version_update
  before update on public.substack_review_versions
  for each row execute function public.enforce_substack_review_version_update();

create or replace function public.claim_substack_review_publication(worker_id text)
returns setof public.substack_review_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed public.substack_review_versions%rowtype;
begin
  if worker_id is null or length(btrim(worker_id)) = 0 then
    raise exception 'worker_id is required';
  end if;

  select *
    into claimed
    from public.substack_review_versions
   where status = 'approved'
     and expires_at > now()
   order by approved_at asc, created_at asc
   limit 1
   for update skip locked;

  if not found then
    return;
  end if;

  update public.substack_review_versions
     set status = 'publishing',
         claimed_at = now(),
         claimed_by = btrim(worker_id),
         last_error = null
   where id = claimed.id
   returning * into claimed;

  insert into public.substack_review_events (
    version_id,
    event_type,
    actor_type,
    actor_identifier,
    metadata
  ) values (
    claimed.id,
    'publication_claimed',
    'worker',
    btrim(worker_id),
    jsonb_build_object('version', claimed.version)
  );

  return next claimed;
end;
$$;

revoke all on function public.claim_substack_review_publication(text) from public, anon, authenticated;
grant execute on function public.claim_substack_review_publication(text) to service_role;

revoke all on function public.enforce_substack_review_version_update() from public, anon, authenticated;
