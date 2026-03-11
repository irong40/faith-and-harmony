---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Leads Admin Upgrade
status: completed
stopped_at: Completed 15-03-PLAN.md
last_updated: "2026-03-11T21:29:00Z"
last_activity: 2026-03-11 — Phase 15, Plan 03 complete. Checkbox bulk selection and bulk convert with Promise.allSettled in VoiceLeadsTab. Phase 15 fully complete.
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.
**Current focus:** v2.1 Leads Admin Upgrade — Phase 13: Schema Foundation

## Current Position

Phase: 15 (Lead Entry and Conversion) — complete (3 of 3 plans done)
Plan: 03 complete
Status: Phase 15 fully done. Checkbox bulk selection, bulk convert with Promise.allSettled, per-lead results summary.
Last activity: 2026-03-11 — Phase 15, Plan 03 complete. Checkbox bulk selection and bulk convert with Promise.allSettled in VoiceLeadsTab. Phase 15 fully complete.

## Accumulated Context

### Shipped Milestones

- v1.0 Landing Page (5 phases, 8 plans) shipped 2026-02
- v1.1 Voice Bot + Automated Intake (6 phases, 15 plans) shipped 2026-03-05
- v2.0 Billing, Equipment, Production Readiness (6 phases, 14 plans) shipped 2026-03-06

### Key Infrastructure

- 50+ edge functions following Deno + CORS + serve() pattern
- 56+ Supabase migrations
- n8n self-hosted with Cloudflare tunnel
- Square connected for payments (production)
- Resend connected for email
- Always use --use-api flag for supabase functions deploy on this machine
- Two live domains: faithandharmonyllc.com and trestle.sentinelaerialinspections.com

### v2.1 Phase Structure

- Phase 13: Schema Foundation — lead_notes table, source_channel enum, follow_up_at, activity log
- Phase 14: Detail Drawer and Inline Editing — drawer with transcript/recording/notes/timeline, inline status edit, source badges
- Phase 15: Lead Entry and Conversion — manual form, source filter, one-click convert, link existing client, bulk convert
- Phase 16: Analytics Dashboard — conversion rate, leads by source, avg response time, revenue from leads

### Pending Todos

- Paste check-availability.json tool into Vapi dashboard assistant config (from v1.1)
- Append system-prompt-additions.md content to Paula bot system prompt in Vapi (from v1.1)

### Known Gaps (deferred from v2.0)

- No ticket triage admin page for Mission Control
- Heartbeat status mismatch ("healthy" vs "online") in MC plugin
- MC_BOOTSTRAP_SECRET not yet set on Supabase
- app_health_history INSERT RLS policy needs tightening
- Sentinel marketing site "Pilot Login" link has newline in URL (separate repo)

### Key Decisions (v2.1)

- Phase 13-01: reason_tag uses text+CHECK over enum. Simpler to ALTER as allowed values grow.
- Phase 13-01: USING cast on source_channel is fail-fast. Any value outside 5 enum values errors at migration time.
- Phase 13-02: lead_activity is a view, not a table. Avoids triggers or a separate event log. status_change branch shows current status only (not history) via updated_at.
- Phase 14-01: isOverdue exported from Leads.tsx so Leads.spec.ts can import without module mocking.
- Phase 14-01: voice_bot source_channel filter removed at query level so all 5 source channels appear in one table.
- Phase 14-02: LeadDetail type defined locally in drawer to avoid coupling to generated types that use `as never` casts.
- Phase 14-02: formatDuration copied into drawer rather than imported from CallLogs.tsx to prevent cross-page imports.
- Phase 14-02: LeadDetailDrawer rendered inside the container div after Tabs closing tag so it overlays the full page correctly.
- Phase 14-03: useToast from @/hooks/use-toast used for admin component pattern consistency (not sonner).
- Phase 14-03: Notes form renders even without a callLog so manual/web-form leads can be annotated.
- Phase 14-03: Transcript and timeline placed inside single ScrollArea with Separator for unified scrolling.
- Phase 15-01: Two separate RLS policies (admins_insert_leads and admins_update_leads) keep revocation granular for future phases.
- Phase 15-01: Per-channel count queries via Promise.all rather than GROUP BY aggregate due to as-never cast constraints on the Supabase client.
- Phase 15-01: voice_bot excluded from New Lead source select since voice bot leads arrive via Vapi automatically.
- Phase 15-01: isSourceFilterActive exported as pure function so spec can test without module mocking, following isOverdue pattern.
- Phase 15-02: quote_requests needed admin INSERT policy; 20260303500000 only had SELECT and UPDATE — added 20260311200100.
- Phase 15-02: ConvertLeadDialogProps includes source_channel so buildQuoteRequestInsert can map it without an extra query.
- Phase 15-02: convertLead state holds full LeadRow rather than just an ID to avoid a refetch inside the dialog.
- Phase 15-03: useEffect resets selectedLeadIds on filter/page change to prevent stale selection across navigation.
- Phase 15-03: handleBulkConvert as async function (not useMutation) since Promise.allSettled handles partial failure natively.
- Phase 15-03: Checkbox stopPropagation prevents detail drawer opening on checkbox click.

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-03-11T21:29:00Z
Stopped at: Completed 15-03-PLAN.md
Resume file: None
Resume signal: Phase 15 complete. All 3 plans done. Continue with Phase 16 (Analytics Dashboard).
