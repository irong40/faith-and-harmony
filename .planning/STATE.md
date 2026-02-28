# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call.
**Current focus:** Defining requirements for v1.1 Voice Bot + Automated Intake Pipeline

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-28 — Milestone v1.1 started

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Vapi selected as voice bot platform (cloud service, ElevenLabs native, no self-hosting)
- n8n as middleware between Vapi and F&H app (already running for FHContent)
- Existing invoice flow stays unchanged (request to invoice to deposit to delivery to final payment)
- 757 area code phone number for local Hampton Roads presence
- Weather API integration for automated flight availability checking
- Bot handles qualification and intake; Iron reviews before invoice goes out (initially)

### v1.0 Landing Page (Complete)

All 5 phases shipped: SEO foundation, image optimization, above-fold content, below-fold content, performance and mobile. 9 plans executed in ~22 minutes total. Landing page live at sentinelaerial domain.

### Pending Todos

None yet.

### Blockers/Concerns

- Vapi account not yet created
- 757 phone number not yet provisioned
- F&H app intake API endpoint does not exist yet (to be built)
- Scheduling feature not yet designed or built in the app
- Weather API provider not yet selected (Tomorrow.io, OpenWeatherMap, or NWS)

## Session Continuity

Last session: 2026-02-28
Stopped at: Starting v1.1 milestone, gathering requirements
Resume file: None
