---
phase: 14-detail-drawer-and-inline-editing
plan: 01
subsystem: admin-leads-table
tags: [leads, table, inline-edit, badges, tdd]
dependency_graph:
  requires: [13-01, 13-02]
  provides: [SRCE-02, EDIT-01, DETL-04-partial]
  affects: [src/pages/admin/Leads.tsx]
tech_stack:
  added: []
  patterns: [TDD with vitest, useMutation with cache invalidation, shadcn Select inline edit]
key_files:
  created:
    - src/pages/admin/Leads.spec.ts
  modified:
    - src/pages/admin/Leads.tsx
decisions:
  - isOverdue exported from Leads.tsx so spec can import without mocking module internals
  - SelectValue import retained even though unused — part of standard shadcn Select bundle import
  - voice_bot filter removed at the query level so all 5 source channels are visible in one tab
metrics:
  duration: 3 minutes
  completed: 2026-03-11
  tasks_completed: 2
  files_modified: 2
---

# Phase 14 Plan 01: Voice Leads Table Enhancements Summary

Source channel badges with five distinct colors, an inline qualification status dropdown that saves on change, and amber row highlights for overdue follow-up dates. Row click cursor prepared for Plan 02 drawer wiring.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Extend LeadRow type and query for lead_notes and all source channels | 7d41e3d | Leads.tsx, Leads.spec.ts |
| 2 | Add inline qualification status dropdown with optimistic update | a2e61b8 | Leads.tsx |

## What Was Built

Task 1 extended the VoiceLeadsTab in three areas.

The LeadRow type gained `lead_notes: Array<{ follow_up_at: string | null }>`. The Supabase select string was updated to include `lead_notes ( follow_up_at )`. The `.eq("source_channel", "voice_bot")` filter was removed so all five source channels appear in the table.

The `isOverdue` helper compares any non-null `follow_up_at` entry against the current time and returns true if any entry is in the past. It is exported so the spec can import it directly.

`SOURCE_CHANNEL_COLORS` maps the five enum values to distinct Tailwind badge colors. `SOURCE_CHANNEL_LABELS` maps them to human-readable display strings. A new Source column was added to the table header and each row renders the source badge. Overdue rows apply `border-l-4 border-amber-400 bg-amber-50/40` via `isOverdue`.

Task 2 added the inline Select to the status cell. The Select wraps the existing OUTCOME_COLORS badge as its trigger. `onValueChange` fires `updateStatusMutation.mutate` which calls `supabase.from("leads").update`. Success invalidates the `admin-leads` query cache and shows a toast. Click propagation on the status cell stops before it reaches the row, keeping the drawer click (Plan 02) isolated.

## Verification

- `npx vitest run src/pages/admin/Leads.spec.ts`: 5 tests pass (isOverdue cases)
- `npx tsc --noEmit`: no errors in Leads.tsx

## Deviations from Plan

None. Plan executed exactly as written.

## Self-Check: PASSED

All files confirmed on disk. Both commits verified in git log.

| Item | Result |
| ---- | ------ |
| src/pages/admin/Leads.tsx | FOUND |
| src/pages/admin/Leads.spec.ts | FOUND |
| 14-01-SUMMARY.md | FOUND |
| commit 7d41e3d | FOUND |
| commit a2e61b8 | FOUND |
