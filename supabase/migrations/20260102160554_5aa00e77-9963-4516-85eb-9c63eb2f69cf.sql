-- ============================================
-- Mission Control Plugin API Migration
-- ============================================

-- ============================================
-- 1. EXTEND APPS TABLE WITH API AUTHENTICATION
-- ============================================

ALTER TABLE public.apps 
ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
ADD COLUMN IF NOT EXISTS api_key_prefix TEXT,
ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS health_check_url TEXT,
ADD COLUMN IF NOT EXISTS heartbeat_interval_seconds INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS alert_on_failure BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS owner_email TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Index for API key lookup
CREATE INDEX IF NOT EXISTS idx_apps_api_key_prefix ON public.apps(api_key_prefix) WHERE api_key_prefix IS NOT NULL;

-- ============================================
-- 2. MAINTENANCE ANNOUNCEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.maintenance_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    target_all_apps BOOLEAN DEFAULT true,
    target_app_ids UUID[] DEFAULT '{}',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT announcement_type_values CHECK (type IN ('info', 'warning', 'maintenance', 'outage', 'resolved'))
);

ALTER TABLE public.maintenance_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements viewable by authenticated users"
ON public.maintenance_announcements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert announcements"
ON public.maintenance_announcements FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update announcements"
ON public.maintenance_announcements FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete announcements"
ON public.maintenance_announcements FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.maintenance_announcements(is_active, starts_at, ends_at);

CREATE TRIGGER update_maintenance_announcements_updated_at
    BEFORE UPDATE ON public.maintenance_announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. HEALTH CHECK HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_health_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'heartbeat',
    response_time_ms INTEGER,
    version TEXT,
    metrics JSONB DEFAULT '{}'::jsonb,
    checked_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT health_status_values CHECK (status IN ('online', 'degraded', 'offline')),
    CONSTRAINT health_source_values CHECK (source IN ('heartbeat', 'poll', 'manual'))
);

ALTER TABLE public.app_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Health history viewable by authenticated users"
ON public.app_health_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Health history insertable by anyone"
ON public.app_health_history FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_health_history_app_time ON public.app_health_history(app_id, checked_at DESC);

-- ============================================
-- 4. API KEY MANAGEMENT FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_api_key(p_api_key TEXT)
RETURNS TABLE (
    app_id UUID,
    app_name TEXT,
    app_code TEXT,
    is_valid BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_hash TEXT;
BEGIN
    v_prefix := LEFT(p_api_key, 11);
    v_hash := encode(sha256(p_api_key::bytea), 'hex');
    
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.code,
        (a.api_key_hash = v_hash AND a.active = true) AS is_valid
    FROM public.apps a
    WHERE a.api_key_prefix = v_prefix
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_app_api_key(p_app_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_api_key TEXT;
    v_prefix TEXT;
    v_hash TEXT;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can generate API keys';
    END IF;
    
    v_api_key := 'mc_' || encode(gen_random_bytes(16), 'hex');
    v_prefix := LEFT(v_api_key, 11);
    v_hash := encode(sha256(v_api_key::bytea), 'hex');
    
    UPDATE public.apps
    SET 
        api_key_hash = v_hash,
        api_key_prefix = v_prefix,
        api_key_created_at = now()
    WHERE id = p_app_id;
    
    RETURN v_api_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_app_api_key(p_app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can revoke API keys';
    END IF;
    
    UPDATE public.apps
    SET 
        api_key_hash = NULL,
        api_key_prefix = NULL,
        api_key_created_at = NULL
    WHERE id = p_app_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_app_heartbeat(
    p_app_id UUID,
    p_status TEXT DEFAULT 'online',
    p_version TEXT DEFAULT NULL,
    p_metrics JSONB DEFAULT '{}'::jsonb,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.apps
    SET 
        last_heartbeat_at = now(),
        status = p_status,
        version = COALESCE(p_version, version),
        last_health_check = now(),
        consecutive_failures = 0
    WHERE id = p_app_id;
    
    INSERT INTO public.app_health_history (
        app_id, status, source, version, metrics, response_time_ms
    ) VALUES (
        p_app_id, p_status, 'heartbeat', p_version, p_metrics, p_response_time_ms
    );
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_app_announcements(p_app_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.message,
        a.type,
        a.starts_at,
        a.ends_at,
        a.priority
    FROM public.maintenance_announcements a
    WHERE a.is_active = true
      AND a.starts_at <= now()
      AND (a.ends_at IS NULL OR a.ends_at > now())
      AND (a.target_all_apps = true OR p_app_id = ANY(a.target_app_ids))
    ORDER BY a.priority DESC, a.starts_at DESC;
END;
$$;

-- ============================================
-- 5. EXTEND MAINTENANCE_TICKETS FOR EXTERNAL SUBMISSIONS
-- ============================================

ALTER TABLE public.maintenance_tickets
ADD COLUMN IF NOT EXISTS submitted_via TEXT DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS external_reference TEXT,
ADD COLUMN IF NOT EXISTS browser_info JSONB,
ADD COLUMN IF NOT EXISTS page_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_external_ref ON public.maintenance_tickets(app_id, external_reference) WHERE external_reference IS NOT NULL;

-- ============================================
-- 6. HELPER VIEWS
-- ============================================

CREATE OR REPLACE VIEW public.app_status_overview AS
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

CREATE OR REPLACE VIEW public.active_announcements AS
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

-- ============================================
-- 7. SEED SAMPLE ANNOUNCEMENT
-- ============================================

INSERT INTO public.maintenance_announcements (
    title, message, type, target_all_apps, starts_at, ends_at, priority
) VALUES (
    'Mission Control Plugin Available',
    'Your app is now connected to Mission Control! You can submit maintenance requests and receive status updates through this panel.',
    'info',
    true,
    now(),
    now() + INTERVAL '30 days',
    10
) ON CONFLICT DO NOTHING;