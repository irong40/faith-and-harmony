---
phase: 01-intake-api-and-lead-tracking
plan: 01
subsystem: database
tags: [postgres, supabase, migrations, rls, leads]

requires:
  - phase: none
    provides: existing clients and quote_requests tables
provides:
  - leads table with RLS and indexes
  - vapi_call_logs sentiment, outcome, and lead_id columns
  - quote_requests source column and nullable email
affects: [01-03, intake-lead, admin-ui]

tech-stack:
  added: []
  patterns: [has_role RLS pattern for leads, IF NOT EXISTS defensive migrations]

key-files:
  created:
    - supabase/migrations/20260303100000_create_leads_table.sql
    - supabase/migrations/20260303100001_vapi_call_logs_phase1.sql
    - supabase/migrations/20260303100002_quote_requests_source.sql
  modified: []

key-decisions:
  - "Used has_role(auth.uid(), 'admin'::app_role) pattern instead of profiles.role for leads admin RLS policy"
  - "Dropped customer_id and service_request_id from vapi_call_logs (dangling FKs to nonexistent tables)"

patterns-established:
  - "Leads table convention: caller identity + source tracking + qualification state + FK links"
  - "Defensive IF NOT EXISTS for all ADD COLUMN operations on existing tables"

requirements-completed: [INTAKE-01, INTAKE-02]

duration: 8min
completed: 2026-03-03
---

# Plan 01-01: Database Schema Summary

**Leads table, vapi_call_logs sentiment/outcome columns, quote_requests source tracking, and dangling FK cleanup across three Supabase migrations**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Created leads table with caller identity, source channel, qualification status, and FK links to clients and quote_requests
- Added sentiment, outcome, and lead_id columns to vapi_call_logs while removing dangling customer_id and service_request_id FKs
- Added source column to quote_requests (default 'web') and relaxed email NOT NULL constraint for voice bot leads

## Task Commits

1. **Task 1: Create database migrations** - `ea9841a` (feat)
2. **Task 2: Push migrations to Supabase and verify schema** - verified via schema dump

## Files Created/Modified
- `supabase/migrations/20260303100000_create_leads_table.sql` - Leads table with RLS, service_role and admin policies, indexes on call_id, client_id, and qualification_status
- `supabase/migrations/20260303100001_vapi_call_logs_phase1.sql` - sentiment, outcome, lead_id columns added; customer_id and service_request_id dropped
- `supabase/migrations/20260303100002_quote_requests_source.sql` - source column with 'web' default, email DROP NOT NULL, index on (source, created_at)

## Decisions Made
- Used `has_role(auth.uid(), 'admin'::app_role)` for leads admin RLS policy instead of `profiles.role = 'admin'` (profiles table lacks a role column; the project uses user_roles table with has_role function)
- Kept defensive `ADD COLUMN IF NOT EXISTS` for transcript and duration_seconds on vapi_call_logs even though they already exist (documents INTAKE-02 compliance)

## Deviations from Plan

### Auto-fixed Issues

**1. Admin RLS policy pattern mismatch**
- **Found during:** Task 2 (migration push)
- **Issue:** Plan specified `profiles.role = 'admin'` pattern but profiles table has no role column. Migration failed with SQLSTATE 42703.
- **Fix:** Changed to `has_role(auth.uid(), 'admin'::app_role)` matching the project standard pattern used across 30+ existing policies
- **Files modified:** supabase/migrations/20260303100000_create_leads_table.sql
- **Verification:** Migration applied successfully on retry
- **Committed in:** ea9841a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (RLS pattern correction)
**Impact on plan:** Necessary for migration to apply. No scope creep.

## Issues Encountered
None beyond the RLS pattern fix above.

## User Setup Required
None.

## Next Phase Readiness
- leads, vapi_call_logs, and quote_requests schema changes are live on remote Supabase
- Plan 01-03 (intake-lead edge function) can now insert into all three tables

---
*Phase: 01-intake-api-and-lead-tracking*
*Completed: 2026-03-03*
