---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Billing, Equipment, and Production Readiness
status: executing
stopped_at: Completed 07-02-PLAN.md
last_updated: "2026-03-05T18:22:58.946Z"
last_activity: 2026-03-05 -- Completed Plan 07-02 (Deposit Fix and PWA Icons)
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 5
  completed_plans: 3
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.
**Current focus:** Phase 7 complete, Phase 10 in progress

## Current Position

Phase: 7 of 11 (Foundation and Quick Wins) COMPLETE
Plan: 2 of 2 in phase 7 (all complete)
Status: Executing
Last activity: 2026-03-05 -- Completed Plan 07-02 (Deposit Fix and PWA Icons)

Progress: [██████....] 60% (v2.0 milestone, 3/5 plans complete)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

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

- n8n pipeline watermark step needs investigation during Phase 8 planning
- Deposit amount fixed from 25% to 50% in Phase 7 Plan 02 (resolved)
- Accessory deletion guard resolved: delete_accessory_safe RPC function checks mission_equipment references
- imagemagick_deno is pre-1.0 (pin version, verify API at build time)

## Session Continuity

Last session: 2026-03-05T18:22:58.944Z
Stopped at: Completed 07-02-PLAN.md
Resume file: None
Resume signal: Execute 10-02-PLAN.md next (sync engine changes)
