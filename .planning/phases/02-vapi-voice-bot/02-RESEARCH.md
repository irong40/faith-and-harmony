# Phase 2: Vapi Voice Bot - Research

**Researched:** 2026-03-03
**Domain:** Vapi voice bot configuration, ElevenLabs TTS, tool call schemas, system prompt engineering for inbound call qualification
**Confidence:** MEDIUM (Vapi docs partially accessible; core patterns verified from official sources and working Phase 1 code)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VBOT-01 | Vapi assistant configured with ElevenLabs TTS voice and natural conversation flow | ElevenLabs integration confirmed; voice object schema verified; see Standard Stack and Code Examples |
| VBOT-02 | 757 area code phone number provisioned and connected to Vapi assistant | Free Vapi phone number provisioning confirmed; 757 is US area code, supported; see Architecture Patterns |
| VBOT-03 | System prompt covers all 6 service packages with pricing and deliverables | Canonical prices are in CLAUDE.md and pricing-lookup edge function; system prompt template documented in Architecture Patterns |
| VBOT-04 | System prompt includes Hampton Roads service area and surrounding coverage (MD, Northern NC) | Static knowledge embedded directly in system prompt; no tool call needed for geography |
| VBOT-05 | Bot qualifies callers by service type, location, timeline, and property type | BANT-style qualification pattern confirmed; voice prompt best practices documented |
| VBOT-06 | Bot routes edge cases to Iron (out of service area, commercial over $1200, payment disputes, existing client follow-ups) | transferCall tool confirmed with destination phone number; endCall tool for polite declines |
| VBOT-07 | Bot queries pricing and availability mid-conversation via Vapi tool calls | apiRequest tool schema verified; pricing-lookup edge function endpoint confirmed from Phase 1 |
</phase_requirements>

---

## Summary

Phase 2 is a configuration and prompt engineering phase. No new Supabase tables or edge functions are needed beyond what Phase 1 delivered. The deliverables are three artifacts stored in the repo: a system prompt text file, a Vapi tool definition JSON file, and a Vapi dashboard configuration guide.

Vapi provides a cloud platform that handles the full voice pipeline (STT via Deepgram, LLM via OpenAI, TTS via ElevenLabs) with a single assistant configuration object. The assistant is configured once in the Vapi dashboard, then a free US phone number is provisioned and connected to it. The 757 area code is available through Vapi's free phone number tier. Mid-call tool calls use the `apiRequest` built-in tool type or a custom `function` tool pointing at the `pricing-lookup` Supabase edge function already deployed in Phase 1.

The most important constraint for this phase is voice-specific prompt engineering. Voice bots fail in characteristic ways that text chatbots do not: they ramble, ask multiple questions at once, give prices that conflict with what is in the system prompt, and fail to route edge cases cleanly. The system prompt must be structured with labeled sections, use short spoken-sentence guidance, ask exactly one question at a time, and spell out numbers in words. The pricing data in the prompt must exactly match the canonical values in CLAUDE.md.

**Primary recommendation:** Author a structured system prompt in six labeled sections (Identity, Context, Conversation Flow, Pricing Knowledge, Service Area, Escalation Rules), configure one `apiRequest` tool pointing at `pricing-lookup`, configure one `transferCall` tool with Iron's number, store both artifacts as version-controlled files in the repo, and configure the Vapi dashboard from those files.

---

## Standard Stack

### Core

| Component | Provider/Model | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| Voice AI Platform | Vapi (cloud) | Telephony, STT, LLM orchestration, TTS routing, webhooks | Decided in STATE.md; native ElevenLabs support, no self-hosting |
| LLM | OpenAI gpt-4o-mini | Conversation reasoning and response generation | Fast, low-latency, cost-effective for short voice turns; gpt-4o for higher quality if needed |
| STT | Deepgram nova-2 | Speech-to-text transcription | Vapi default, best latency among supported providers |
| TTS | ElevenLabs (eleven_flash_v2_5 model) | Natural voice output | Decided in requirements; ElevenLabs catalog included; `eleven_flash_v2_5` optimized for low latency |
| Phone Number | Vapi Free Tier | Inbound 757 number | Free US numbers up to 10 per wallet; 757 area code requestable |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Vapi `apiRequest` tool | Mid-call GET to pricing-lookup edge function | When caller asks about specific package price |
| Vapi `transferCall` tool | Route edge cases to Iron's phone | Out of service area, commercial over $1200, payment dispute, existing client |
| Vapi `endCall` tool | Gracefully close calls | After capturing callback number or completing intake |
| Vapi Assistant Hooks | Automate actions on `call.ending` event | Future use in Phase 3 when webhook processing starts |

