-- M5-B — retire drone_jobs.customer_id as a live pointer.
--
-- clients is the live party table; customers is the pre-2026-02 one. Both FKs
-- still exist and PostgREST still resolves both embeds, which is exactly the
-- problem: two "who is the client" answers, and the UI was reading whichever
-- was non-null. The column and the FK STAY (drone_jobs_customer_id_fkey is not
-- renamed, not dropped) so nothing that still selects it 400s — the column just
-- stops carrying data.
--
-- Paired with the frontend/edge-function change that strips customers(...) from
-- the nine remaining embed sites; without that this update makes those jobs
-- render "No client assigned" instead of the legacy name.
--
-- additive   : no  — one data update + one comment; no schema change
-- idempotent : yes — the update is a no-op on a second run (where clause),
--                    comment on column is unconditional and repeatable
-- reversible : no  — the pointers are not recoverable from drone_jobs after
--                    this runs. As of 2026-07-27 exactly ONE row is affected
--                    (DJ-2026-0003, status 'cancelled'); its customers row is
--                    untouched, so the link can be re-established by hand.
--
-- pre-flight (read-only, run BEFORE applying if you want the mapping saved):
--   select id, job_number, customer_id from drone_jobs where customer_id is not null;
--
-- verification:
--   select count(*) as should_be_zero from drone_jobs where customer_id is not null;
--   select col_description('public.drone_jobs'::regclass,
--            (select attnum from pg_attribute
--              where attrelid = 'public.drone_jobs'::regclass and attname = 'customer_id'));

update public.drone_jobs
   set customer_id = null
 where customer_id is not null;

comment on column public.drone_jobs.customer_id is 'DEPRECATED — use client_id';
