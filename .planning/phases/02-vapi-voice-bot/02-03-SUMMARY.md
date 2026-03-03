---
phase: 02-vapi-voice-bot
plan: 03
subsystem: vapi-dashboard-config
tags: [vapi, elevenlabs, voice-bot, setup-guide, dashboard-config, phone-number, 757]

requires:
  - phase: 02-vapi-voice-bot
    plan: 01
    provides: system-prompt.md and tools.json for Paula voice bot
  - phase: 02-vapi-voice-bot
    plan: 02
    provides: deployed vapi-tool-handler with get_package_pricing handler

provides:
  - assistant-config.json reference configuration for Vapi dashboard assistant creation
  - setup-guide.md step by step instructions from ElevenLabs key entry through 757 number provisioning and test call
  - Live 757 area code phone number connected to Paula voice bot (human verified)

affects: [03-intake-pipeline, voice-pipeline, vapi-tool-handler]

tech-stack:
  added: []
  patterns:
    - Placeholder suffixes for all dashboard-only secrets kept out of version control
    - Numbered step guide covering prerequisites through end-to-end test verification
    - Human-verify checkpoint for external platform dashboard configuration

key-files:
  created:
    - .planning/phases/02-vapi-voice-bot/vapi-artifacts/assistant-config.json
    - .planning/phases/02-vapi-voice-bot/vapi-artifacts/setup-guide.md
  modified: []

key-decisions:
  - "tools field in assistant-config.json uses PASTE_TOOLS_FROM_TOOLS_JSON placeholder because the Vapi dashboard accepts a JSON array at creation time, keeping files independently maintainable"
  - "Guide instructs user to use anon public key for get_package_pricing tool headers, not service role key, since pricing data is read-only"
  - "Human checkpoint confirmed: 757 number provisioned, Paula answers calls with ElevenLabs voice, bot completes qualification flow correctly"

requirements-completed: [VBOT-01, VBOT-02]

duration: 30min
completed: 2026-03-03
---

# Phase 2 Plan 3: Vapi Dashboard Setup Guide and Assistant Configuration Summary

Vapi dashboard fully configured with Paula voice bot answering a 757 area code number using ElevenLabs voice, with step by step setup guide and reference assistant configuration JSON for future reference or replication.

## Performance

- Duration: 30 min
- Started: 2026-03-03T17:04:44Z
- Completed: 2026-03-03
- Tasks: 2 of 2 complete
- Files created: 2

## Accomplishments

- Created assistant-config.json with complete Vapi CreateAssistantDTO structure including transcriber (Deepgram nova-2), model (OpenAI gpt-4o-mini, 0.7 temperature, 250 max tokens), voice (ElevenLabs eleven_flash_v2_5, speed 1.0, stability 0.5, similarity 0.75), firstMessage, endCallMessage, silenceTimeoutSeconds 30, maxDurationSeconds 600, backgroundDenoisingEnabled true, and all placeholder markers
- Authored setup-guide.md with 7 sections covering prerequisites, ElevenLabs API key entry, assistant creation, voice configuration, tool definition entry with placeholder replacement instructions, timeout settings, and 757 area code phone number provisioning
- Placeholder reference section documents all 5 placeholders (PASTE_SYSTEM_PROMPT_HERE, ELEVENLABS_VOICE_ID_PLACEHOLDER, SUPABASE_ANON_KEY_PLACEHOLDER, +1IRON_PHONE_PLACEHOLDER, PASTE_TOOLS_FROM_TOOLS_JSON) with exact locations for each real value
- Test call section covers three verification scenarios: normal qualification flow, pricing tool call verification, and out of area escalation path
- Human checkpoint approved: user confirmed Vapi account created, ElevenLabs key added, Paula assistant configured, 757 number provisioned, and bot answers calls correctly with proper qualification flow

## Task Commits

1. Task 1: Create assistant configuration JSON and setup guide - `5324d04` (feat)
2. Task 2: Verify voice bot answers calls - HUMAN CHECKPOINT (approved by user 2026-03-03)

## Files Created/Modified

- `.planning/phases/02-vapi-voice-bot/vapi-artifacts/assistant-config.json` - Complete Vapi assistant configuration with all settings and placeholder markers
- `.planning/phases/02-vapi-voice-bot/vapi-artifacts/setup-guide.md` - Seven step Vapi dashboard setup guide from ElevenLabs key entry through test call

## Decisions Made

The tools field in assistant-config.json uses a string placeholder (PASTE_TOOLS_FROM_TOOLS_JSON) rather than the actual JSON array. The Vapi dashboard accepts tool definitions as part of the assistant creation form. The tools.json file in this directory contains the ready-to-paste array. Keeping them separate makes each file independently maintainable.

The setup guide instructs users to use the anon public Supabase key for the get_package_pricing tool server headers. The pricing endpoint returns read-only data. There is no reason to expose the service role key in a Vapi dashboard configuration.

## Deviations from Plan

None. Plan executed exactly as written. The human checkpoint was approved on first attempt with no issues reported.

## User Setup Required

All required external actions were completed by the user during the human checkpoint:

1. Created Vapi account at https://vapi.ai
2. Entered ElevenLabs API key in Vapi Provider Keys
3. Created the Paula assistant using assistant-config.json as reference
4. Replaced all 5 placeholder values with real values (system prompt, voice ID, Supabase anon key, Iron's phone number, tool definitions)
5. Provisioned 757 area code phone number and connected it to the Paula assistant
6. Verified bot answers calls with ElevenLabs voice greeting and completes qualification flow

Status: Complete. All verified by user test call.

## Next Phase Readiness

Phase 2 is complete. The Vapi voice bot is live and answering calls on a 757 number. Paula uses ElevenLabs voice, qualifies callers through the eight-step flow, queries real pricing via the deployed edge function, and handles out-of-area escalation.

Phase 3 (intake pipeline) can now begin. The vapi-tool-handler is ready to receive calls and write lead data to Supabase.

Remaining placeholder that carries forward: tools.json in the planning directory still has +1IRON_PHONE_PLACEHOLDER as the transferToSpecialist destination. The actual value lives only in the Vapi dashboard. This is intentional for version control safety.

## Self-Check: PASSED

- FOUND: .planning/phases/02-vapi-voice-bot/vapi-artifacts/assistant-config.json
- FOUND: .planning/phases/02-vapi-voice-bot/vapi-artifacts/setup-guide.md
- FOUND commit 5324d04 (Task 1: assistant-config.json and setup-guide.md)
- Human checkpoint approved by user (Task 2: 757 number provisioned and bot verified)

---
*Phase: 02-vapi-voice-bot*
*Completed: 2026-03-03*