### Alternatives Considered

| Standard Choice | Alternative | Tradeoff |
|----------------|-------------|----------|
| Vapi built-in `apiRequest` tool | Custom `function` tool pointing at `vapi-tool-handler` | `apiRequest` is simpler and has no server; use `function` if logic grows beyond a single GET |
| ElevenLabs catalog voice | Custom cloned voice | Custom cloning is out of scope per REQUIREMENTS.md Out of Scope section |
| Static pricing in system prompt | Knowledge base file upload | KB uses Gemini retrieval and adds latency; prices are stable and fit in a prompt |

**No npm packages are needed.** This phase produces text files and JSON configuration only.

---

## Architecture Patterns

### Recommended File Structure

```
.planning/phases/02-vapi-voice-bot/
├── 02-RESEARCH.md               # This file
├── 02-01-PLAN.md                # Plan 1: system prompt
├── 02-02-PLAN.md                # Plan 2: tool definitions
├── 02-03-PLAN.md                # Plan 3: dashboard configuration guide
└── vapi-artifacts/
    ├── system-prompt.md         # The authored system prompt (version controlled)
    ├── tools.json               # Tool definitions for Vapi dashboard
    └── setup-guide.md           # Step-by-step Vapi dashboard configuration
```

### Pattern 1: Vapi Assistant Object Structure

**What:** A Vapi assistant is a JSON object stored on Vapi's servers and referenced by ID. Once created, a phone number is linked to it by updating the phone number record with the `assistantId`.

**When to use:** Create the assistant once via the Vapi dashboard; use `assistantId` for all future calls and phone number associations.

**Example:**
```json
// Source: https://docs.vapi.ai/api-reference/assistants/create
{
  "name": "Paula - Sentinel Aerial Intake",
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-2",
    "language": "en"
  },
  "model": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "<contents of system-prompt.md>"
      }
    ],
    "maxTokens": 250,
    "temperature": 0.7
  },
  "voice": {
    "provider": "11labs",
    "voiceId": "<voice ID from ElevenLabs library>",
    "model": "eleven_flash_v2_5",
    "speed": 1.0,
    "stability": 0.5,
    "similarity": 0.75
  },
  "firstMessage": "Thank you for calling Sentinel Aerial Inspections. This is Paula. How can I help you today?",
  "endCallMessage": "Thank you for calling Sentinel. We will follow up with you shortly. Have a great day.",
  "silenceTimeoutSeconds": 30,
  "maxDurationSeconds": 600,
  "backgroundDenoisingEnabled": true,
  "tools": [
    "<contents of tools.json array>"
  ]
}
```

### Pattern 2: System Prompt Structure for Voice Bots

**What:** Voice bot system prompts use labeled sections instead of paragraphs. Each section is a heading followed by short, imperative instructions. The prompt must work for spoken output, not written text.

**When to use:** Always. Markdown headings and bullet lists help the LLM parse which instructions apply to which situation.

**Proven section structure (from Vapi prompting guide):**

```
# Identity
You are Paula, the intake coordinator for Sentinel Aerial Inspections...

# Communication Style
- Speak in short sentences suited for a phone conversation.
- Ask one question at a time and wait for the answer.
- Never use jargon. Say "drone photography" not "UAV aerial asset capture."
- Spell out prices in words. Say "two hundred twenty-five dollars" not "$225."
- If you do not know something, say so and offer to have someone call back.

# Conversation Flow
Follow this order. Do not skip steps.
1. Greet the caller and ask how you can help.
2. Ask what type of service they are looking for.
3. Ask for the property address or city to confirm it is in the service area.
4. Ask what type of property it is (residential or commercial).
5. Ask when they need the service.
6. Summarize what you heard and confirm the package.
7. Ask for their name, phone number, and email.
8. Tell them someone will follow up within one business day.

# Pricing Knowledge
Residential packages:
- Listing Lite: two hundred twenty-five dollars. Ten photos, sky replacement, next day delivery.
- Listing Pro: four hundred fifty dollars. Twenty-five photos, sixty second video reel, two-D boundary overlay, forty-eight hour turnaround.
- Luxury Listing: seven hundred fifty dollars. Forty or more photos, two minute cinematic video, twilight shoot, twenty-four hour priority delivery.

Commercial packages:
- Construction Progress: four hundred fifty dollars per visit. Orthomosaic, site overview, date-stamped archive.
- Commercial Marketing: eight hundred fifty dollars. Four-K video, three-D model, raw footage, perpetual license.
- Inspection Data: twelve hundred dollars. Inspection grid photography, annotated report, exportable data.

Add-ons:
- Rush Premium: twenty-four hour is plus twenty-five percent. Same day is plus fifty percent.
- Raw File Buyout: plus two hundred fifty dollars.
- Brokerage Retainer: fifteen hundred dollars per month for five Listing Pro shoots.

# Service Area
Sentinel serves Hampton Roads, Virginia: Norfolk, Virginia Beach, Chesapeake, Newport News, Hampton, Suffolk, Portsmouth, and Williamsburg.
We also serve parts of Maryland and Northern North Carolina.
We do not serve locations more than about ninety minutes from Norfolk.

# Escalation Rules
Transfer to a specialist if any of these apply:
- The property is outside the service area.
- The caller wants a commercial inspection that would cost more than twelve hundred dollars.
- The caller has a payment dispute or billing question.
- The caller is an existing client following up on a job already in progress.

If you need to transfer, say: "Let me connect you with someone who can help directly." Then use the transfer tool.
If transfer fails or the caller prefers a callback, say: "I can have someone call you back. What is the best number to reach you?"
```

