-- ============================================
-- DROP DEAD WEIGHT TABLES
-- ============================================
-- Removes tables for features stripped in backend refocus:
--   1. Mission Control API (apps, health, tickets, announcements)
--   2. Governance module (compliance, decisions, budgets)
--   3. Land Listing Monitor (sources, regions, listings, jobs, outreach)
--   4. Marketplace Leads (sources, leads, scan runs)
--
-- KEPT: conversations, messages, notifications (active in Messages page + NotificationBell)

BEGIN;

-- ============================================
-- 1. MISSION CONTROL / APPS
-- ============================================

-- Remove cron jobs referencing these tables (if any)
-- Drop child tables first (foreign key order)
DROP TABLE IF EXISTS public.app_health_history CASCADE;
DROP TABLE IF EXISTS public.maintenance_tickets CASCADE;
DROP TABLE IF EXISTS public.maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.maintenance_announcements CASCADE;

-- Remove app_id foreign key from conversations and notifications (they stay, but the FK goes)
ALTER TABLE public.conversations DROP COLUMN IF EXISTS app_id;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS app_id;

-- Now drop apps (parent)
DROP TABLE IF EXISTS public.apps CASCADE;

-- Clean up functions
DROP FUNCTION IF EXISTS public.generate_ticket_number();
DROP FUNCTION IF EXISTS public.set_ticket_number();

-- ============================================
-- 2. GOVERNANCE
-- ============================================

-- Drop storage bucket
DELETE FROM storage.buckets WHERE id = 'governance';

-- Drop tables
DROP TABLE IF EXISTS public.governance_decisions CASCADE;
DROP TABLE IF EXISTS public.governance_log CASCADE;
DROP TABLE IF EXISTS public.financial_actuals CASCADE;
DROP TABLE IF EXISTS public.budget_baselines CASCADE;
DROP TABLE IF EXISTS public.compliance_obligations CASCADE;

-- ============================================
-- 3. LAND LISTING MONITOR
-- ============================================

-- Remove cron job (if pg_cron is installed and job exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-land-scan') THEN
    PERFORM cron.unschedule('daily-land-scan');
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- pg_cron not installed or cron.job doesn't exist, skip
  NULL;
END $$;

-- Drop views first (before base tables)
DROP VIEW IF EXISTS public.land_listing_opportunities;
DROP VIEW IF EXISTS public.land_monitor_summary;

-- Drop tables (child first)
DROP TABLE IF EXISTS public.land_listing_outreach CASCADE;
DROP TABLE IF EXISTS public.land_monitor_jobs CASCADE;
DROP TABLE IF EXISTS public.land_listings CASCADE;
DROP TABLE IF EXISTS public.land_monitor_regions CASCADE;
DROP TABLE IF EXISTS public.land_listing_sources CASCADE;

-- ============================================
-- 4. MARKETPLACE LEADS
-- ============================================

-- Drop views first
DROP VIEW IF EXISTS public.marketplace_lead_opportunities;
DROP VIEW IF EXISTS public.marketplace_pl_summary;

-- Drop tables (child first)
DROP TABLE IF EXISTS public.marketplace_scan_runs CASCADE;
DROP TABLE IF EXISTS public.marketplace_leads CASCADE;
DROP TABLE IF EXISTS public.marketplace_lead_sources CASCADE;

COMMIT;
