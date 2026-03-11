# Roadmap: Faith & Harmony Operations Platform

## Milestones

- v1.0 Landing Page (Phases 1-5) shipped 2026-02
- v1.1 Voice Bot + Automated Intake Pipeline (Phases 1-6) shipped 2026-03-05
- v2.0 Billing, Equipment, and Production Readiness (Phases 7-12) shipped 2026-03-06
- v2.1 Leads Admin Upgrade (Phases 13-16) in progress

## Phases

<details>
<summary>v1.0 Landing Page (Phases 1-5) SHIPPED 2026-02</summary>

See v1.0 roadmap archive.

</details>

<details>
<summary>v1.1 Voice Bot + Automated Intake Pipeline (Phases 1-6) SHIPPED 2026-03-05</summary>

- [x] **Phase 1: Intake API and Lead Tracking** - leads/call_logs tables, intake and pricing edge functions
- [x] **Phase 2: Vapi Voice Bot** - ElevenLabs TTS, system prompt, tool schemas, 757 number
- [x] **Phase 3: n8n Vapi Pipeline** - End-of-call webhook, n8n workflow, intake automation
- [x] **Phase 4: Scheduling and Availability** - Availability slots, blackout dates, admin calendar, bot integration
- [x] **Phase 5: Weather Operations** - NWS forecast, flight parameter checks, admin weather view
- [x] **Phase 6: Integration and Edge Cases** - End-to-end validation, call log and leads pages

</details>

<details>
<summary>v2.0 Billing, Equipment, and Production Readiness (Phases 7-12) SHIPPED 2026-03-06</summary>

- [x] **Phase 7: Foundation and Quick Wins** - PWA icons, accessories admin page, deposit amount verification
- [x] **Phase 8: Watermark Pipeline** - Watermarked preview generation and separate storage buckets
- [x] **Phase 9: Billing Lifecycle** - Balance invoice, balance due email, payment webhook, receipt, delivery gate, admin payments panel
- [x] **Phase 10: Offline Sync Hardening** - Dead letter store, persistent warnings, end-to-end flight log sync
- [x] **Phase 11: Standalone Deployment** - Vercel subdomain, Supabase auth redirects, Square production cutover
- [x] **Phase 12: Mission Control Validation** - Admin apps/announcements, satellite plugin, edge function validation

</details>

### v2.1 Leads Admin Upgrade (Phases 13-16)

- [x] **Phase 13: Schema Foundation** - lead_notes table, source_channel enum, follow_up_at column, activity timeline structure (completed 2026-03-11)
- [ ] **Phase 14: Detail Drawer and Inline Editing** - Lead detail drawer with transcript, recording, notes, timeline, and inline status editing
- [ ] **Phase 15: Lead Entry and Conversion** - Manual lead form, source filtering, one-click conversion, link existing client, bulk convert
- [ ] **Phase 16: Analytics Dashboard** - Conversion rate, leads by source, average response time, and revenue stats cards

## Phase Details

### Phase 13: Schema Foundation
**Goal**: The database has all columns, types, and tables required for notes, follow-up tracking, source channels, and activity history
**Depends on**: Phase 12 (existing leads table from v1.1)
**Requirements**: SRCE-02, DETL-03, DETL-04, DETL-05
**Success Criteria** (what must be TRUE):
  1. The leads table has a source_channel column with enum values voice_bot, web_form, manual, email_outreach, social and all existing rows default cleanly
  2. A lead_notes table exists with columns for lead_id, content, reason_tag, and follow_up_at and enforces row-level security for admin access only
  3. A lead_activity table (or view) exists that surfaces timestamped events for status changes, note additions, and conversions
  4. All new columns and tables are covered by a migration that applies cleanly to production without breaking the existing leads admin page
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — source_channel enum migration and lead_notes table
- [ ] 13-02-PLAN.md — lead_activity view

### Phase 14: Detail Drawer and Inline Editing
**Goal**: Admin can open any lead row to see its full detail, interact with transcript and recording, add notes with tags, set follow-up dates, and change qualification status without leaving the table
**Depends on**: Phase 13
**Requirements**: DETL-01, DETL-02, DETL-03, DETL-04, DETL-05, EDIT-01, SRCE-02
**Success Criteria** (what must be TRUE):
  1. Clicking a lead row opens a drawer panel showing the call transcript and AI summary pulled from the existing vapi_call_logs join
  2. The drawer has an embedded audio player that streams the Vapi call recording URL directly without leaving the page
  3. Admin can type a note, select a reason tag from the four options (not ready, wrong area, needs callback, price sensitive), and save it to the lead
  4. Admin can pick a follow-up date on a lead and leads with a past follow-up date appear highlighted in the table
  5. The drawer shows a chronological timeline of all status changes, notes added, and conversion events for that lead
  6. Admin can click the qualification status cell in the table row and change it via a dropdown without opening the drawer
  7. Source channel badges render on every lead row in the table using the source_channel value from Phase 13
**Plans**: 3 plans

Plans:
- [ ] 14-01-PLAN.md — table enhancements: source badges, inline status dropdown, overdue row highlight
- [ ] 14-02-PLAN.md — LeadDetailDrawer component with transcript and embedded audio player
- [ ] 14-03-PLAN.md — notes form with reason tags and follow-up date, plus activity timeline

### Phase 15: Lead Entry and Conversion
**Goal**: Admin can create leads from non-Vapi sources, filter by source, and convert qualified leads into clients and quote requests through one-click, link, or bulk actions
**Depends on**: Phase 14
**Requirements**: SRCE-01, SRCE-03, CONV-01, CONV-02, CONV-03
**Success Criteria** (what must be TRUE):
  1. Admin can open a "New Lead" form and submit a lead with name, phone, email, source channel, and an optional note that creates a row in the leads table
  2. Admin can filter the leads table by source channel using a control that shows counts per channel
  3. Admin can click "Convert" on a qualified lead and the system creates a new client record and a linked quote request in one action with no additional data entry required
  4. When converting, if the admin identifies an existing client match, they can link the lead to that client instead of creating a duplicate
  5. Admin can select multiple qualified leads via checkboxes and convert them all in a single bulk action that processes each conversion and reports success or failure per lead
**Plans**: TBD

### Phase 16: Analytics Dashboard
**Goal**: The leads page header shows live stat cards that give admin an immediate read on conversion performance, source mix, response speed, and revenue attribution
**Depends on**: Phase 15
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04
**Success Criteria** (what must be TRUE):
  1. A conversion rate stat card shows the percentage of leads that reached converted status with a toggle for week, month, and all-time windows
  2. A leads by source stat card shows a breakdown of lead counts per source channel for the selected time window
  3. An average response time stat card shows the mean time in hours between lead creation and the first note or status change
  4. A revenue from leads stat card shows total revenue from jobs linked to converted leads by joining through the clients and jobs tables
**Plans**: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-5 | v1.0 | 8 | Complete | 2026-02 |
| 1-6 | v1.1 | 15 | Complete | 2026-03-05 |
| 7-12 | v2.0 | 14 | Complete | 2026-03-06 |
| 13. Schema Foundation | v2.1 | 2/2 | Complete | 2026-03-11 |
| 14. Detail Drawer and Inline Editing | v2.1 | 0/3 | Not started | - |
| 15. Lead Entry and Conversion | v2.1 | 0/TBD | Not started | - |
| 16. Analytics Dashboard | v2.1 | 0/TBD | Not started | - |
