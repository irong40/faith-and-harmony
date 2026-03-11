---
phase: 15-lead-entry-and-conversion
plan: "02"
subsystem: admin-leads
tags: [leads, conversion, client, quote_request, dialog, tdd, migration]
dependency_graph:
  requires: [15-01-SUMMARY.md]
  provides: [convert-lead-dialog, link-existing-client, convert-button-in-leads-table]
  affects: [src/components/admin/ConvertLeadDialog.tsx, src/pages/admin/Leads.tsx, supabase/migrations]
tech_stack:
  added: []
  patterns: [sequential-insert-mutation, client-search-query, tdd-source-inspection, as-never-cast]
key_files:
  created:
    - src/components/admin/ConvertLeadDialog.tsx
    - src/components/admin/ConvertLeadDialog.spec.tsx
    - supabase/migrations/20260311200100_quote_requests_admin_policy.sql
  modified:
    - src/pages/admin/Leads.tsx
decisions:
  - "quote_requests required a new admin INSERT policy since 20260303500000 only added SELECT and UPDATE"
  - "ConvertLeadDialog receives source_channel in lead prop so buildQuoteRequestInsert can map it without an extra query"
  - "convertLead state held as full LeadRow rather than just an ID to avoid a second query inside the dialog"
  - "onConverted callback in parent also calls invalidateQueries so Leads.tsx remains the single source of truth for cache invalidation"
metrics:
  duration: "3 minutes"
  tasks_completed: 2
  files_changed: 4
  completed_date: "2026-03-11"
---

# Phase 15 Plan 02: Lead Conversion Dialog Summary

One-click lead conversion with new client creation or existing client linking, using a two-tab Dialog wired into the VoiceLeadsTab row actions.

## What Was Built

ConvertLeadDialog component with two tabs.

New Client tab shows caller name, phone, and email as read-only summary fields with a confirmation message and a Convert button. On click, the mutation runs three sequential operations: insert into clients, insert into quote_requests, then update leads with client_id, quote_request_id, and qualification_status set to "converted". All three steps use the authenticated Supabase JWT with admin RLS policies.

Link Existing tab provides a search input that queries clients by name or email (ilike on both columns via .or()). Results render as a selectable list. Selecting a client highlights the row with a Selected badge. Clicking Link updates only the lead record with the selected client_id and sets qualification_status to "converted". No new client or quote_request is created in this path.

Both paths call onConverted() and onClose() on success. Error cases show a destructive toast. Loading state disables the action button and shows a Loader2 spinner.

Two pure helper functions are exported for testability: buildClientInsert maps lead fields to client insert shape, and buildQuoteRequestInsert maps lead fields plus source_channel to the quote_request insert shape (voice_bot maps to "voice_bot" source, all others map to "manual").

The VoiceLeadsTab Converted column was updated. Rows with client_id show a purple Converted badge. Qualified rows without client_id show a Convert button. All other rows show the quote status or "No quote" text. The TableCell has stopPropagation so clicking Convert does not open the LeadDetailDrawer.

Migration 20260311200100 adds an admin INSERT policy on quote_requests since the existing 20260303500000 migration only added SELECT and UPDATE policies.

## Tasks

| Task | Name | Commit | Status |
| ---- | ---- | ------ | ------ |
| 1 (RED) | Failing tests for ConvertLeadDialog helpers | d9d73f1 | Complete |
| 1 (GREEN) | ConvertLeadDialog component and migration | 2ee2cc0 | Complete |
| 2 | Wire Convert button into VoiceLeadsTab rows | 8854fb8 | Complete |

## Decisions Made

1. quote_requests needed a new admin INSERT policy. The migration at 20260303500000 added SELECT (for all authenticated) and UPDATE (for admins). It did not add INSERT. Without an INSERT policy the conversion mutation would fail when the authenticated JWT attempted to insert a quote_request. Added 20260311200100 with a targeted INSERT policy using has_role check.

2. ConvertLeadDialogProps includes source_channel. The context doc showed the original props type without source_channel, but buildQuoteRequestInsert needs it to set the source field correctly. Adding it to the prop type avoids a secondary query inside the dialog and keeps the component data-complete from the parent.

3. convertLead state is typed as LeadRow | null. Holding the full row rather than just the ID means the dialog can display caller name, phone, and email immediately without a refetch. The parent already has all the data from the leads query.

4. Cache invalidation happens in two places: inside ConvertLeadDialog mutations (for robustness) and in the onConverted callback in Leads.tsx (per plan spec). The duplicate invalidation is harmless and ensures the table refreshes correctly whether or not the parent wires the callback correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added admin INSERT RLS policy on quote_requests**
- Found during: Task 1 implementation review
- Issue: The plan noted that quote_requests may lack an admin INSERT policy and directed checking migration 20260303500000. That migration confirms only SELECT and UPDATE policies exist. Without INSERT, the new-client conversion flow would fail at runtime when the authenticated JWT hits the RLS check.
- Fix: Created supabase/migrations/20260311200100_quote_requests_admin_policy.sql with a has_role-gated INSERT policy.
- Files modified: supabase/migrations/20260311200100_quote_requests_admin_policy.sql
- Commit: 2ee2cc0

## Verification

- npx vitest run src/components/admin/ConvertLeadDialog.spec.tsx: 12 tests pass
- npx tsc --noEmit: zero errors
- Convert button visible only on rows where qualification_status === "qualified" and client_id is null
- Converted badge (purple) replaces Convert button when client_id is set
- ConvertLeadDialog has two tabs: New Client and Link Existing
- Link Existing tab has search input and client result list

## Self-Check: PASSED

Files verified:
- FOUND: src/components/admin/ConvertLeadDialog.tsx
- FOUND: src/components/admin/ConvertLeadDialog.spec.tsx
- FOUND: supabase/migrations/20260311200100_quote_requests_admin_policy.sql
- FOUND: src/pages/admin/Leads.tsx (contains ConvertLeadDialog import and Convert button logic)

Commits verified:
- FOUND: d9d73f1 test(15-02): add failing tests for ConvertLeadDialog pure helpers and structure
- FOUND: 2ee2cc0 feat(15-02): add ConvertLeadDialog with new client and link existing flows
- FOUND: 8854fb8 feat(15-02): wire Convert button into VoiceLeadsTab rows
