---
phase: 02-vapi-voice-bot
plan: 01
subsystem: voice-bot-config
tags: [vapi, system-prompt, voice-bot, tool-definitions, intake]

requires:
  - phase: 01-intake-api-and-lead-tracking
    provides: pricing-lookup edge function and vapi-tool-handler

provides:
  - system-prompt.md for Paula intake coordinator voice bot
  - tools.json with get_package_pricing and transferToSpecialist tool definitions

affects: [vapi-dashboard-setup, voice-pipeline, call-transfer-routing]

tech-stack:
  added: []
  patterns: [six-section voice bot system prompt, Vapi function tool routing through POST handler, transferCall tool with placeholder credentials]

key-files:
  created:
    - .planning/phases/02-vapi-voice-bot/vapi-artifacts/system-prompt.md
    - .planning/phases/02-vapi-voice-bot/vapi-artifacts/tools.json
  modified: []

key-decisions:
  - "Route get_package_pricing through vapi-tool-handler (POST) not pricing-lookup directly (GET only) to avoid 405 on Vapi tool calls"
  - "All prices spelled in words in system prompt to prevent TTS from reading dollar sign notation"
  - "Iron phone number stored only in tools.json as IRON_PHONE_PLACEHOLDER so it can be changed without rewriting the prompt"
  - "Supabase anon key stored as SUPABASE_ANON_KEY_PLACEHOLDER in version-controlled tools.json; actual value goes in Vapi dashboard only"
  - "System prompt instructs bot to use tool response price over static prices to prevent hallucinated price conflicts"

metrics:
  duration: 1min
  completed: 2026-03-03
  tasks: 2
  files: 2

requirements: [VBOT-03, VBOT-04, VBOT-05, VBOT-06]
---

# Phase 2 Plan 1: Paula Voice Bot System Prompt and Tool Definitions Summary

**Six-section voice bot system prompt and Vapi tool definition JSON for Paula, covering all 6 service packages, 8 Hampton Roads cities, an eight-step qualification flow, and two tool definitions for pricing lookup and call transfer**

## Performance

- **Duration:** 1 min
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- Authored system-prompt.md with six labeled sections (Identity, Communication Style, Conversation Flow, Pricing Knowledge, Service Area, Escalation Rules)
- All 6 canonical package prices spelled in words: Listing Lite two hundred twenty five dollars, Listing Pro four hundred fifty dollars, Luxury Listing seven hundred fifty dollars, Construction Progress four hundred fifty dollars per visit, Commercial Marketing eight hundred fifty dollars, Inspection Data twelve hundred dollars
- All 8 Hampton Roads cities listed (Norfolk, Virginia Beach, Chesapeake, Newport News, Hampton, Suffolk, Portsmouth, Williamsburg) plus Maryland and Northern North Carolina coverage
- Eight-step qualification flow asking one question per turn
- Explicit escalation conditions for out-of-area callers, commercial over twelve hundred dollars, payment disputes, and existing client follow-ups
- Callback fallback when transferToSpecialist fails
- Instruction to trust tool response price over static prices when get_package_pricing is called
- Created tools.json with two Vapi tool definitions: get_package_pricing (function type) and transferToSpecialist (transferCall type)
- get_package_pricing routes through vapi-tool-handler at vapi-tool-handler endpoint to handle Vapi POST format (pricing-lookup only accepts GET)
- transferToSpecialist configured with placeholder phone number (+1IRON_PHONE_PLACEHOLDER) for safe version control
- All secrets stored as named placeholders with PLACEHOLDER suffix

## Task Commits

1. **Task 1: Author the system prompt for Paula** - `02e0408` (feat)
2. **Task 2: Create Vapi tool definition JSON** - `0e1f59c` (feat)

## Files Created/Modified

- `.planning/phases/02-vapi-voice-bot/vapi-artifacts/system-prompt.md` - Complete Paula voice bot system prompt with 6 sections, all canonical prices, qualification flow, and escalation rules
- `.planning/phases/02-vapi-voice-bot/vapi-artifacts/tools.json` - Vapi tool definitions array with get_package_pricing and transferToSpecialist

## Decisions Made

- Route get_package_pricing through vapi-tool-handler not pricing-lookup directly. The pricing-lookup edge function only accepts GET requests. Vapi function tools always POST to the server URL. Routing through vapi-tool-handler avoids the 405 error that would trigger "I am having trouble looking that up" on every call.
- Spell all prices in words in the system prompt. Dollar sign notation causes some TTS engines to read "dollar sign two twenty five" instead of the spoken form.
- Keep Iron's phone number out of the system prompt. Storing it only in tools.json means the number can be updated in the Vapi dashboard without rewriting the prompt text.
- Use PLACEHOLDER suffixes for all secret values. tools.json is version controlled. Actual anon key and phone number go into the Vapi dashboard directly during setup.
- Add explicit tool priority instruction. Without "use the tool response price, not the price above," the LLM can reconcile two price sources and hallucinate an interpolated value.

## Deviations from Plan

None. Plan executed exactly as written.

## Next Phase Readiness

- system-prompt.md and tools.json are ready to paste into the Vapi dashboard during Plan 3 setup
- Iron's actual phone number must be substituted for +1IRON_PHONE_PLACEHOLDER in the Vapi dashboard transferToSpecialist tool destination
- Supabase anon key must be substituted for SUPABASE_ANON_KEY_PLACEHOLDER in the Vapi dashboard get_package_pricing tool server headers
- vapi-tool-handler edge function must have a get_package_pricing handler branch added before voice testing (covered in a later plan)

## Self-Check: PASSED

- FOUND: .planning/phases/02-vapi-voice-bot/vapi-artifacts/system-prompt.md
- FOUND: .planning/phases/02-vapi-voice-bot/vapi-artifacts/tools.json
- FOUND: .planning/phases/02-vapi-voice-bot/02-01-SUMMARY.md
- FOUND commit: 02e0408 (feat: author Paula voice bot system prompt)
- FOUND commit: 0e1f59c (feat: create Vapi tool definition JSON)

---
*Phase: 02-vapi-voice-bot*
*Completed: 2026-03-03*
