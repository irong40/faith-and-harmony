# 04-03 Summary: Vapi check_availability Tool and System Prompt Additions

**Status:** Complete
**Date:** 2026-03-03

## What Was Done

### check-availability.json
Created `src/vapi/tools/check-availability.json` with Vapi custom tool schema:
- type: "function" with server URL pointing to the deployed availability-check edge function
- Parameters: service_type (optional enum), start_date (required), end_date (required)
- Description guides the LLM on when to call it (availability questions, booking requests)
- Server URL: `https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/availability-check`

This JSON is meant to be added to the tools array in the Vapi assistant configuration via the dashboard.

### system-prompt-additions.md
Created `src/vapi/system-prompt-additions.md` with instructions for the bot covering:
- When to check availability (scheduling questions, "when can you come out")
- How to call the tool (today + 14 days default range, include service_type if known)
- How to speak results (use readable_dates field, never raw ISO strings)
- Handling no availability (offer to check the next 14 day window)
- Capturing preferred date (confirm back, record in call summary)
- Not promising bookings (bot captures preference, team confirms)

These additions should be appended to the Phase 2 system prompt in the Vapi dashboard.

## Verification
- JSON validated with python json.tool
- Server URL matches deployed edge function
- Parameter schema matches edge function query params

## Files Created
- `src/vapi/tools/check-availability.json`
- `src/vapi/system-prompt-additions.md`
