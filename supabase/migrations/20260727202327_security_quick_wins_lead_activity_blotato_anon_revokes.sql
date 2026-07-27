-- Wave 5b security quick wins (2026-07-27 pipeline program).
-- 1) lead_activity: last remaining SECURITY DEFINER view from the 7/13
--    advisor findings — flip to security_invoker so RLS on the underlying
--    leads/lead_notes tables applies to the caller.
ALTER VIEW public.lead_activity SET (security_invoker = true);

-- 2) blotato_accounts: RLS was disabled entirely (advisor ERROR). All
--    access is server-side via service role, which bypasses RLS anyway.
ALTER TABLE public.blotato_accounts ENABLE ROW LEVEL SECURITY;

-- 3) Revoke anon EXECUTE on definer functions that touch job data.
--    has_role deliberately NOT revoked — AuthContext.tsx calls it via
--    client RPC and the anon->authenticated boundary needs a live test first.
REVOKE EXECUTE ON FUNCTION public.backfill_metric_handles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_job_shot_list(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_drone_job_create_shot_list() FROM anon;
