-- ============================================
-- Mission Control: Bootstrap Self-Registration
-- ============================================
-- Allows satellite apps to self-register using a shared bootstrap secret.
-- Admin sets MC_BOOTSTRAP_SECRET env var on edge functions.
-- Satellite app calls POST /register with the secret + app metadata.
-- Returns a fresh API key. App appears in /admin/apps immediately.

CREATE OR REPLACE FUNCTION public.register_app_with_bootstrap(
    p_name TEXT,
    p_code TEXT,
    p_url TEXT DEFAULT NULL,
    p_owner_email TEXT DEFAULT NULL,
    p_owner_name TEXT DEFAULT NULL,
    p_version TEXT DEFAULT NULL
)
RETURNS TABLE (
    app_id UUID,
    api_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_app_id UUID;
    v_api_key TEXT;
    v_prefix TEXT;
    v_hash TEXT;
    v_existing_id UUID;
BEGIN
    -- Check if app code already exists
    SELECT id INTO v_existing_id FROM public.apps WHERE code = p_code;

    IF v_existing_id IS NOT NULL THEN
        -- App exists. If it already has a key, return error via empty result.
        -- If it lost its key (revoked), re-issue one.
        IF EXISTS (SELECT 1 FROM public.apps WHERE id = v_existing_id AND api_key_hash IS NOT NULL) THEN
            RAISE EXCEPTION 'App with code "%" is already registered. Use the existing API key or revoke it from admin first.', p_code;
        END IF;
        v_app_id := v_existing_id;

        -- Update metadata in case it changed
        UPDATE public.apps SET
            name = COALESCE(p_name, name),
            url = COALESCE(p_url, url),
            owner_email = COALESCE(p_owner_email, owner_email),
            owner_name = COALESCE(p_owner_name, owner_name),
            version = COALESCE(p_version, version),
            active = true
        WHERE id = v_app_id;
    ELSE
        -- Insert new app
        INSERT INTO public.apps (name, code, url, owner_email, owner_name, version, status, active)
        VALUES (p_name, p_code, p_url, p_owner_email, p_owner_name, p_version, 'offline', true)
        RETURNING id INTO v_app_id;
    END IF;

    -- Generate API key (same logic as generate_app_api_key but without admin check)
    v_api_key := 'mc_' || encode(gen_random_bytes(16), 'hex');
    v_prefix := LEFT(v_api_key, 11);
    v_hash := encode(sha256(v_api_key::bytea), 'hex');

    UPDATE public.apps SET
        api_key_hash = v_hash,
        api_key_prefix = v_prefix,
        api_key_created_at = now()
    WHERE id = v_app_id;

    RETURN QUERY SELECT v_app_id, v_api_key;
END;
$$;
