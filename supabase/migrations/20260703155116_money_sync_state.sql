-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-07-03).
-- Pierce Money System: encrypted cross-device sync (client-side AES-GCM ciphertext only).
-- One row per user. The server never sees plaintext financial data.
create table public.money_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blob text not null,               -- JSON envelope {v, salt, iv, ct} — AES-256-GCM, PBKDF2 key
  updated_at timestamptz not null default now(),
  device text                       -- last writer, for debugging ('desktop', 'phone', 'agent')
);

alter table public.money_sync_state enable row level security;

create policy "own row select" on public.money_sync_state
  for select to authenticated using (user_id = auth.uid());
create policy "own row insert" on public.money_sync_state
  for insert to authenticated with check (user_id = auth.uid());
create policy "own row update" on public.money_sync_state
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own row delete" on public.money_sync_state
  for delete to authenticated using (user_id = auth.uid());
