-- Applied live via MCP 2026-10-01 as version 20261001220331; this file is the
-- repo mirror (version matches live history so db push never re-applies it).
--
-- Office dashboard (2026-10-01). Two tables, both locked: RLS on with no policies,
-- so the anon and authenticated API roles can read and write nothing. Only the
-- service role (the desktop pusher) and the owner's SQL access reach them.

create table if not exists public.office_snapshot (
  id          text primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);
comment on table public.office_snapshot is
  'One row (id = current): the agent office status the desktop pushes every few minutes for the dashboard.';

create table if not exists public.office_inbox (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  kind          text not null check (kind in ('answer', 'directive')),
  digest_date   date,
  item          integer,
  body          text not null check (char_length(body) between 1 and 4000),
  picked_up_at  timestamptz,
  ledger_line   text
);
comment on table public.office_inbox is
  'Messages from Adam to the COO, written by the dashboard. The desktop puller copies each into operations/decision-answers.md and stamps picked_up_at.';

alter table public.office_snapshot enable row level security;
alter table public.office_inbox    enable row level security;
revoke all on public.office_snapshot from anon, authenticated;
revoke all on public.office_inbox    from anon, authenticated;
