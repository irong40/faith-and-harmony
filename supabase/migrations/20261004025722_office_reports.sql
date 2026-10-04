-- Office reports in the admin portal (/admin/reports/office).
-- Adam 2026-10-03: "Post them in the CRM as a report" (the Friday staff meeting minutes).
-- The desktop sync writes rows with the service role. A signed-in ADMIN can read them.
-- anon gets nothing; a non-admin authenticated user fails the policy. No browser can
-- insert, update or delete.

create table if not exists public.office_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind ~ '^[a-z][a-z-]{2,40}$'),
  report_date date not null,
  title text not null check (char_length(title) between 1 and 300),
  summary text check (summary is null or char_length(summary) <= 600),
  body_md text,
  body_html text,
  source_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint office_reports_has_body check (body_md is not null or body_html is not null),
  constraint office_reports_size check (
    coalesce(char_length(body_md), 0) <= 400000 and coalesce(char_length(body_html), 0) <= 800000
  )
);

comment on table public.office_reports is
  'Reports the agent office produces for Adam (staff meeting minutes first). Written by office_dashboard_sync.py with the service role; read by admins in /admin/reports/office.';

create index if not exists office_reports_date_idx on public.office_reports (report_date desc, kind);

alter table public.office_reports enable row level security;

revoke all on public.office_reports from anon, authenticated;
grant select on public.office_reports to authenticated;

create policy "Admins read office reports"
  on public.office_reports for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
