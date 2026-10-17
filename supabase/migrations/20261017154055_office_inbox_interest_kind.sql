-- Applied live via MCP 2026-10-17 as version 20261017154055; this file is the
-- repo mirror (version matches live history so db push never re-applies it).
--
-- A fourth message kind: "interest" = Adam pressed "I'm interested" on a FlyGuys
-- mission in the office dashboard. The desktop sync (office_dashboard_sync.py,
-- lib/marketplace.py) sends it to FlyGuys and writes the result to ledger_line.
-- Undo: re-run 20261001220804 (answer, directive, release).
alter table public.office_inbox drop constraint if exists office_inbox_kind_check;
alter table public.office_inbox add constraint office_inbox_kind_check
  check (kind in ('answer', 'directive', 'release', 'interest'));
