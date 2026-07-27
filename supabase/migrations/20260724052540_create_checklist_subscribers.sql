-- checklist_subscribers — owned-list capture for The Smaller Yes checklist opt-in.
-- Local Supabase copy is the system of record; MailerLite sync status tracked per row
-- so rows captured before the ESP was wired (or during ML outages) can be replayed.

create table if not exists public.checklist_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source_page text not null default '/checklist',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  mailerlite_status text not null default 'pending', -- pending | synced | failed
  mailerlite_subscriber_id text,
  created_at timestamptz not null default now()
);

-- Emails are normalized to lowercase in the server action before insert,
-- so a plain unique index is safe and lets upsert target it via onConflict.
create unique index if not exists checklist_subscribers_email_key
  on public.checklist_subscribers (email);

alter table public.checklist_subscribers enable row level security;
-- No public policies: only the service role (server action) reads/writes.
