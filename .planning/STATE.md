---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Billing, Equipment, and Production Readiness
status: executing
stopped_at: "Completed 10-01-PLAN.md"
last_updated: "2026-03-05T18:18:00Z"
last_activity: 2026-03-05 — Completed Phase 10 Plan 01 (Sync Infrastructure Foundation)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 3
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.
**Current focus:** Phase 10 Offline Sync Hardening

## Current Position

Phase: 10 of 11 (Offline Sync Hardening)
Plan: 1 of 3 in current phase
Status: Executing
Last activity: 2026-03-05 -- Completed Plan 10-01 (Sync Infrastructure Foundation)

Progress: [==........] 20% (v2.0 milestone)

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
- Deposit amount may be 25% not 50% in existing code (verify during Phase 7)
- Accessory deletion guard resolved: delete_accessory_safe RPC function checks mission_equipment references
- imagemagick_deno is pre-1.0 (pin version, verify API at build time)

## Session Continuity

Last session: 2026-03-05
Stopped at: Completed 10-01-PLAN.md (Sync Infrastructure Foundation)
Resume file: None
Resume signal: Execute 10-02-PLAN.md next (sync engine changes)