### Pattern 3: Tool Definition for Pricing Lookup

**What:** A Vapi `function` tool that calls the `pricing-lookup` Supabase edge function when the caller asks about a specific package price mid-conversation.

**When to use:** When the caller asks "how much does the X package cost" or compares packages, the bot calls this tool rather than relying on the static pricing in the system prompt. This ensures prices are always accurate if they change.

**Example:**
```json
// Source: https://docs.vapi.ai/tools/custom-tools.mdx and pricing-lookup/index.ts
{
  "type": "function",
  "async": false,
  "function": {
    "name": "get_package_pricing",
    "description": "Look up the exact price and deliverables for a Sentinel Aerial Inspections service package. Call this when the caller asks about the cost of a specific service.",
    "parameters": {
      "type": "object",
      "properties": {
        "service_type": {
          "type": "string",
          "enum": ["re_basic", "re_standard", "re_premium", "construction", "commercial", "inspection"],
          "description": "The internal service type code. Map from what the caller says: 'listing lite' -> re_basic, 'listing pro' -> re_standard, 'luxury listing' -> re_premium, 'construction progress' -> construction, 'commercial marketing' -> commercial, 'inspection data' -> inspection."
        }
      },
      "required": ["service_type"]
    }
  },
  "server": {
    "url": "https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/pricing-lookup",
    "headers": {
      "apikey": "<SUPABASE_ANON_KEY>",
      "Content-Type": "application/json"
    }
  },
  "messages": [
    {
      "type": "request-start",
      "content": "Let me look that up for you."
    },
    {
      "type": "request-failed",
      "content": "I am having trouble looking that up right now. Based on our standard pricing, I can give you an estimate."
    }
  ]
}
```

Note: The `pricing-lookup` function uses GET with a `service_type` query parameter. Vapi's `function` tool type sends the parameters as a POST body to the server URL. The `vapi-tool-handler` edge function (already deployed) follows the Vapi tool-call request format and can dispatch to `pricing-lookup`. Update `vapi-tool-handler` to add a `get_package_pricing` handler that internally calls `pricing-lookup`, or configure the tool to hit `pricing-lookup` directly with a GET. Using `vapi-tool-handler` as the single Vapi tool endpoint is cleaner for future tool additions.

### Pattern 4: Transfer Call Tool Definition

**What:** A Vapi `transferCall` tool configured with Iron's phone number as the destination.

**Example:**
```json
// Source: https://docs.vapi.ai/customization/tool-calling-integration
{
  "type": "transferCall",
  "destinations": [
    {
      "type": "number",
      "number": "+1<IRON_PHONE_NUMBER>",
      "message": "Let me connect you with someone who can help directly. Please hold for just a moment."
    }
  ],
  "function": {
    "name": "transferToSpecialist",
    "description": "Transfer the caller to a Sentinel specialist. Use this when the caller is outside the service area, has a commercial job over twelve hundred dollars, has a payment question, or is an existing client following up.",
    "parameters": {
      "type": "object",
      "properties": {
        "reason": {
          "type": "string",
          "description": "Why you are transferring this caller."
        }
      },
      "required": ["reason"]
    }
  }
}
```

### Anti-Patterns to Avoid

