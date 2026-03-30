---
phase: 13-schema-foundation
plan: 02
subsystem: database
tags: [postgres, supabase, view, rls, migrations]

requires:
  - 13-01 (lead_notes table and source_channel enum)
provides:
  - lead_activity view with five columns (lead_id, event_type, event_at, summary, source_id)
  - Queryable chronological timeline for the Phase 14 detail drawer
affects:
  - 14-detail-drawer
  - 15-lead-entry
  - 16-analytics-dashboard

tech-stack:
  added: []
  patterns:
    - "View pattern: SECURITY INVOKER (Postgres 15+ default) so caller RLS on underlying tables applies automatically"
    - "UNION ALL pattern: each branch returns identical column shape (lead_id, event_type, event_at, summary, source_id)"
    - "Grant pattern: GRANT SELECT to authenticated and service_role on views"

key-files:
  created:
    - supabase/migrations/20260311110000_lead_activity_view.sql
  modified: []

key-decisions:
  - "View not table: leads table has no status change history, only current status. A view avoids triggers or a separate event log while still giving Phase 14 a queryable timeline."
  - "status_change limitation is by design: shows last known status via updated_at, not a full history. A future lead_status_history table can replace this branch if full history is needed."
  - "SECURITY INVOKER retained (not overridden): the existing has_role() RLS policies on leads and lead_notes handle access control. No duplicate grants needed."

requirements-completed: [DETL-05]

duration: 26s
completed: 2026-03-11
---

# Phase 13 Plan 02: Lead Activity View Summary

**Postgres view lead_activity unions three event types (status_change, note_added, converted) from the leads and lead_notes tables, returning a five-column timeline queryable by lead_id**

## Performance

- **Duration:** 26 seconds
- **Started:** 2026-03-11T03:46:41Z
- **Completed:** 2026-03-11T03:47:07Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- lead_activity view ready for Phase 14 detail drawer. Query pattern is `SELECT * FROM lead_activity WHERE lead_id = $1 ORDER BY event_at DESC`.
- View handles empty tables gracefully. Zero rows in lead_notes returns zero note_added rows without error.
- SECURITY INVOKER behavior (Postgres 15+ default) means the existing admin RLS policies on leads and lead_notes control access automatically. No new policies required.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lead_activity view** - `22be31e` (feat)

**Plan metadata:** (pending docs commit)

## Migration File

- **Filename:** `supabase/migrations/20260311110000_lead_activity_view.sql`
- **Timestamp:** 20260311110000 (sequential after plan 01's 20260311100100)

## View Column Shape

| Column | Type | Description |
|--------|------|-------------|
| lead_id | uuid | FK to leads.id |
| event_type | text | One of status_change, note_added, converted |
| event_at | timestamptz | When the event occurred |
| summary | text | Human readable description (truncated at 80 chars for notes) |
| source_id | uuid | ID of the originating row for deduplication or linking |

## Known Limitations

**status_change shows current status only, not full history.** The leads table stores only the current qualification_status, not a change log. The status_change branch in the view surfaces a single row per lead using updated_at as event_at. This represents "the last time the lead record was touched" rather than a true status change timestamp.

If full status history is needed in the future, the path is:
1. Add a lead_status_history table (id, lead_id, old_status, new_status, changed_at, changed_by)
2. Add a trigger on leads that inserts a row on qualification_status change
3. Update the status_change branch of lead_activity to UNION ALL from lead_status_history instead of leads

This is a known, documented trade-off. Phase 14 can display the timeline with the current data shape. The limitation is visible in the view comment.

## Deviations from Plan

None. Plan executed exactly as written.

## Self-Check: PASSED

- supabase/migrations/20260311110000_lead_activity_view.sql: FOUND
- .planning/phases/13-schema-foundation/13-02-SUMMARY.md: FOUND
- Commit 22be31e: FOUND (feat Task 1)

---
*Phase: 13-schema-foundation*
*Completed: 2026-03-11*
