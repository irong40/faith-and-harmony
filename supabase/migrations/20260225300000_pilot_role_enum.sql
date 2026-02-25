-- =====================================================
-- Phase 6: Add 'pilot' to app_role enum
-- =====================================================
-- The app_role enum currently has 'admin' and 'user'.
-- Pilots use a profile-based role check, but adding
-- 'pilot' to the enum lets has_role() work uniformly.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pilot'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'pilot';
  END IF;
END$$;

COMMENT ON TYPE public.app_role IS 'Application roles: admin (full access), user (standard), pilot (field operations)';