- **Asking multiple questions in one turn:** Voice bots that ask "What service do you need, and where is the property, and when do you need it?" confuse callers and produce partial answers. Always ask one question and wait.
- **Using dollar sign notation in the prompt:** Writing "$225" causes TTS to read it as "dollar sign two twenty-five" on some voices. Spell out prices: "two hundred twenty-five dollars."
- **Embedding prices as numbers only:** If the LLM reformats or approximates, callers get wrong prices. Spell out prices and list deliverables.
- **Over-long system prompts:** Prompts over 2000 tokens increase LLM latency, which adds to call response time. Keep the prompt focused.
- **Vague escalation rules:** "Transfer when appropriate" does not work. List exact conditions that trigger transfer, as specific as "commercial inspection over twelve hundred dollars."
- **No fallback for failed transfers:** If `transferCall` fails (Iron unavailable), the call drops silently. Always instruct the bot to offer a callback number instead.
- **Storing Iron's phone number in the system prompt:** It should live only in the tool definition so it can be changed without rewriting the prompt.

---

## Don't Hand-Roll

| Problem | Do Not Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telephony infrastructure | Custom Twilio call handling | Vapi | Twilio requires building STT, LLM routing, TTS pipeline yourself |
| Endpointing/turn detection | Custom silence detection | Vapi built-in orchestration | Vapi runs 7 proprietary models including endpointing and barge-in detection |
| Voice selection UI | Custom voice picker | Vapi dashboard voice library | ElevenLabs voices sync automatically after API key entry |
| Mid-call pricing lookup | Re-embedding pricing as a knowledge base | `apiRequest` or `function` tool calling `pricing-lookup` | Phase 1 already built the endpoint; tool calls are the Vapi-native pattern |
| Call routing logic | Complex IVR tree | System prompt escalation rules + `transferCall` tool | Vapi LLM handles routing decisions from natural language; no IVR needed |

**Key insight:** Vapi abstracts the entire voice pipeline. The only hand-rolled artifact in this phase is the system prompt text and the tool JSON schemas. Everything else is Vapi configuration.

---

## Common Pitfalls

### Pitfall 1: Default Endpointing Adds Latency

**What goes wrong:** The default Vapi VAD threshold causes the bot to wait 1.5 to 2 seconds after the caller stops speaking before responding.

**Why it happens:** Energy-based silence detection is conservative by default to avoid cutting off mid-sentence.

**How to avoid:** In the Vapi dashboard, under Voice Settings for the assistant, reduce `silenceTimeoutSeconds` to 10 to 15 seconds for inbound calls. The Deepgram nova-2 transcriber also supports `endpointing` tuning. Start with defaults, test with a real call, then adjust.

**Warning signs:** Callers perceive the bot as slow or unresponsive.

### Pitfall 2: Prices Out of Sync Between Prompt and Tool Response

**What goes wrong:** The system prompt says "Listing Lite is two hundred twenty-five dollars" but the `get_package_pricing` tool returns a JSON object with `price: 225`. If the bot synthesizes both and they conflict, it hallucinates a different price.

**Why it happens:** The LLM reconciles two sources and may interpolate.

**How to avoid:** In the system prompt, explicitly instruct: "When you use the get_package_pricing tool, use the price from the tool response, not the price listed above. The tool has the authoritative price." The static prices in the prompt are a fallback for when the tool is unavailable.

**Warning signs:** Callers report being quoted a different price than the invoice.

### Pitfall 3: Tool Call to Supabase Edge Function Times Out

**What goes wrong:** The Vapi `function` tool sends a POST to the server URL but `pricing-lookup` only accepts GET. The call returns a 405 error mid-conversation.

**Why it happens:** Vapi's `function` tool type sends tool arguments as a POST body. The `pricing-lookup` function only handles GET with query parameters.

**How to avoid:** Route through `vapi-tool-handler` which accepts POST, extracts the `service_type` argument, and calls `pricing-lookup` with a GET. The `vapi-tool-handler` function already exists and follows the Vapi `toolCallList` format. Add a `get_package_pricing` handler branch to it.

**Warning signs:** Bot says "I am having trouble looking that up" on every tool call attempt.

### Pitfall 4: No Callback Fallback When Transfer Fails

**What goes wrong:** `transferCall` fails because Iron's phone is busy or off. The call silently drops.

**Why it happens:** No fallback path is defined in the system prompt.

**How to avoid:** Add an explicit instruction: "If the transfer fails, do not end the call. Instead, say you will have someone call back within two hours and ask for their name and best callback number."

