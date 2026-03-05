---
phase: 06-integration-and-edge-cases
plan: 01
subsystem: ui
tags: [react, supabase, admin, voice-bot, rls, dialog]

requires:
  - phase: 01-intake-api-and-lead-tracking
    provides: leads table, vapi_call_logs phase1 enhancements (outcome, lead_id columns)
  - phase: 02-voice-bot-setup
    provides: vapi_call_logs table populated by n8n webhook workflow
provides:
  - Admin Call Logs page with outcome filtering and transcript dialog
  - Admin Leads page with pagination, search, and conversion tracking
  - Admin read RLS policy on vapi_call_logs
  - AdminNav wiring for both pages under Quotes category
affects: [06-integration-and-edge-cases]

tech-stack:
  added: []
  patterns: [as-never-cast for ungenerated supabase types, OUTCOME_COLORS shared constant]

key-files:
  created:
    - supabase/migrations/20260305200000_vapi_call_logs_admin_rls.sql
    - src/pages/admin/CallLogs.tsx
    - src/components/admin/CallTranscriptDialog.tsx
    - src/pages/admin/Leads.tsx
  modified:
    - src/App.tsx
    - src/pages/admin/components/AdminNav.tsx

key-decisions:
  - "Migration timestamp changed from 20260303200000 to 20260305200000 to avoid collision with existing step_definitions migration"
  - "Used as never cast on vapi_call_logs and leads queries consistent with project pattern for ungenerated Supabase types"
  - "Leads import aliased as AdminLeads in App.tsx to avoid potential naming conflicts"

patterns-established:
  - "OUTCOME_COLORS exported from CallLogs.tsx for shared use across voice pipeline admin pages"
  - "CallTranscriptDialog pattern for viewing call details without a dedicated route"

requirements-completed: [INTG-03, INTG-04]

duration: 3min
completed: 2026-03-05
---

# Phase 6 Plan 01: Admin Call Logs and Leads Pages Summary

**Admin pages for voice pipeline visibility with call log filtering, transcript viewer dialog, and paginated leads table filtered by voice_bot source**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T15:46:54Z
- **Completed:** 2026-03-05T15:50:23Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Admin read RLS policy on vapi_call_logs enabling authenticated admin queries
- Call Logs page with outcome filter bar, duration formatting, linked request badges, and transcript dialog
- Leads page with pagination, search by name/phone, qualification status badges, and conversion indicators
- Both pages wired into App.tsx routes and AdminNav under the Quotes category

## Task Commits

Each task was committed atomically:

1. **Task 1: RLS migration for vapi_call_logs admin read access** - `980b38c` (feat)
2. **Task 2: CallLogs page and CallTranscriptDialog component** - `bc9b367` (feat)
3. **Task 3: Leads page, route registration, and nav wiring** - `b60c8c5` (feat)

## Files Created/Modified
- `supabase/migrations/20260305200000_vapi_call_logs_admin_rls.sql` - Admin SELECT policy using has_role pattern
- `src/pages/admin/CallLogs.tsx` - Call log table with outcome filter, duration formatting, transcript dialog trigger
- `src/components/admin/CallTranscriptDialog.tsx` - Transcript viewer dialog with summary, metadata, recording link
- `src/pages/admin/Leads.tsx` - Paginated leads table filtered by voice_bot source with search and conversion indicators
- `src/App.tsx` - Lazy route registration for /admin/call-logs and /admin/leads
- `src/pages/admin/components/AdminNav.tsx` - Call Logs and Leads items added to Quotes category

## Decisions Made
- Migration timestamp changed from plan specified 20260303200000 to 20260305200000 to avoid filename collision with existing 20260303200000_step_definitions.sql
- Used `as never` cast on vapi_call_logs and leads table queries, matching the established project pattern for tables not yet in generated Supabase types
- Leads import aliased as AdminLeads in App.tsx to avoid potential naming conflicts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration timestamp conflict resolved**
- **Found during:** Task 1 (RLS migration)
- **Issue:** Planned filename 20260303200000_vapi_call_logs_admin_rls.sql conflicts with existing 20260303200000_step_definitions.sql
- **Fix:** Used timestamp 20260305200000 instead
- **Files modified:** supabase/migrations/20260305200000_vapi_call_logs_admin_rls.sql
- **Verification:** No duplicate timestamps in migrations directory
- **Committed in:** 980b38c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Timestamp adjustment was necessary to avoid migration conflicts. No scope creep.

## Issues Encountered
- Supabase CLI access token not available in environment. Migration file created but not pushed to remote. Previous phases (05-01, 05-02) had the same situation. Migration needs to be applied via `npx supabase db push` after `npx supabase login`.

## User Setup Required

Migration needs to be pushed to remote Supabase after authenticating the CLI:
1. Run `npx supabase login` to authenticate
2. Run `npx supabase db push` from project root to apply the vapi_call_logs admin RLS migration

## Next Phase Readiness
- Both admin pages compile and build successfully
- Pages will render empty tables until voice bot calls populate vapi_call_logs and leads tables
- Migration must be applied to remote Supabase before admin can query vapi_call_logs

## Self-Check: PASSED

- FOUND: supabase/migrations/20260305200000_vapi_call_logs_admin_rls.sql
- FOUND: src/pages/admin/CallLogs.tsx
- FOUND: src/components/admin/CallTranscriptDialog.tsx
- FOUND: src/pages/admin/Leads.tsx
- FOUND: 980b38c
- FOUND: bc9b367
- FOUND: b60c8c5

---
*Phase: 06-integration-and-edge-cases*
*Completed: 2026-03-05*
