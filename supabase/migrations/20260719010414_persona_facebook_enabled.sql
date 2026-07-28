
alter table public.personas
  add column if not exists facebook_enabled boolean not null default false;
