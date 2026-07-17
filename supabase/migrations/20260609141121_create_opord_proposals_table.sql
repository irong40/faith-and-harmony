-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-06-09).
-- OPORD Proposal Generator. Distinct from the existing client-facing `proposals`
-- (approval-flow) table: this holds AI-ingested drafts in the 5-paragraph military
-- OPORD format, edited in Trestle, then optionally promoted into `proposals`.
create table if not exists public.opord_proposals (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,

  -- linkage to existing Trestle records
  client_id           uuid references public.clients(id) on delete set null,
  mission_id          uuid references public.drone_jobs(id) on delete set null,
  costing_id          uuid references public.mission_costings(id) on delete set null,
  quote_request_id    uuid references public.quote_requests(id) on delete set null,
  client_proposal_id  uuid references public.proposals(id) on delete set null,  -- promoted target

  -- intake
  source         text not null default 'manual'
                   check (source in ('manual','web_form','n8n_webhook','voice_assistant')),
  raw_intake     text,
  intake_payload jsonb,

  -- HEADER
  title             text,
  client_name       text,
  project_location  text,
  proposal_date     date,
  pilot_in_command  text,
  aircraft          text,

  -- 5 OPORD paragraphs (editable free text)
  situation       text,
  mission         text,
  execution       text,
  sustainment     text,
  command_signal  text,

  -- structured helpers
  execution_phases jsonb,
  deliverables     jsonb,

  -- pricing (mirrors mission_costing_engine constants)
  day_rate          numeric,
  half_day          boolean not null default false,
  airspace_fee_type text not null default 'none' check (airspace_fee_type in ('none','laanc','caps')),
  airspace_fee      numeric not null default 0,
  processing_tier   text not null default 'none' check (processing_tier in ('none','basic','pro','enterprise')),
  processing_fee    numeric not null default 0,
  total_investment  numeric not null default 0,

  -- workflow
  status        text not null default 'draft'
                  check (status in ('draft','in_review','finalized','sent','accepted','declined')),
  opord_json    jsonb,
  pdf_url       text,
  finalized_at  timestamptz
);

create index if not exists idx_opord_status  on public.opord_proposals(status);
create index if not exists idx_opord_client  on public.opord_proposals(client_id);
create index if not exists idx_opord_updated on public.opord_proposals(updated_at desc);

create or replace function public.opord_proposals_set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_opord_updated_at on public.opord_proposals;
create trigger trg_opord_updated_at before update on public.opord_proposals
  for each row execute function public.opord_proposals_set_updated_at();

alter table public.opord_proposals enable row level security;
drop policy if exists admins_manage_opord_proposals on public.opord_proposals;
create policy admins_manage_opord_proposals on public.opord_proposals
  for all to public
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
