-- Applied live via MCP 2026-10-17 as version 20261017182613; this file is the
-- repo mirror (version matches live history so db push never re-applies it).
--
-- The office floor. Each agent checks in when it starts a job, after each step,
-- and when it finishes, so the dashboard can show who is working right now
-- without waiting for the 5-minute snapshot.
--   office_presence      one row per desk (agent or scheduled automation): its current state
--   office_presence_log  the check-ins themselves, newest last, for the desk timeline
-- Writers: the desktop only (cron-agents/lib/presence.py, service role). The
-- dispatcher, the scheduler and the Claude Code subagent hook all call it.
-- Readers: admins, through RLS, plus Realtime so a desk lights up immediately.
-- A fifth inbox kind, "decline": Adam pressed "Not for me" on a FlyGuys mission.
-- Nothing is sent to FlyGuys; the sync records it so the mission moves to Declined.
-- Undo: drop both tables, and re-run 20261017154055 for the inbox kinds.

create table if not exists public.office_presence (
  agent       text primary key,
  kind        text not null default 'specialist' check (kind in ('specialist', 'automation')),
  state       text not null check (state in ('working', 'idle')),
  source      text not null check (source in ('dispatcher', 'session', 'scheduler')),
  job_id      text,
  title       text,
  step        text,
  machine     text,
  started_at  timestamptz,
  updated_at  timestamptz not null default now(),
  finished_at timestamptz,
  outcome     text
);
comment on table public.office_presence is
  'Office floor: one row per desk, written by the desktop presence writer (cron-agents/lib/presence.py).';

create table if not exists public.office_presence_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  agent   text not null,
  event   text not null check (event in ('start', 'step', 'done')),
  job_id  text,
  text    text
);
create index if not exists office_presence_log_agent_at on public.office_presence_log (agent, at desc);
comment on table public.office_presence_log is
  'Office floor check-ins (start, step, done). Pruned to 14 days by the writer.';

alter table public.office_presence     enable row level security;
alter table public.office_presence_log enable row level security;
revoke all on public.office_presence     from anon, authenticated;
revoke all on public.office_presence_log from anon, authenticated;
grant select on public.office_presence     to authenticated;
grant select on public.office_presence_log to authenticated;

drop policy if exists "Admins read office presence" on public.office_presence;
create policy "Admins read office presence"
  on public.office_presence for select to authenticated
  using (has_role((select auth.uid()), 'admin'::app_role));
drop policy if exists "Admins read office presence log" on public.office_presence_log;
create policy "Admins read office presence log"
  on public.office_presence_log for select to authenticated
  using (has_role((select auth.uid()), 'admin'::app_role));

do $$ begin
  alter publication supabase_realtime add table public.office_presence;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.office_presence_log;
exception when duplicate_object then null; end $$;

alter table public.office_inbox drop constraint if exists office_inbox_kind_check;
alter table public.office_inbox add constraint office_inbox_kind_check
  check (kind in ('answer', 'directive', 'release', 'interest', 'decline'));
