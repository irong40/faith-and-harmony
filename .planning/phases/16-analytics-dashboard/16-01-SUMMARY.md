---
phase: 16-analytics-dashboard
plan: "01"
subsystem: database
tags: [postgres, rpc, react-query, analytics, supabase]

requires:
  - phase: 13-schema-foundation
    provides: leads table with source_channel enum, lead_activity view, lead_notes table
  - phase: 14-detail-drawer
    provides: LeadDetail drawer and inline editing infrastructure
  - phase: 15-lead-entry-conversion
    provides: leads with client_id populated by conversion flow, drone_jobs revenue data

provides:
  - Postgres lead_stats(text) RPC function returning jsonb with all 4 analytics metrics
  - useLeadStats(timeWindow) React Query hook typed for all 4 metrics

affects:
  - 16-02 analytics dashboard UI (consumes useLeadStats hook)

tech-stack:
  added: []
  patterns:
    - "Single RPC call returns all analytics metrics as jsonb to avoid N+1 queries from the client"
    - "React Query wraps RPC with 30 second stale time to prevent excessive database load"
    - "(supabase as any).rpc() cast pattern for functions not yet in generated types"

key-files:
  created:
    - supabase/migrations/20260312100000_lead_analytics_functions.sql
    - src/hooks/useLeadStats.ts
  modified: []

key-decisions:
  - "Conversion metric counts leads with qualification_status = qualified AND client_id IS NOT NULL because the leads table has no converted status value"
  - "Revenue joins leads to clients to drone_jobs via client_id rather than a direct lead to job relationship"
  - "lead_activity view used for response time instead of lead_notes directly so all event types count toward first contact"
  - "SECURITY DEFINER on lead_stats so the function runs with owner privileges and can join across RLS-protected tables consistently"

patterns-established:
  - "Analytics RPC pattern: single jsonb-returning function for multi-metric dashboards"

requirements-completed: [ANLY-01, ANLY-02, ANLY-03, ANLY-04]

duration: 1min
completed: 2026-03-12
---

# Phase 16 Plan 01: Lead Analytics RPC Function and Hook Summary

Postgres lead_stats RPC function returning conversion rate, source breakdown, avg response time, and revenue from converted leads in one call, plus a typed React Query hook.

## Performance

- Duration: 1 min
- Started: 2026-03-12T00:12:09Z
- Completed: 2026-03-12T00:13:08Z
- Tasks: 2
- Files modified: 2

## Accomplishments

- Created lead_stats(text) Postgres function that computes all 4 analytics metrics server side in a single RPC call
- Implemented revenue calculation joining leads to clients to drone_jobs and converting cents to dollars
- Created useLeadStats React Query hook with exported TypeScript types ready for the dashboard UI

## Task Commits

Each task was committed atomically:

1. Task 1: Create lead_stats Postgres RPC function `5ede539` (feat)
2. Task 2: Create useLeadStats React Query hook `83fa7b9` (feat)

## Files Created/Modified

- `supabase/migrations/20260312100000_lead_analytics_functions.sql` - Postgres function computing all 4 analytics metrics with grants for authenticated and service_role
- `src/hooks/useLeadStats.ts` - React Query hook wrapping lead_stats RPC, exports TimeWindow and LeadStats types

## Decisions Made

Conversion metric counts leads with qualification_status = qualified AND client_id IS NOT NULL. The leads table has no "converted" status value. A lead is considered converted when it has been linked to a client record.

Revenue joins leads to clients to drone_jobs via client_id. This is a two-hop join through the clients table because drone_jobs does not reference leads directly.

lead_activity view used for response time. All event types (status changes, notes, conversion events) count toward the first contact calculation, not just notes.

SECURITY DEFINER applied to lead_stats so the function runs with consistent owner privileges when joining across RLS-protected tables from the analytics page.

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None. The migration deploys to Supabase via the normal `supabase db push` workflow. No external service configuration required.

## Next Phase Readiness

Plan 01 complete. The lead_stats RPC function and useLeadStats hook are ready for Plan 02 which builds the analytics dashboard UI. The hook exports TimeWindow and LeadStats types so the stat cards can import them directly.

No blockers.

---
Phase: 16-analytics-dashboard
Completed: 2026-03-12
