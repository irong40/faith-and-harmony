-- "Authenticated users can read clients" was SELECT to `authenticated` with
-- USING (true): every signed-in account could read all 7 client rows including
-- email, phone, address and notes. Self-signup is enabled, so that is one
-- account away from the whole client list. Reproduced before this change by
-- assuming the `authenticated` role with a random uid: 7 clients, 3 emails,
-- 7 phones.
--
-- It cannot simply be dropped: pilots legitimately need the client NAME.
-- usePilotMissions and sync-engine.pullMissions both embed clients(name), and
-- PilotDashboard / PilotMap / PilotMissionDetail / PilotRouteOptimizer all
-- render client_name. PostgREST embeds are subject to RLS on the embedded
-- table, so dropping this outright would blank the pilot app.
--
-- Both pilot queries scope on pilot_id, so scope the policy the same way: a
-- pilot reads exactly the clients attached to missions assigned to them.
-- Admins are unaffected -- "Admins can manage clients" (ALL) already covers
-- them. Every other consumer (Clients, JobIntake, Leads, DeliveryReview,
-- ReportBuilder, DroneJobDetail, ClientAutocomplete, ClientFormDialog,
-- ConvertLeadDialog) is admin-only.
--
-- Note the EXISTS is itself evaluated under RLS on drone_jobs, which is what
-- we want: it can only match missions the caller may already see. No recursion
-- risk -- drone_jobs' policies reference user_roles via has_role(), never
-- clients.
--
-- LIMITATION, deliberately accepted here: RLS is row-level, so a pilot who can
-- see the row can see email/phone/notes on it, not just name. This narrows
-- exposure from "every client" to "clients on my own missions". Restricting to
-- the name column needs a view or a column-grant split that cannot distinguish
-- admin from pilot (both are `authenticated`), so it is a separate change.
--
-- Verified after: random signed-in user 0 clients / 0 emails / 0 phones;
-- assigned pilot 1 client, and the drone_jobs -> clients(name) embed still
-- resolves "COO Test" on DJ-2026-0004; admin still 7 clients / 3 emails. The
-- two null client_names on that pilot's other missions are jobs whose
-- client_id is null, not an RLS effect, and the app already falls back to
-- 'Unknown Client'.

drop policy if exists "Authenticated users can read clients" on public.clients;

create policy "Pilots read clients on their own missions"
on public.clients
for select
to authenticated
using (
  exists (
    select 1
    from public.drone_jobs j
    where j.client_id = clients.id
      and j.pilot_id = auth.uid()
  )
);
