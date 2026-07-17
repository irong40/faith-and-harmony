-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-06-10).
-- Migration 016: quote-video persona support
-- Adds a per-persona content format so a persona can produce a single
-- looping quote-card video per topic instead of the standard 6-piece set.
-- piece_type 'quote_video' needs no DB change (unconstrained TEXT).

alter table public.personas
  add column if not exists content_format text not null default 'standard'
    check (content_format in ('standard', 'quote_video'));

comment on column public.personas.content_format is
  'Content production format. standard = 6-piece set (long, short_1-4, carousel). quote_video = single looping quote-card video per topic, music bed rendered locally from ACE-Step tracks.';
