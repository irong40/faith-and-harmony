---
phase: 14-detail-drawer-and-inline-editing
plan: 02
subsystem: admin-leads-drawer
tags: [leads, drawer, transcript, audio-player, sheet]
dependency_graph:
  requires: [14-01]
  provides: [DETL-01, DETL-02]
  affects: [src/components/admin/LeadDetailDrawer.tsx, src/pages/admin/Leads.tsx]
tech_stack:
  added: []
  patterns: [Sheet drawer, useQuery with enabled flag, native HTML audio element, Skeleton loading states]
key_files:
  created:
    - src/components/admin/LeadDetailDrawer.tsx
  modified:
    - src/pages/admin/Leads.tsx
decisions:
  - LeadDetail type defined locally in the drawer rather than imported from types.ts to avoid coupling to generated types that cast with `as never`
  - formatDuration copied into drawer rather than imported from CallLogs.tsx per plan instruction (avoids cross-page imports)
  - LeadDetailDrawer rendered inside the container div (after Tabs closing tag) so it overlays the full page correctly
  - VoiceLeadsTabProps type defined locally in Leads.tsx to keep the prop contract co-located with the component
metrics:
  duration: 2 minutes
  completed: 2026-03-11
  tasks_completed: 2
  files_modified: 2
---

# Phase 14 Plan 02: Lead Detail Drawer Summary

Sheet drawer that opens on voice lead row click, fetching and displaying the AI call summary in a muted box, an embedded native audio player for the recording, and the full scrollable transcript. Drawer closes on X or Escape without navigating away from Leads.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Create LeadDetailDrawer component with transcript, summary, and audio player | b9c943e | src/components/admin/LeadDetailDrawer.tsx |
| 2 | Wire row click in VoiceLeadsTab to open LeadDetailDrawer | 1ebb100 | src/pages/admin/Leads.tsx |

## What Was Built

Task 1 created `LeadDetailDrawer.tsx` as a Sheet component with three distinct sections.

The component accepts `leadId: string | null` and `onClose: () => void`. When `leadId` is null the Sheet is closed (`open={false}`). When a leadId is provided, `useQuery` fetches the lead record and the most recent `vapi_call_logs` row linked by `lead_id`. The query is gated with `enabled: !!leadId`.

Section 1 is the header. It shows the caller name in `SheetTitle` and a row with the phone number plus a source channel badge using `SOURCE_CHANNEL_LABELS`. Skeleton placeholders render during loading.

Section 2 shows call info when a callLog exists. If `summary` is present it renders in a `bg-muted` rounded box. If `recording_url` is present a native `<audio controls>` element is embedded inline. No new tab. If `duration_seconds` is present a formatted duration label renders below the player.

Section 3 is the transcript area inside `ScrollArea`. Four states: loading skeletons, error message, "No call log found", "No transcript available", and the full transcript in a `pre` with `whitespace-pre-wrap font-mono`.

Two Plan 03 comment placeholders are in place.

Task 2 wired the drawer into `Leads.tsx`. The `Leads` parent component gained `selectedLeadId` state. `VoiceLeadsTab` received an `onSelectLead: (id: string) => void` prop. Each `TableRow` fires `onClick={() => onSelectLead(lead.id)}`. The status cell retains its `e.stopPropagation()` so clicking the status dropdown never opens the drawer. `LeadDetailDrawer` is imported and rendered inside the container div after the closing Tabs tag.

## Verification

- `npx tsc --noEmit`: no errors
- `LeadDetailDrawer.tsx` exists and exports the component
- `Leads.tsx` imports and renders `LeadDetailDrawer`
- Plan 03 placeholders confirmed present at lines 144 and 171 of `LeadDetailDrawer.tsx`

## Deviations from Plan

None. Plan executed exactly as written.

## Self-Check: PASSED

| Item | Result |
| ---- | ------ |
| src/components/admin/LeadDetailDrawer.tsx | FOUND |
| src/pages/admin/Leads.tsx | FOUND |
| 14-02-SUMMARY.md | FOUND |
| commit b9c943e | FOUND |
| commit 1ebb100 | FOUND |
