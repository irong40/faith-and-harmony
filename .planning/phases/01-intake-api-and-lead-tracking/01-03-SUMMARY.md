---
phase: 01-intake-api-and-lead-tracking
plan: 03
subsystem: api
tags: [deno, edge-function, supabase-functions, leads, intake, n8n]

requires:
  - phase: 01-01
    provides: leads table, vapi_call_logs sentiment/outcome columns, quote_requests source column
provides:
  - intake-lead edge function at /intake-lead
  - client upsert by phone number
  - quote_request creation with source voice_bot
  - lead record linking call to client and request
  - Deno test suite for pure logic functions
affects: [n8n-vapi-workflow, admin-quote-requests, phase-2-vapi-bot]

tech-stack:
  added: []
  patterns: [webhook secret auth, findOrCreateClient by phone, exported pure functions for testing]

key-files:
  created:
    - supabase/functions/intake-lead/index.ts
    - supabase/functions/intake-lead/index.spec.ts
  modified: []

key-decisions:
  - "Used x-webhook-secret header with INTAKE_WEBHOOK_SECRET env var instead of Bearer token or apikey header"
  - "Exported pure functions (validateWebhookSecret, validateRequiredFields, normalizePhone) for testability"
  - "vapi_call_logs update is non-fatal (call log may not exist yet when intake runs)"

patterns-established:
  - "Webhook secret auth pattern: x-webhook-secret header vs INTAKE_WEBHOOK_SECRET env var"
  - "Client upsert by phone: normalize then match, create if not found"
  - "Non-fatal side effect pattern: secondary DB updates wrapped in try/catch with console.warn"

requirements-completed: [INTAKE-03]

duration: 10min
completed: 2026-03-03
---

# Plan 01-03: Intake Lead Summary

**Intake orchestrator edge function with webhook auth, client upsert by phone, voice_bot quote requests feeding admin workflow, and 12 Deno tests**

## Performance

- **Duration:** 10 min
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Created intake-lead edge function handling the full intake pipeline: webhook auth, client upsert by phone, quote_requests insert with source voice_bot, leads insert with FK links
- Webhook secret (INTAKE_WEBHOOK_SECRET) generated and set as Supabase secret
- Duplicate phone number matching confirmed: second call with same phone returns client_created=false with matching client_id
- Co-located Deno test suite with 12 test cases covering webhook secret validation, required field validation, phone normalization, and REQUIRED_FIELDS constant

## Task Commits

1. **Task 1: Create intake-lead function and tests** - `42485cb` (feat)
2. **Task 2: Deploy and verify** - deployed live, all test scenarios pass

## Files Created/Modified
- `supabase/functions/intake-lead/index.ts` - Full intake orchestrator with CORS, webhook auth, findOrCreateClient, quote_requests and leads inserts, optional vapi_call_logs update
- `supabase/functions/intake-lead/index.spec.ts` - 12 Deno tests for pure logic functions (auth, validation, phone normalization)

## Decisions Made
- Used `x-webhook-secret` header with `INTAKE_WEBHOOK_SECRET` env var for auth (avoids exposing service role key in n8n workflow nodes)
- Made vapi_call_logs update non-fatal since the call log row may not exist yet when intake-lead runs (n8n timing)
- Exported `validateWebhookSecret`, `validateRequiredFields`, `normalizePhone` as pure functions for direct test import

## Deviations from Plan
None.

## Issues Encountered
None.

## User Setup Required
- **INTAKE_WEBHOOK_SECRET**: Already generated and set as Supabase secret. Value: `2b66c3fc8be7ab85eced6ec338f0cfcf8ace2be859580afe24a02236965b49a2`. This same value needs to be configured in n8n as a credential for the intake webhook HTTP node.

## Next Phase Readiness
- intake-lead function live and accepting authenticated POST requests
- Ready for n8n workflow integration (Phase 4 or configured independently)
- Test data from verification exists in DB (caller_phone +17575559999, call_ids test-call-001 and test-call-002) and should be cleaned up

---
*Phase: 01-intake-api-and-lead-tracking*
*Completed: 2026-03-03*
