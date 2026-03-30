---
phase: 14-detail-drawer-and-inline-editing
plan: 03
subsystem: admin-leads-drawer
tags: [leads, drawer, notes, activity-timeline, useMutation, supabase, react-query]

requires:
  - phase: 14-02
    provides: LeadDetailDrawer shell with PLAN-03 comment placeholders for notes form and activity timeline

provides:
  - Notes form inside LeadDetailDrawer with Textarea, reason tag Select, and follow-up date Calendar picker
  - useMutation that inserts into lead_notes table with lead_id, content, reason_tag, follow_up_at, created_by
  - Activity timeline fetched from lead_activity view, sorted newest first, with type badge, summary, and timestamp
  - Form resets and query cache invalidation on successful note save
  - LeadDetailDrawer fully functional (DETL-03, DETL-04, DETL-05 complete)

affects: [phase-15-lead-entry-and-conversion, admin-leads-drawer]

tech-stack:
  added: []
  patterns:
    - useMutation with supabase insert using `as never` cast for tables outside generated types
    - Calendar inside Popover for date picking (consistent with Scheduling.tsx)
    - useQuery for activity timeline with 30s staleTime and `enabled: !!leadId` gate
    - Form reset pattern in onSuccess callback (state setters to initial values)
    - TDD with source inspection using fs.readFileSync for React component behavior specs

key-files:
  created:
    - src/components/admin/LeadDetailDrawer.spec.tsx
  modified:
    - src/components/admin/LeadDetailDrawer.tsx

key-decisions:
  - "useToast from @/hooks/use-toast used (not sonner) to match existing admin component pattern"
  - "Both tasks implemented in a single file update since the transcript section restructure required touching the same region as the timeline insertion"
  - "Transcript section labeled with 'Transcript' header and both transcript + timeline rendered inside ScrollArea so entire bottom section scrolls together"
  - "Notes form renders even when there is no callLog (leads can have notes without a voice call)"

patterns-established:
  - "lead_notes insert: supabase.from('lead_notes' as never).insert({ ... } as never) for tables not in generated types"
  - "lead_activity query: queryKey ['lead-activity', leadId], enabled: !!leadId, staleTime 30_000"
  - "Query invalidation on note save: invalidate lead-detail, admin-leads, and lead-activity keys"

requirements-completed: [DETL-03, DETL-04, DETL-05]

duration: 5min
completed: 2026-03-11
---

# Phase 14 Plan 03: Notes Form and Activity Timeline Summary

Notes form with Textarea, reason tag Select, and Calendar date picker inserts into lead_notes via useMutation, with an activity timeline below the transcript querying the lead_activity view and rendering event type badges, summaries, and timestamps.

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T19:42:51Z
- **Completed:** 2026-03-11T19:47:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Notes form replaces PLAN-03 placeholder with Textarea, four-option reason tag Select, and Calendar Popover date picker
- useMutation inserts into lead_notes with all required fields, resets form state on success, and invalidates three query cache keys
- Activity timeline replaces PLAN-03 placeholder with useQuery against lead_activity view, rendering events with colored type badges (blue/green/purple), summary text, and formatted timestamp
- Transcript section restructured with "Transcript" label and both transcript and timeline inside ScrollArea for unified scrolling
- 12 TDD spec tests all pass, TypeScript compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **TDD RED: Failing tests for notes form and activity timeline** - `1133d6a` (test)
2. **Task 1 + 2: Notes form, activity timeline, imports, types** - `f8f3128` (feat)

## Files Created/Modified

- `src/components/admin/LeadDetailDrawer.tsx` - Added notes form (useState, useMutation, JSX) and activity timeline (useQuery, ActivityEvent type, event maps, JSX), restructured transcript section
- `src/components/admin/LeadDetailDrawer.spec.tsx` - 12 TDD spec tests covering state init, Save disabled on empty, form reset, lead_notes insert, query invalidation, UI components, timeline query, event rendering, empty state, loading skeletons

## Decisions Made

- Used `useToast` from `@/hooks/use-toast` rather than `sonner` to match existing admin component pattern (ClientFormDialog, AccessoryFormDialog all use useToast)
- Notes form renders regardless of whether a callLog exists since admins may want to note leads that came in through web form or manual entry with no voice call
- Transcript section given a "Transcript" label heading and both transcript and timeline placed inside a single ScrollArea so they scroll together as one unified content area
- Both tasks implemented in the same file edit since Task 2's timeline required restructuring the same JSX region that Task 1's notes form was adjacent to

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None. No external service configuration required.

## Next Phase Readiness

- LeadDetailDrawer is fully functional. All Phase 14 drawer requirements (DETL-01 through DETL-05) are complete.
- Phase 15 (Lead Entry and Conversion) can proceed. The drawer provides the notes and activity foundation that converted leads will need.
- The lead_notes table and lead_activity view are in place from Phase 13 migrations, ready for Phase 15 queries.

---
*Phase: 14-detail-drawer-and-inline-editing*
*Completed: 2026-03-11*
