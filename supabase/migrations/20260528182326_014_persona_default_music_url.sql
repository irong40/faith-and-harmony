-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-28).
alter table public.personas
  add column if not exists default_music_url text;

comment on column public.personas.default_music_url is
  'Pre-uploaded fallback music track URL. Used by daily-media when Lyria music generation fails. Null = skip music gracefully on failure (legacy behavior).';
