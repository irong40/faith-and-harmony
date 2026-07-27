-- Switch checklist funnel from MailerLite to in-house Resend drip.
alter table public.checklist_subscribers drop column if exists mailerlite_status;
alter table public.checklist_subscribers drop column if exists mailerlite_subscriber_id;
alter table public.checklist_subscribers add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
alter table public.checklist_subscribers add column if not exists unsubscribed_at timestamptz;
create unique index if not exists checklist_subscribers_unsub_token_key
  on public.checklist_subscribers (unsubscribe_token);

create table if not exists public.checklist_email_sends (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.checklist_subscribers(id) on delete cascade,
  email_no int not null check (email_no between 1 and 5),
  resend_email_id text,
  sent_at timestamptz not null default now(),
  unique (subscriber_id, email_no)
);

alter table public.checklist_email_sends enable row level security;
-- Service role only; no public policies.
