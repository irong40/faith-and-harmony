-- Applied live via MCP 2026-10-02 as version 20261002122347, on Adam's instruction
-- ("run the database command"); this file is the repo mirror (version matches
-- live history so db push never re-applies it).
--
-- Office page in the admin portal (/admin/office). A signed-in ADMIN can read the
-- office snapshot, read the message list, and send a message. anon gets nothing;
-- a non-admin authenticated user fails every policy. No UPDATE and no DELETE for
-- anyone but the service role.
--
-- Checked after applying, by switching roles in one rolled-back block:
--   admin:      reads snapshot (1 row), reads messages, sends a message;
--               refused on ledger_line, on UPDATE and on DELETE
--   non-admin:  0 rows on both reads, insert refused by row-level security
--   anonymous:  permission denied on read and on insert

grant select on public.office_snapshot to authenticated;
grant select on public.office_inbox to authenticated;
-- Column-scoped insert: the browser can never set picked_up_at or ledger_line.
-- Those two are written only by the desktop sync, with the service role.
grant insert (kind, digest_date, item, body) on public.office_inbox to authenticated;

create policy "Admins read the office snapshot"
  on public.office_snapshot for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

create policy "Admins read office messages"
  on public.office_inbox for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

create policy "Admins send office messages"
  on public.office_inbox for insert to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    and picked_up_at is null
    and ledger_line is null
  );

-- To undo:
--   drop policy "Admins read the office snapshot" on public.office_snapshot;
--   drop policy "Admins read office messages" on public.office_inbox;
--   drop policy "Admins send office messages" on public.office_inbox;
--   revoke all on public.office_snapshot from authenticated;
--   revoke all on public.office_inbox from authenticated;
