---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Billing, Equipment, and Production Readiness
status: defining_requirements
stopped_at: null
last_updated: "2026-03-05T17:00:00.000Z"
last_activity: 2026-03-05 — Milestone v2.0 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.
**Current focus:** v2.0 Billing, Equipment, and Production Readiness

## Current Position

Phase: Not started (defining requirements)
Plan: ---
Status: Defining requirements
Last activity: 2026-03-05 — Milestone v2.0 started

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

### v1.0 Landing Page (Complete)

All 5 phases shipped. Landing page live at sentinelaerial domain.

### v1.1 Voice Bot + Automated Intake (Complete)

All 6 phases shipped (15 plans). Vapi voice bot with 757 number, n8n middleware, scheduling, weather ops, admin call/lead pages. Pipeline validated end to end with live test calls.

Key infrastructure from v1.1:
- 40+ edge functions following Deno + CORS + serve() pattern
- 56+ Supabase migrations
- n8n self-hosted with Cloudflare tunnel
- Square connected for payments
- Resend connected for email
- NWS weather API integration
- Always use --use-api flag for supabase functions deploy on this machine

### Pending Todos

- Paste check-availability.json tool into Vapi dashboard assistant config (from v1.1)
- Append system-prompt-additions.md content to Paula bot system prompt in Vapi (from v1.1)

## Session Continuity

Last session: 2026-03-05T17:00:00.000Z
Stopped at: Starting v2.0 milestone
Resume file: None
Resume signal: Defining requirements for v2.0
