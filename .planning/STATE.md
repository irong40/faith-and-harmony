# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call.
**Current focus:** v1.1 Voice Bot + Automated Intake Pipeline

## Current Position

Phase: 5 of 6 (in progress), Plan 05-01 COMPLETE, Plan 05-02 next
Plan: 05-01 committed (weather forecast cache + edge function). Ready for 05-02 admin weather view.
Status: Phases 1, 2, 4 complete. Phase 3 in progress (03-01 done). Phase 5 in progress (05-01 done). Phase 6 depends on all.
Last activity: 2026-03-05 — 05-01 execution complete, weather pipeline artifacts verified and committed.

## Progress

[████████░░] 73% (11/15 plans executed, 4 remaining across 3 phases)

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
- [Phase 02-03 verified]: 757 number provisioned, Paula bot answers calls with ElevenLabs voice, qualification flow confirmed working by user test call

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

### Decisions (04)

- availability_slots uses day_of_week 0-6 matching PostgreSQL EXTRACT(DOW) and JavaScript getDay()
- availability-check edge function deployed with --no-verify-jwt (public read, same as pricing-lookup)
- Supabase hooks use `as never` cast for new table names (generated types not yet regenerated)
- check-availability.json Vapi tool ready for dashboard paste
- system-prompt-additions.md ready to append to Phase 2 system prompt

### Pending Todos

- Paste check-availability.json tool into Vapi dashboard assistant config
- Append system-prompt-additions.md content to Paula bot system prompt in Vapi
- Browser verify the admin Scheduling page (04-02 Task 3 checkpoint)

### Decisions (03-01)

- Parallel connection from Vapi Webhook to both Respond Accepted and Filter End of Call: matches wf1 pattern, ensures immediate HTTP ACK while processing continues
- Build Error Email handles both validation failures and API failures, routes both to shared Send Admin Alert node
- Internal fields (_can_proceed, _validation_errors) stripped from intake-lead payload via Object.fromEntries filter expression

### Decisions (05-01)

- Migration timestamps adjusted from plan specified 20260303 to 20260305 to avoid conflicts with existing migrations
- evaluateWeather logic ported inline into Deno edge function (cannot resolve @/ path aliases)
- Null ceilingHeight preserved as null (unlimited ceiling) not zero in weather evaluation

### Blockers/Concerns

- Phase 3 Plan 03-02: wf5 needs import into n8n, activation, and test with a real Vapi call
- analysisPlan from vapi/analysis-plan.json needs to be applied to Paula bot in Vapi dashboard
- NWS API station confirmed: AKQ/90,52 (Wakefield VA office, Hampton Roads grid)
- Always use --use-api flag for supabase functions deploy on this machine (local bundler cache locked by Windows ACL)
- Iron's actual phone number is stored in Vapi dashboard transferToSpecialist tool only (not in version-controlled files)

## Session Continuity

Last session: 2026-03-05
Stopped at: Completed 05-01-PLAN.md. Weather forecast pipeline (2 migrations + edge function) verified and committed.
Resume file: None
Resume signal: Run 05-02 (admin weather dashboard view) or 03-02 (n8n import and test)