**Warning signs:** Callers report being hung up on abruptly.

### Pitfall 5: ElevenLabs Voice Requires Subscription API Key

**What goes wrong:** The ElevenLabs API key is not entered in the Vapi dashboard, so custom voices are unavailable and the voice library does not sync.

**Why it happens:** ElevenLabs voices via Vapi's free-tier cost path require the user's own ElevenLabs API key.

**How to avoid:** Before creating the assistant, enter the ElevenLabs API key in Vapi Dashboard > Integrations > ElevenLabs. This must happen before selecting a voice. If using a Vapi-managed voice (from their free catalog), no API key is needed but voice selection is limited.

**Warning signs:** The ElevenLabs voice dropdown in Vapi assistant settings shows no voices or shows an error.

### Pitfall 6: Phone Number Activation Delay

**What goes wrong:** You provision the 757 number but calls fail for the first few minutes.

**Why it happens:** Vapi states activation takes a few minutes after creation.

**How to avoid:** Provision the number, wait 5 minutes, then test.

**Warning signs:** Calling the number immediately after provisioning results in silence or a generic error message.

---

## Code Examples

Verified patterns from official sources and Phase 1 code:

### Vapi Tool Call Request Format (inbound to vapi-tool-handler)

```json
// Source: https://docs.vapi.ai/tools/custom-tools.mdx
// This is what Vapi POSTs to the server URL when the assistant calls a tool
{
  "message": {
    "type": "tool-calls",
    "toolCallList": [
      {
        "id": "toolu_01DTPAzUm5Gk3zxrpJ969oMF",
        "name": "get_package_pricing",
        "arguments": {
          "service_type": "re_standard"
        }
      }
    ]
  }
}
```

### Vapi Tool Call Response Format (from vapi-tool-handler)

```json
// Source: supabase/functions/vapi-tool-handler/index.ts (Phase 1)
// The server must respond with this exact format
{
  "results": [
    {
      "toolCallId": "toolu_01DTPAzUm5Gk3zxrpJ969oMF",
      "result": "Listing Pro: four hundred fifty dollars. Includes twenty-five photos, sixty second video reel, two-D boundary overlay, forty-eight hour turnaround."
    }
  ]
}
```

Note: The `result` value is a plain string the assistant reads aloud. Format it as natural spoken English, not JSON. The `vapi-tool-handler` should convert the `pricing-lookup` JSON response into a readable sentence before returning it.

### Connecting Phone Number to Assistant (Vapi Dashboard)

```
1. Dashboard > Phone Numbers > Create a Phone Number
2. Select "Free Vapi Number" tab
3. Enter area code: 757
4. Wait approximately 5 minutes for activation
5. Dashboard > Phone Numbers > select the new number
6. Set "Inbound Call Handler" to "Assistant"
7. Select "Paula - Sentinel Aerial Intake" from assistant dropdown
8. Save
```

### ElevenLabs Voice Configuration in Vapi

```json
// Source: https://docs.vapi.ai/api-reference/assistants/create
// The voice object in the assistant configuration
{
  "provider": "11labs",
  "voiceId": "<voice ID from ElevenLabs library sync>",
  "model": "eleven_flash_v2_5",
  "speed": 1.0,
  "stability": 0.5,
  "similarity": 0.75
}
```

The `eleven_flash_v2_5` model is ElevenLabs' low-latency model optimized for real-time voice. Use it over `eleven_multilingual_v2` for inbound calls.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Twilio + custom STT/TTS pipeline | Vapi as full-stack voice platform | 2023-2024 | Eliminates months of infrastructure work; all orchestration built-in |
| System prompt as a single paragraph | Labeled sections with Identity, Style, Tasks | 2024 best practice | Improves LLM instruction following and reduces off-script responses |
| Single LLM for everything | Vapi's 7-layer orchestration models | 2024 | Endpointing, barge-in, backchanneling handled separately from main LLM |
| Tool calls as OpenAI function calling format | Vapi `function` type with `server.url` | Current | Tool results return to the conversation; format is `toolCallList` not OpenAI's native format |
| ElevenLabs Turbo v2 | ElevenLabs Flash v2.5 (eleven_flash_v2_5) | 2025 | Lower latency for real-time; preferred for voice bots |

---

## Open Questions

1. **Iron's actual phone number**
   - What we know: The `transferCall` tool requires the destination phone number in E.164 format.
   - What is unclear: Iron's (Adam Pierce's) personal or business phone number is not in any project file reviewed.
   - Recommendation: Iron provides the number before Plan 3 (dashboard config guide) is written. It goes in `tools.json` as the transfer destination.

