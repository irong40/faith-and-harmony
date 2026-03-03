---
phase: 02-vapi-voice-bot
plan: 03
subsystem: vapi-dashboard-config
tags: [vapi, elevenlabs, voice-bot, setup-guide, dashboard-config, phone-number]

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

affects: [vapi-dashboard-setup, voice-pipeline, 757-phone-number, call-testing]

tech-stack:
  added: []
  patterns:
    - Placeholder suffixes for all dashboard-only secrets kept out of version control
    - Numbered step guide covering prerequisites through end-to-end test verification

key-files:
  created:
    - .planning/phases/02-vapi-voice-bot/vapi-artifacts/assistant-config.json
    - .planning/phases/02-vapi-voice-bot/vapi-artifacts/setup-guide.md
  modified: []

key-decisions:
  - "tools field in assistant-config.json uses PASTE_TOOLS_FROM_TOOLS_JSON placeholder because the Vapi dashboard accepts a JSON array at creation time, not a nested object reference"
  - "Guide instructs user to use anon public key for get_package_pricing tool headers, not service role key, since pricing data is read-only and public"

requirements-completed: [VBOT-01, VBOT-02]

status: paused-at-checkpoint
checkpoint: Task 2 (human-verify) - awaiting dashboard configuration and phone call verification

duration: 5min
completed: 2026-03-03
---

# Phase 2 Plan 3: Vapi Dashboard Setup Guide and Assistant Configuration Summary

**Vapi dashboard setup guide with 7 numbered steps and reference assistant-config.json covering all CreateAssistantDTO fields, placeholder documentation, and end-to-end test call instructions for the 757 Paula voice bot**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-03T17:04:44Z
- **Completed:** 2026-03-03 (partial, paused at checkpoint)
- **Tasks:** 1 of 2 complete
- **Files created:** 2

## Accomplishments

- Created assistant-config.json with complete Vapi CreateAssistantDTO structure including transcriber (Deepgram nova-2), model (OpenAI gpt-4o-mini, 0.7 temperature, 250 max tokens), voice (ElevenLabs eleven_flash_v2_5, speed 1.0, stability 0.5, similarity 0.75), firstMessage, endCallMessage, silenceTimeoutSeconds 30, maxDurationSeconds 600, backgroundDenoisingEnabled true, and all placeholder markers
- Authored setup-guide.md with 7 sections covering prerequisites, ElevenLabs API key entry, assistant creation, voice configuration, tool definition entry with placeholder replacement instructions, timeout settings, and 757 area code phone number provisioning
- Placeholder reference section documents all 5 placeholders (PASTE_SYSTEM_PROMPT_HERE, ELEVENLABS_VOICE_ID_PLACEHOLDER, SUPABASE_ANON_KEY_PLACEHOLDER, +1IRON_PHONE_PLACEHOLDER, PASTE_TOOLS_FROM_TOOLS_JSON) with exact locations for each real value
- Test call section covers three verification scenarios: normal qualification flow, pricing tool call verification, and out of area escalation path

## Task Commits

1. **Task 1: Create assistant configuration JSON and setup guide** - `5324d04` (feat)
2. **Task 2: Verify voice bot answers calls** - PENDING (checkpoint, awaiting human action)

## Files Created/Modified

- `.planning/phases/02-vapi-voice-bot/vapi-artifacts/assistant-config.json` - Complete Vapi assistant configuration with all settings and placeholder markers
- `.planning/phases/02-vapi-voice-bot/vapi-artifacts/setup-guide.md` - Seven step Vapi dashboard setup guide from ElevenLabs key entry through test call

## Decisions Made

The tools field in assistant-config.json uses a string placeholder (PASTE_TOOLS_FROM_TOOLS_JSON) rather than the actual JSON array. The Vapi dashboard accepts tool definitions as part of the assistant creation form. The tools.json file in this directory contains the ready-to-paste array. Keeping them separate makes each file independently maintainable.

The setup guide instructs users to use the anon public Supabase key for the get_package_pricing tool server headers. The pricing endpoint returns read-only data. There is no reason to expose the service role key in a Vapi dashboard configuration.

## Deviations from Plan

None. Plan executed exactly as written.

## User Setup Required

The entire purpose of this plan is to generate the artifacts for user setup. Follow setup-guide.md in the vapi-artifacts directory to complete Vapi dashboard configuration.

Required external actions:
1. Create Vapi account at https://vapi.ai
2. Enter ElevenLabs API key in Vapi Provider Keys
3. Create the Paula assistant using assistant-config.json as reference
4. Replace all 5 placeholder values with real values
5. Provision 757 area code phone number and connect to assistant
6. Wait 5 minutes and run test call per the 7-step test section in setup-guide.md

## Next Phase Readiness

Task 1 is complete. All dashboard configuration artifacts exist. The plan resumes after the human checkpoint when the user confirms the 757 number connects to Paula and the bot completes a test qualification call.

Once the checkpoint passes, Phase 2 is complete and Phase 3 (webhook processing) can begin.

---
*Phase: 02-vapi-voice-bot*
*Plan status: Paused at Task 2 checkpoint*
*Task 1 completed: 2026-03-03*
