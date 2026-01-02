-- Fix the views to use security_invoker = on (default for PostgreSQL 15+)
-- This makes the views respect RLS of the querying user

DROP VIEW IF EXISTS public.app_status_overview;
DROP VIEW IF EXISTS public.active_announcements;

CREATE VIEW public.app_status_overview 
WITH (security_invoker = on)
AS
SELECT 
    a.id,
    a.name,
    a.code,
    a.status,
    a.version,
    a.url,
    a.last_heartbeat_at,
    a.consecutive_failures,
    a.active,
    a.api_key_prefix IS NOT NULL AS has_api_key,
    a.api_key_created_at,
    CASE 
        WHEN a.last_heartbeat_at IS NULL THEN 'never'
        WHEN a.last_heartbeat_at > now() - INTERVAL '10 minutes' THEN 'recent'
        WHEN a.last_heartbeat_at > now() - INTERVAL '1 hour' THEN 'stale'
        ELSE 'offline'
    END AS heartbeat_status,
    (
        SELECT COUNT(*) 
        FROM public.maintenance_tickets t 
        WHERE t.app_id = a.id AND t.status IN ('open', 'in-progress')
    ) AS open_ticket_count
FROM public.apps a
WHERE a.active = true;

CREATE VIEW public.active_announcements
WITH (security_invoker = on)
AS
SELECT 
    a.*,
    CASE 
        WHEN a.ends_at IS NULL THEN 'indefinite'
        WHEN a.ends_at < now() THEN 'expired'
        WHEN a.starts_at > now() THEN 'scheduled'
        ELSE 'active'
    END AS display_status
FROM public.maintenance_announcements a
WHERE a.is_active = true
ORDER BY a.priority DESC, a.starts_at DESC;