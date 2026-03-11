---
phase: 15-lead-entry-and-conversion
plan: "01"
subsystem: admin-leads
tags: [leads, rls, source-filter, new-lead-dialog, migration]
dependency_graph:
  requires: [14-03-SUMMARY.md]
  provides: [admin-insert-leads, admin-update-leads, source-channel-filter, new-lead-dialog]
  affects: [src/pages/admin/Leads.tsx, supabase/migrations]
tech_stack:
  added: []
  patterns: [per-channel-count-query, tdd-export-for-spec, controlled-dialog-form]
key_files:
  created:
    - supabase/migrations/20260311200000_leads_admin_write_policy.sql
  modified:
    - src/pages/admin/Leads.tsx
    - src/pages/admin/Leads.spec.ts
decisions:
  - "Two separate RLS policies (admins_insert_leads and admins_update_leads) keep revocation granular for future phases"
  - "Source counts use one Supabase query per channel (5 requests) rather than a GROUP BY because the leads table uses as-never casts that make aggregate queries impractical"
  - "voice_bot excluded from New Lead source select since voice bot leads arrive via Vapi automatically"
metrics:
  duration: "2 minutes"
  tasks_completed: 2
  files_changed: 3
  completed_date: "2026-03-11"
---

# Phase 15 Plan 01: Lead Entry and Conversion (Manual Create + Source Filter) Summary

Admin can now create leads manually and filter the Voice Leads table by source channel with per-channel counts shown on each filter button.

## What Was Built

Two capabilities added to the Voice Leads admin tab.

Source channel filter: A second row of filter buttons appears below the status filter row. Each button shows the channel label and the count of matching leads for the current status and search. Clicking a source button adds an `.eq("source_channel", ...)` condition to the main leads query and resets pagination to page 0. An "All Sources" button clears the filter.

New Lead dialog: A "New Lead" button in the top right of the VoiceLeadsTab opens a Dialog with fields for name (required), phone (required), email (optional), source Select (manual, web form, email, social), and a note Textarea (optional). On submit, the mutation inserts one row into leads with `qualification_status: "pending"`, then inserts a lead_notes row if a note was provided. On success the dialog closes, form resets, and the admin-leads query is invalidated.

RLS migration: Two new policies on the leads table grant authenticated admin users INSERT and UPDATE access. Kept as separate policies so future phases can revoke one without affecting the other.

## Tasks

| Task | Name | Commit | Status |
| 1 | Migration for admin write policies | 22d5409 | Complete |
| 2 (RED) | Failing tests for isSourceFilterActive | 35fe374 | Complete |
| 2 (GREEN) | Source filter, New Lead dialog, implementation | ba94517 | Complete |

## Decisions Made

1. Two separate RLS policies rather than one FOR ALL policy. A single FOR ALL policy covering both INSERT and UPDATE cannot be partially revoked without dropping and recreating. Two discrete policies let future phases drop INSERT access (if the manual entry feature is removed) while keeping UPDATE (for status changes and client linking).

2. Per-channel count queries via Promise.all rather than a GROUP BY aggregate. The leads Supabase client uses `as never` casts throughout (required to work around generated type gaps). Aggregate selects with GROUP BY are harder to type correctly with that pattern. Five lightweight count queries with `head: true` are fast enough and readable.

3. voice_bot excluded from New Lead source select. Voice bot leads arrive automatically from Vapi. An admin selecting voice_bot in a manual form would be misleading data.

4. `isSourceFilterActive` exported as a pure function so Leads.spec.ts can test it without module mocking, following the same pattern as `isOverdue` from Phase 14.

## Deviations from Plan

None. Plan executed exactly as written.

## Verification

- Migration file exists with both policy names: PASS
- `npx vitest run src/pages/admin/Leads.spec.ts` all 8 tests pass: PASS
- `npx tsc --noEmit` zero errors: PASS

## Self-Check: PASSED

Files verified:
- FOUND: supabase/migrations/20260311200000_leads_admin_write_policy.sql
- FOUND: src/pages/admin/Leads.tsx (contains "New Lead" and "All Sources")
- FOUND: src/pages/admin/Leads.spec.ts (contains isSourceFilterActive tests)

Commits verified:
- FOUND: 22d5409 feat(15-01): add admin insert and update policies on leads table
- FOUND: 35fe374 test(15-01): add failing tests for isSourceFilterActive
- FOUND: ba94517 feat(15-01): add source channel filter and New Lead dialog to VoiceLeadsTab
