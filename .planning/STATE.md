---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Billing, Equipment, and Production Readiness
status: executing
stopped_at: Completed 08-02-PLAN.md (Watermark Pipeline)
last_updated: "2026-03-05T20:10:00Z"
last_activity: 2026-03-05 -- Completed Plan 08-02 (Watermark Pipeline)
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 9
  completed_plans: 8
  percent: 92
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.
**Current focus:** Phase 8 (Watermark Pipeline) complete. Plans 01 and 02 both finished.

## Current Position

Phase: 8 of 11 (Watermark Pipeline)
Plan: 2 of 2 complete in phase 8
Status: Executing
Last activity: 2026-03-05 -- Completed Plan 08-02 (Watermark Pipeline)

Progress: [█████████░] 92% (v2.0 milestone, 8/9 plans complete across Phases 7, 10, 8)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 08]: Used canvas npm package to generate watermark tile programmatically
- [Phase 08]: ImageMagick via n8n Execute Command node for resize and composite on local rig
- [Phase 08]: Watermark tile deployed to /opt/sentinel/assets/watermark-tile.png on processing rig
- [Phase 08]: 1 hour signed URL expiry for admin QA modal media display
- [Phase 08]: extractStoragePath handles both legacy public URLs and new private paths
- Watermark generation on local rig via n8n pipeline, not edge functions (512 MB memory limit)
- Supabase row inserted BEFORE Square API call to prevent orphaned invoices
- Separate storage buckets for watermarked previews vs originals
- Dead letter store replaces silent deletion after max sync retries
- Database function for deletion guard instead of application check (prevents deletion from any client)
- Admin form uses checkbox multi-select from aircraft table, pilot form unchanged for offline compatibility
- compatible_aircraft stored as text array of model names, not UUIDs, preserving EquipmentSelector filtering
- AbortController with setTimeout for network probe instead of AbortSignal.timeout() for browser compatibility
- Dead letter items preserve original_retries and original_created_at for sync history debugging
- [Phase 07]: Used canvas npm package to generate branded PWA icons programmatically
- [Phase 10]: Installed @testing-library/react for component TDD (was missing from devDependencies)
- [Phase 10]: Dead letter banner placed after PilotCard and before QuickActions for maximum visibility
- [Phase 10]: Always queue to IndexedDB first then fire processQueue, removing online/offline branching

### v1.0 Landing Page (Complete)

All 5 phases shipped. Landing page live at sentinelaerial domain.

### v1.1 Voice Bot + Automated Intake (Complete)

All 6 phases shipped (15 plans). Vapi voice bot with 757 number, n8n middleware, scheduling, weather ops, admin call/lead pages.

Key infrastructure from v1.1:
- 40+ edge functions following Deno + CORS + serve() pattern
- 56+ Supabase migrations
- n8n self-hosted with Cloudflare tunnel
- Square connected for payments
- Resend connected for email
- Always use --use-api flag for supabase functions deploy on this machine

### Pending Todos

- Paste check-availability.json tool into Vapi dashboard assistant config (from v1.1)
- Append system-prompt-additions.md content to Paula bot system prompt in Vapi (from v1.1)

### Blockers/Concerns

- Deposit amount fixed from 25% to 50% in Phase 7 Plan 02 (resolved)
- Accessory deletion guard resolved: delete_accessory_safe RPC function checks mission_equipment references
- imagemagick_deno is pre-1.0 (pin version, verify API at build time)

## Session Continuity

Last session: 2026-03-05T20:10:00Z
Stopped at: Completed 08-02-PLAN.md (Watermark Pipeline)
Resume file: None
Resume signal: Phase 8 complete. Continue with Phase 9 (Billing Lifecycle).
