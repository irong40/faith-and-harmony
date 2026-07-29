-- Wave 5 security follow-up (deferred until the client call path was verified):
-- AuthContext.checkAdminRole is the only frontend caller of has_role and runs
-- exclusively with an authenticated session (verified in code 2026-07-28), so
-- anon needs no EXECUTE. authenticated + service_role grants unchanged.
-- Applied live via MCP 2026-07-28 as version 20260728165147; this file is the
-- repo mirror (version matches live history so db push never re-applies it).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
