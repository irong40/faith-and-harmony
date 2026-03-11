---
phase: 15-lead-entry-and-conversion
plan: 03
subsystem: ui
tags: [react, typescript, shadcn, tanstack-query, supabase, checkbox, bulk-actions]

requires:
  - phase: 15-02
    provides: ConvertLeadDialog with new-client and link-existing-client flows, Convert button in VoiceLeadsTab rows

provides:
  - Checkbox column on qualified-unconverted lead rows in VoiceLeadsTab
  - Bulk selection state with header select-all and per-row toggles
  - Bulk action bar showing selected count, Bulk Convert button, and Clear selection button
  - handleBulkConvert using Promise.allSettled for independent per-lead conversion
  - Per-lead result summary showing OK or Failed badge per lead after bulk convert
  - getQualifiedUnconvertedLeads and toggleLeadSelection exported pure functions

affects: [16-analytics-dashboard]

tech-stack:
  added: []
  patterns:
    - "Bulk selection state as Set<string> with useEffect reset on filter/page change"
    - "Promise.allSettled loop for independent parallel operations with partial failure tolerance"
    - "BulkResult type for per-item status tracking after allSettled"

key-files:
  created: []
  modified:
    - src/pages/admin/Leads.tsx
    - src/pages/admin/Leads.spec.ts

key-decisions:
  - "useEffect resets selectedLeadIds when page, statusFilter, or sourceChannelFilter changes to prevent stale selection across navigation"
  - "handleBulkConvert defined as async function (not useMutation) since each sub-conversion is independent and Promise.allSettled handles partial failure natively"
  - "BulkResult type defined inline in component scope alongside state to keep it co-located"
  - "Checkbox cell uses onClick stopPropagation to prevent row drawer opening on checkbox click"

patterns-established:
  - "Exported pure functions pattern: getQualifiedUnconvertedLeads and toggleLeadSelection join isOverdue and isSourceFilterActive as testable exports from Leads.tsx"

requirements-completed: [CONV-03]

duration: 4min
completed: 2026-03-11
---

# Phase 15 Plan 03: Bulk Lead Conversion Summary

Checkbox column with bulk selection and Promise.allSettled bulk convert for qualified-unconverted leads in VoiceLeadsTab, with per-lead success and failure results.

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T21:25:04Z
- **Completed:** 2026-03-11T21:29:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added getQualifiedUnconvertedLeads and toggleLeadSelection as exported pure functions with full test coverage
- Checkbox column renders on qualified-unconverted rows only, with header select-all for the current page
- Bulk action bar with selected count, Bulk Convert button, and Clear selection appears when any lead is checked
- handleBulkConvert runs each conversion independently via Promise.allSettled, so one failure does not block others
- Per-lead OK or Failed result summary displayed after bulk convert completes

## Task Commits

1. **Task 1: Checkbox column and bulk selection state** - `7fe50f0` (feat, TDD)
2. **Task 2: Bulk action bar and bulk convert mutation** - `242b52b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/pages/admin/Leads.tsx` - Added useEffect, Checkbox imports, getQualifiedUnconvertedLeads, toggleLeadSelection, selectedLeadIds state, Checkbox column in header and rows, bulkConverting/bulkResults state, handleBulkConvert function, bulk action bar JSX, results summary JSX
- `src/pages/admin/Leads.spec.ts` - Added 7 tests for getQualifiedUnconvertedLeads (4 cases) and toggleLeadSelection (3 cases), total 15 tests

## Decisions Made

- useEffect resets selectedLeadIds when page, statusFilter, or sourceChannelFilter changes. Avoids stale selection when admin navigates pages or changes filters.
- handleBulkConvert as async function rather than useMutation. Each sub-conversion is independent and Promise.allSettled handles partial failures natively without needing mutation hooks.
- BulkResult type declared inline next to state. Keeps it co-located with the only component that uses it.
- Checkbox cell uses onClick stopPropagation. Prevents the row click handler from opening the detail drawer when admin clicks a checkbox.

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None. No external service configuration required.

## Next Phase Readiness

Phase 15 is complete. All three plans shipped:
- Plan 01: Schema migration, per-channel counts, New Lead form, source filter
- Plan 02: ConvertLeadDialog with new-client and link-existing-client flows
- Plan 03: Checkbox bulk selection and bulk convert with Promise.allSettled

Phase 16 (Analytics Dashboard) can begin. It will consume the leads, clients, and quote_requests data established across Phase 15.

---
*Phase: 15-lead-entry-and-conversion*
*Completed: 2026-03-11*
