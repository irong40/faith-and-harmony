---
phase: 02-vapi-voice-bot
plan: 02
subsystem: vapi-tool-handler
tags: [vapi, pricing, edge-function, deno, voice-bot]
requirements: [VBOT-07]

dependency_graph:
  requires:
    - supabase/functions/pricing-lookup/index.ts (PACKAGES data source)
  provides:
    - get_package_pricing tool handler in vapi-tool-handler
    - Natural language pricing responses for Vapi voice bot
  affects:
    - vapi-tool-handler endpoint now handles both lookup_customer and get_package_pricing

tech_stack:
  added: []
  patterns:
    - Inline data constants to avoid top-level serve() side effects from cross-function imports
    - formatPriceAsWords helper with known-price mapping for spoken output
    - Co-located Deno tests in index.spec.ts alongside source

key_files:
  modified:
    - supabase/functions/vapi-tool-handler/index.ts
  created:
    - supabase/functions/vapi-tool-handler/index.spec.ts

decisions:
  - Inline PACKAGES constant rather than import from pricing-lookup to avoid serve() conflict
  - Use --use-api flag for Supabase CLI deploy to bypass locked Windows temp directory

metrics:
  duration: 11 minutes
  completed: 2026-03-03
  tasks_completed: 2
  files_modified: 1
  files_created: 1
---

# Phase 2 Plan 2: Get Package Pricing Handler Summary

Adds a get_package_pricing handler to vapi-tool-handler so the Vapi voice bot can query package pricing mid-conversation via POST, returning natural language strings ready for text-to-speech.

## What Was Built

The vapi-tool-handler edge function now routes `get_package_pricing` tool calls to a dedicated handler that:

1. Looks up the requested service_type in a local PACKAGES map
2. Formats the price as spelled-out words (e.g., "two hundred twenty five dollars")
3. Appends the billing unit when present (e.g., "per visit" for construction)
4. Builds a deliverables list with "and" before the final item
5. Returns a complete natural language sentence the bot reads aloud

All 6 packages return correct spoken prices matching CLAUDE.md canonical values.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add get_package_pricing handler | 02e0408 (included in 02-01 commit) | supabase/functions/vapi-tool-handler/index.ts |
| 2 | Add tests and deploy updated handler | 660785d | index.ts (fix), index.spec.ts (created) |

## Live Verification

Endpoint tested against deployed function:

```
POST https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/vapi-tool-handler
{"message":{"type":"tool-calls","toolCallList":[{"id":"test-001","name":"get_package_pricing","arguments":{"service_type":"re_basic"}}]}}

Response:
{"results":[{"toolCallId":"test-001","result":"Listing Lite: two hundred twenty five dollars. Includes 10 photos, Sky replacement, and Next day delivery."}]}
```

All 6 packages verified:
- re_basic: "two hundred twenty five dollars"
- re_standard: "four hundred fifty dollars"
- re_premium: "seven hundred fifty dollars"
- construction: "four hundred fifty dollars per visit"
- commercial: "eight hundred fifty dollars"
- inspection: "twelve hundred dollars"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed cross-function import of pricing-lookup/index.ts**
- Found during: Task 2 verification (live curl test)
- Issue: Importing `../pricing-lookup/index.ts` in vapi-tool-handler executed that module's top-level `serve(handleRequest)` call, which registered pricing-lookup's GET-only handler. This caused the vapi-tool-handler endpoint to respond to GET with pricing-lookup's full package JSON and return 405 for POST requests.
- Fix: Inlined the PACKAGES constant directly in vapi-tool-handler with a comment explaining why cross-function imports with top-level serve() calls must be avoided in Deno edge functions.
- Files modified: supabase/functions/vapi-tool-handler/index.ts
- Commit: 660785d

**2. [Rule 3 - Blocking] Used --use-api flag to bypass locked Windows temp directory**
- Found during: Task 2 deploy
- Issue: The supabase CLI could not create the bundler output directory `supabase/.temp/.output_vapi-tool-handler` due to Windows ACL restrictions (the first deploy created it with locked permissions that even PowerShell could not remove or inspect).
- Fix: Used `npx supabase functions deploy --use-api` which bundles server-side without the local temp directory.
- Files modified: None (deploy command only)
- Commit: N/A (operational fix)

## Decisions Made

**Inline PACKAGES rather than import from pricing-lookup**
Deno edge functions share no runtime context, but they share the same file system when bundled. Importing a module that calls `serve()` at top level is a side effect that overwrites the intended handler. The correct pattern for sharing data across edge functions is to either extract shared constants into a third file with no side effects, or inline them. Inlining was chosen because the data is small, stable, and already documented as canonical in CLAUDE.md.

**Deploy via --use-api**
The local Supabase CLI temp directory became inaccessible due to Windows file system permission issues on the `.output_vapi-tool-handler` directory. The `--use-api` flag sends source files to Supabase for server-side bundling, bypassing the local bundler entirely. This is the preferred approach going forward for this project on Windows.

## Self-Check: PASSED

Files verified:
- FOUND: D:/Projects/FaithandHarmony/supabase/functions/vapi-tool-handler/index.ts
- FOUND: D:/Projects/FaithandHarmony/supabase/functions/vapi-tool-handler/index.spec.ts

Commits verified:
- 660785d present in git log
- Live deployment confirmed via curl test returning correct natural language pricing