2. **Which ElevenLabs voice to use**
   - What we know: ElevenLabs catalog will sync after API key entry in Vapi; "Paula" is the existing assistant name in `vapi-tool-handler`.
   - What is unclear: No voice has been pre-selected. The voice should sound professional and approachable for a Hampton Roads service business.
   - Recommendation: During dashboard setup, preview 3 to 5 ElevenLabs voices in the "young American female" or "professional American" category and select the most natural one. Document the chosen `voiceId` in the setup guide.

3. **vapi-tool-handler needs a get_package_pricing handler**
   - What we know: `vapi-tool-handler` already handles `lookup_customer`. The `pricing-lookup` function uses GET, but Vapi function tools POST to the server URL.
   - What is unclear: Whether Plan 1 (system prompt) or Plan 2 (tool definitions) should scope the handler update.
   - Recommendation: Plan 2 (tool definitions) should include adding the `get_package_pricing` branch to `vapi-tool-handler`. The response should be a natural-language string, not raw JSON.

4. **Vapi Supabase anon key for tool server headers**
   - What we know: The `pricing-lookup` function uses CORS headers that accept `apikey` header. The Supabase anon key is the right credential for read-only edge functions.
   - What is unclear: Whether the anon key should be hardcoded in the Vapi tool definition or passed as a variable.
   - Recommendation: Store the anon key directly in the tool definition headers in the Vapi dashboard (it is not a secret for read-only public pricing data). Do not version-control the key in `tools.json`; use a placeholder and document the actual key in the setup guide.

---

## Sources

### Primary (HIGH confidence)

- https://docs.vapi.ai/api-reference/assistants/create - CreateAssistantDTO schema including model, voice, firstMessage, tools
- https://docs.vapi.ai/tools/custom-tools.mdx - Function tool JSON schema, server URL, request/response format
- https://docs.vapi.ai/customization/tool-calling-integration - Three-tier tool calling architecture, transferCall schema
- https://docs.vapi.ai/tools/default-tools.mdx - All 5 default tools including transferCall and apiRequest
- https://docs.vapi.ai/free-telephony.mdx - Free US phone number provisioning, 10-number limit, area code selection
- https://docs.vapi.ai/assistants/dynamic-variables - Dynamic variable syntax `{{varName}}`, built-in variables
- https://docs.vapi.ai/assistants/assistant-hooks.mdx - Hooks for `call.ending` event, hook structure
- `D:/Projects/FaithandHarmony/supabase/functions/pricing-lookup/index.ts` - Phase 1 pricing API: endpoint URL, query params, response format
- `D:/Projects/FaithandHarmony/supabase/functions/vapi-tool-handler/index.ts` - Phase 1 Vapi tool handler: `toolCallList` format, response format

### Secondary (MEDIUM confidence)

- https://docs.vapi.ai/prompting-guide - Recommended system prompt sections: Identity, Style, Response Guidelines, Task and Goals
- https://docs.vapi.ai/how-vapi-works - 7 orchestration models: endpointing, barge-in, backchanneling, noise filtering
- https://docs.vapi.ai/calls/call-dynamic-transfers.mdx - Dynamic transfer patterns, destination format, E.164 requirement
- https://docs.vapi.ai/call-forwarding.mdx - transferCall JSON with destinations array and message field
- https://docs.vapi.ai/knowledge-base - Knowledge base feature exists but uses Gemini retrieval; not recommended here

### Tertiary (LOW confidence, validate before implementation)

- https://docs.vapi.ai/tools/default-tools.mdx - apiRequest tool configuration schema (docs were partially rendered; verify GET vs POST handling in dashboard)
- Claim that `eleven_flash_v2_5` is the current low-latency model name (verify in Vapi dashboard voice selection at implementation time)

---

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM - Vapi is the correct platform (verified in STATE.md); specific model names and versions verified from Vapi docs and Phase 1 code patterns
- Architecture: MEDIUM - System prompt structure verified from official Vapi prompting guide; tool schemas verified from docs; pricing endpoint verified from Phase 1 source
- Pitfalls: MEDIUM - Endpointing and latency issues verified from multiple sources; POST vs GET pitfall is a direct inference from the existing code architecture and Vapi tool documentation

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (Vapi is a fast-moving platform; re-verify specific model names and API schemas before implementation if more than 30 days pass)
