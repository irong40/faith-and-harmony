-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-28).
create table if not exists public.errors (
    id uuid primary key default gen_random_uuid(),
    source text not null,
    message text not null,
    topic_id uuid references public.topics(id) on delete set null,
    persona_name text,
    environment text not null default 'development',
    severity text not null default 'error' check (severity in ('error', 'warning', 'info')),
    acknowledged boolean not null default false,
    acknowledged_at timestamptz,
    acknowledged_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

comment on table public.errors is
  'Persistent error log written by notifyError. Surfaced in the dashboard nav bell and at /admin/errors. Email + webhook remain the push channels.';

create index if not exists errors_unacked_recent_idx
  on public.errors (acknowledged, created_at desc)
  where acknowledged = false;

create index if not exists errors_topic_id_idx
  on public.errors (topic_id)
  where topic_id is not null;

alter table public.errors enable row level security;

create policy "errors_authenticated_all"
  on public.errors
  for all
  to authenticated
  using (true)
  with check (true);
