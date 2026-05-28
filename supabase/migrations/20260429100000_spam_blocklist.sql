-- Spam blocklist for Vapi inbound call gatekeeper
-- Numbers in this table are rejected before any Vapi assistant starts (0 minutes consumed)

create table if not exists public.spam_blocklist (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,           -- E.164 format: +17575550000
  reason      text,                           -- optional note (e.g. "robo survey", "telemarketer")
  call_count  integer not null default 1,     -- how many times this number has called
  blocked_at  timestamptz not null default now(),
  blocked_by  text not null default 'manual'  -- 'manual' | 'auto'
);

create index if not exists spam_blocklist_phone_idx on public.spam_blocklist (phone);

-- Only service role can write; anon can't touch this table
alter table public.spam_blocklist enable row level security;

create policy "service role full access"
  on public.spam_blocklist
  for all
  using (auth.role() = 'service_role');

comment on table public.spam_blocklist is
  'Phone numbers blocked from reaching Paula (Vapi). Checked by vapi-gate edge function on every inbound call.';
