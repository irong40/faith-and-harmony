-- M6 (forward half of history reconciliation)
--
-- public.invoices and public.projects were dropped out-of-band on the remote
-- (verified 2026-07-27: neither relation exists in pg_class for schema public).
-- The two 2026-01 migrations that created them are still in history and are
-- deliberately NOT edited — rewriting an applied migration diverges its
-- checksum against supabase_migrations.schema_migrations and breaks `db push`.
--
-- Without this file `supabase db reset` replays those creates and rebuilds two
-- dead tables that prod does not have. This is the forward correction.
--
-- Created by  : 20260107184339 (invoices), 20260108144130 (projects)
-- additive    : no  — destructive, but only of relations already absent on prod
-- idempotent  : yes — `drop table if exists`
-- reversible  : yes — re-running the 2026-01 creates rebuilds them; nothing
--                references them (see verification query below)
--
-- verification:
--   select c.relname
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relname in ('invoices','projects');
--   -- expect 0 rows, both before (prod) and after (fresh db reset)

drop table if exists public.invoices cascade;
drop table if exists public.projects cascade;
