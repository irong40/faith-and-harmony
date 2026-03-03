# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call.
**Current focus:** v1.1 Voice Bot + Automated Intake Pipeline

## Current Position

Phase: 2 of 6 - Vapi Voice Bot (paused at checkpoint)
Plan: 02-03 Task 1 complete. Paused at Task 2 (human-verify checkpoint).
Status: Phase 2 Plans 1 and 2 complete. Plan 02-03 Task 1 complete. Awaiting user dashboard setup and 757 number test call.
Last activity: 2026-03-03 — Executed 02-03 Task 1 (created assistant-config.json and setup-guide.md). Paused at checkpoint for Vapi dashboard configuration.

## Progress

[████░░░░░░] 33% (5/15 plans executed, 10 remaining across 5 phases)

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
- [Phase 02-03]: tools field in assistant-config.json uses PASTE_TOOLS_FROM_TOOLS_JSON placeholder; Vapi dashboard accepts a JSON array at creation time, keeps files independently maintainable
- [Phase 02-03]: Setup guide instructs users to use anon public Supabase key for get_package_pricing tool headers, not service role key; pricing data is read-only

### v1.0 Landing Page (Complete)

All 5 phases shipped. Landing page live at sentinelaerial domain. Phase artifacts archived to .planning/phases/_v1.0-complete/.

### Existing Infrastructure (from codebase exploration)

- 40 edge functions following Deno + CORS + serve() pattern
- 56 Supabase migrations, quote_requests and clients tables already exist
- n8n self-hosted with Cloudflare tunnel, heartbeat monitoring, n8n-relay edge function
- 23 admin pages including QuoteRequests, Clients, DroneJobs
- Intake edge function will follow existing patterns (quote-request, send-service-request-emails)

### Decisions (02-01)

- Route get_package_pricing through vapi-tool-handler not pricing-lookup directly (POST vs GET method mismatch)
- Spell all prices in words in system prompt (TTS dollar sign notation issue)
- Iron phone number stored only in tools.json as IRON_PHONE_PLACEHOLDER (not in system prompt)
- SUPABASE_ANON_KEY_PLACEHOLDER in version-controlled tools.json; actual value goes in Vapi dashboard
- System prompt instructs bot to trust tool response price over static prices

### Decisions (02-02)

- Inline PACKAGES constant in vapi-tool-handler rather than import from pricing-lookup (cross-function import of a module with top-level serve() call overwrites the active handler in Deno edge runtime)
- Use --use-api flag for Supabase CLI deploy to bypass locked Windows temp directory issue with bundler cache

### Pending Todos

None yet.

### Blockers/Concerns

- Vapi account not yet created (needed now for 02-03 Task 2 checkpoint)
- 757 phone number not yet provisioned (needed now for 02-03 Task 2 checkpoint)
- ElevenLabs API key needs to be added to Vapi (needed now for 02-03 Task 2 checkpoint)
- Iron's actual phone number needed to replace +1IRON_PHONE_PLACEHOLDER in Vapi dashboard
- NWS API station confirmed: AKQ/90,52 (Wakefield VA office, Hampton Roads grid)
- Always use --use-api flag for supabase functions deploy on this machine (local bundler cache locked by Windows ACL)
- Supabase anon key for project qjpujskwqaehxnqypxzu needed to replace SUPABASE_ANON_KEY_PLACEHOLDER in Vapi dashboard get_package_pricing tool headers

## Session Continuity

Last session: 2026-03-03
Stopped at: Paused at 02-03 Task 2 checkpoint (human-verify: configure Vapi dashboard and test 757 number call)
Resume file: None
Resume signal: Type "approved" with the provisioned 757 number and selected ElevenLabs voiceId, or describe any issues
