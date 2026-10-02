-- NOT APPLIED. Waiting on Adam.
--
-- The Office page (/admin/office) reads public.office_snapshot and reads and
-- writes public.office_inbox as the signed-in admin. Today those tables answer
-- only to the service role, so the page shows "Office access is not turned on
-- yet" until this runs.
--
-- This file is kept OUT of supabase/migrations on purpose: a `supabase db push`
-- from any session must not grant access as a side effect. To turn it on, Adam
-- runs it himself in the Supabase SQL editor (project FaithandHarmonyAPP), or
-- tells Claude to apply it. After it is applied, move it into
-- supabase/migrations/ under the version Supabase recorded.
--
-- What it grants, and to whom:
--   * A signed-in user whose user_roles row says admin can READ the snapshot
--     and the message list, and INSERT a message.
--   * The insert is column-scoped to (kind, digest_date, item, body). A browser
--     can never set picked_up_at or ledger_line; only the desktop sync does.
--   * anon gets nothing. A signed-in pilot or client fails every policy.
--   * No UPDATE and no DELETE for anyone but the service role.

grant select on public.office_snapshot to authenticated;
grant select on public.office_inbox to authenticated;
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
