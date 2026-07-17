-- Follow-up to security_hardening_advisors: has_role() is referenced inside
-- RLS policies on public-site tables (products, drone_packages, services,…),
-- so the anon role must be able to EXECUTE it or every policy that calls it
-- fails closed and public reads 401. It is a read-only boolean lookup on
-- user_roles — safe for anon. All other definer functions stay revoked.
grant execute on function public.has_role(uuid, app_role) to anon;
