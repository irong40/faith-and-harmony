# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call.
**Current focus:** v1.1 Voice Bot + Automated Intake Pipeline

## Current Position

Phase: 1 of 6 - Intake API and Lead Tracking (COMPLETE)
Plan: All 3 plans complete. Verification passed.
Status: Phase 1 complete. 4/4 requirements verified. Ready for Phase 2.
Last activity: 2026-03-03 — Phase 1 complete (3 migrations, 2 edge functions, 5/5 success criteria passed).

## Progress

[██░░░░░░░░] 18% (3/17 plans across 6 phases)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Vapi selected as voice bot platform (cloud service, ElevenLabs native, no self-hosting)
- n8n as middleware between Vapi and F&H app (already running for FHContent)
- Existing invoice flow stays unchanged (request to invoice to deposit to delivery to final payment)
- 757 area code phone number for local Hampton Roads presence
- Weather API integration for automated flight availability checking (NWS API, free)
- Bot handles qualification and intake; Iron reviews before invoice goes out (initially)

### v1.0 Landing Page (Complete)

All 5 phases shipped. Landing page live at sentinelaerial domain. Phase artifacts archived to .planning/phases/_v1.0-complete/.

### Existing Infrastructure (from codebase exploration)

- 40 edge functions following Deno + CORS + serve() pattern
- 56 Supabase migrations, quote_requests and clients tables already exist
- n8n self-hosted with Cloudflare tunnel, heartbeat monitoring, n8n-relay edge function
- 23 admin pages including QuoteRequests, Clients, DroneJobs
- Intake edge function will follow existing patterns (quote-request, send-service-request-emails)

### Pending Todos

None yet.

### Blockers/Concerns

- Vapi account not yet created (needed before Phase 2)
- 757 phone number not yet provisioned (needed before Phase 2)
- ElevenLabs API key needs to be added to Vapi (needed before Phase 2)
- NWS API station selection for Hampton Roads (Phase 5)

## Session Continuity

Last session: 2026-03-03
Stopped at: v1.1 roadmap created, ready to plan or execute Phase 1
Resume file: None
