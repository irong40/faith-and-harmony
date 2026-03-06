---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Billing, Equipment, and Production Readiness
status: complete
stopped_at: All phases complete. v2.0 milestone ready for completion.
last_updated: "2026-03-06T22:15:00.000Z"
last_activity: 2026-03-06 -- Completed Phase 12 (Mission Control Validation) and integration audit fixes
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.
**Current focus:** All v2.0 phases complete. Platform is production ready with billing, equipment tracking, offline sync, standalone deployment, and mission control validation.

## Current Position

Phase: 12 of 12 (Mission Control Validation) COMPLETE
Plan: 1 of 1 complete in phase 12
Status: Complete
Last activity: 2026-03-06 -- Integration audit fixes (wrong domains, geolocation, edge function config, redirect loop, SEO)

Progress: [██████████] 100% (v2.0 milestone, 14/14 plans complete across Phases 7-12)

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
- [Phase 09]: Fire and forget pattern for receipt and delivery triggers prevents Square webhook retries on downstream failures
- [Phase 09]: Job lookup falls back from direct job_id to quote_id for backward compatibility
- [Phase 09]: PaymentsPanel uses TanStack Query with key ['payments', jobId] for cache invalidation after balance invoice creation

### v1.0 Landing Page (Complete)

All 5 phases shipped. Landing page live at faithandharmonyllc.com.

### v1.1 Voice Bot + Automated Intake (Complete)

All 6 phases shipped (15 plans). Vapi voice bot with 757 number, n8n middleware, scheduling, weather ops, admin call/lead pages.

Key infrastructure from v1.1:
- 40+ edge functions following Deno + CORS + serve() pattern
- 56+ Supabase migrations
- n8n self-hosted with Cloudflare tunnel
- Square connected for payments
- Resend connected for email
- Always use --use-api flag for supabase functions deploy on this machine

### v2.0 Billing, Equipment, and Production Readiness (Complete)

All 6 phases shipped (14 plans). Accessories CRUD, watermark pipeline, full billing lifecycle, offline sync hardening, standalone Trestle deployment, Mission Control validation.

### Pending Todos

- Paste check-availability.json tool into Vapi dashboard assistant config (from v1.1)
- Append system-prompt-additions.md content to Paula bot system prompt in Vapi (from v1.1)

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-03-06T22:15:00Z
Stopped at: All v2.0 phases complete
Resume file: None
Resume signal: v2.0 milestone complete. Run /gsd:complete-milestone to archive and plan next milestone.
