
create or replace function public.count_recent_account_posts(
  p_platform   text,
  p_account_id text,
  p_hours      integer default 24
)
returns integer
language sql
stable
set search_path to 'public'
as $$
  select count(*)::int
  from content_pieces cp
  join topics t   on t.id = cp.topic_id
  join personas pr on pr.id = t.persona_id
  cross join lateral jsonb_each(coalesce(cp.published_platforms, '{}'::jsonb)) as e(platform, st)
  where pr.platform_accounts ->> p_platform = p_account_id
    and e.platform = p_platform
    and (e.st ->> 'status') in ('published', 'pending')
    and coalesce(
          nullif(e.st ->> 'submitted_at', '')::timestamptz,
          nullif(e.st ->> 'published_at', '')::timestamptz,
          cp.published_at,
          cp.created_at
        ) >= now() - make_interval(hours => p_hours);
$$;
