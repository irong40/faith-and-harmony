---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Billing, Equipment, and Production Readiness
status: ready_to_plan
stopped_at: null
last_updated: "2026-03-05T18:00:00.000Z"
last_activity: 2026-03-05 — v2.0 roadmap created (Phases 7-11)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.
**Current focus:** Phase 7 Foundation and Quick Wins

## Current Position

Phase: 7 of 11 (Foundation and Quick Wins)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-03-05 -- v2.0 roadmap created (Phases 7-11, 19 requirements mapped)

Progress: [..........] 0% (v2.0 milestone)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Watermark generation on local rig via n8n pipeline, not edge functions (512 MB memory limit)
- Supabase row inserted BEFORE Square API call to prevent orphaned invoices
- Separate storage buckets for watermarked previews vs originals
- Dead letter store replaces silent deletion after max sync retries

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
- Accessory deletion with orphaned mission_equipment references needs design decision
- imagemagick_deno is pre-1.0 (pin version, verify API at build time)

## Session Continuity

Last session: 2026-03-05
Stopped at: v2.0 roadmap created, ready to plan Phase 7
Resume file: None
Resume signal: Run /gsd:plan-phase 7 to begin
