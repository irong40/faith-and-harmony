-- Applied live via MCP 2026-10-01 as version 20261001220804; this file is the
-- repo mirror (version matches live history so db push never re-applies it).
--
-- A third message kind: "release" sets one held work-queue job to queued.
alter table public.office_inbox drop constraint if exists office_inbox_kind_check;
alter table public.office_inbox add constraint office_inbox_kind_check
  check (kind in ('answer', 'directive', 'release'));
