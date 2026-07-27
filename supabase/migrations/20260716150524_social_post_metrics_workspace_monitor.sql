-- Workspace-wide Blotato post metrics snapshots (quiz, NE Corner, and any
-- posts NOT flowing through content_pieces). Populated daily by the local
-- blotato_stats_pull.py scheduled task (SocialStatsPull).
create table if not exists public.social_post_metrics (
    id bigint generated always as identity primary key,
    blotato_post_id text not null,
    platform text not null,
    account_label text,
    post_url text,
    text_preview text,
    posted_at timestamptz,
    views integer not null default 0,
    likes integer not null default 0,
    comments integer not null default 0,
    shares integer not null default 0,
    saves integer not null default 0,
    captured_at timestamptz not null default now()
);

create index if not exists idx_spm_post_captured
    on public.social_post_metrics (blotato_post_id, captured_at desc);
create index if not exists idx_spm_platform
    on public.social_post_metrics (platform);

alter table public.social_post_metrics enable row level security;

-- Latest snapshot per post, for dashboards/reports
create or replace view public.social_post_metrics_latest as
select distinct on (blotato_post_id)
    blotato_post_id, platform, account_label, post_url, text_preview,
    posted_at, views, likes, comments, shares, saves, captured_at
from public.social_post_metrics
order by blotato_post_id, captured_at desc;
