# Phase 3: n8n Vapi Pipeline - Research

**Researched:** 2026-03-03
**Domain:** n8n workflow automation + Vapi webhook integration + Supabase edge function calling
**Confidence:** MEDIUM-HIGH (Vapi payload structure confirmed via official docs + community; n8n patterns confirmed from existing project workflows)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTAKE-05 | Bot-created requests feed into existing quote request to invoice workflow without manual re-entry | Intake edge function already sets `status: 'new'` and `source: 'voice_bot'` on quote_requests. No code change needed in edge function. n8n workflow triggers this by calling intake-lead with correct payload. |
| MWARE-01 | n8n workflow receives Vapi end-of-call webhook with call summary and extracted fields | Vapi sends POST to n8n webhook node. Payload at `body.message`. Type filter on `body.message.type === 'end-of-call-report'` gates execution. |
| MWARE-02 | n8n transforms Vapi payload into intake API format and calls edge function | Code node extracts from `body.message.analysis.structuredData` (or transcript fallback). HTTP Request node POSTs to intake-lead with `x-webhook-secret` header. |
| MWARE-03 | Failed intakes trigger admin notification via existing messaging or email | IF node on HTTP response status code. Failure branch calls Resend via HTTP Request or existing send-quote-email edge function pattern. |
| MWARE-04 | Successful qualified intakes trigger the request-to-quote flow automatically | quote_requests inserted with `status: 'new'` and `source: 'voice_bot'` already appears in admin Quote Requests page (verified in Phase 1 success criteria). No additional trigger needed. |
</phase_requirements>

---

## Summary

Phase 3 builds an n8n workflow that sits between Vapi (voice bot) and the Supabase intake-lead edge function. When a call ends, Vapi fires a POST webhook to an n8n webhook node. The workflow filters for `end-of-call-report` events, extracts structured data from the Vapi payload, transforms it into the intake API format, and calls the already-deployed `intake-lead` edge function. A failed intake (4xx/5xx from the edge function, or missing required fields) routes to an admin notification branch.

The two key technical decisions are: (1) how to extract structured caller data from the Vapi webhook payload, and (2) how to send admin failure notifications. The existing project uses Resend for email and has a `send-quote-email` edge function pattern. The n8n instance already has Supabase HTTP credentials and follows a webhook-trigger to HTTP-request-to-IF-node pattern (visible in wf1 and wf4).

INTAKE-05 requires no new code in the edge function. The `intake-lead` function already creates a `quote_requests` row with `status: 'new'` and `source: 'voice_bot'`, which the Phase 1 verification confirmed appears in the admin Quote Requests page. The entire INTAKE-05 requirement is satisfied by the n8n workflow calling intake-lead correctly.

**Primary recommendation:** Build the workflow as a single n8n JSON file (`wf5-vapi-intake-pipeline.json`) following the existing wf1/wf4 patterns. Use Vapi `analysisPlan.structuredData` for reliable field extraction, with a Code node fallback that parses the transcript summary if structuredData is incomplete.

---

## Standard Stack

### Core

| Component | Version/Detail | Purpose | Why Standard |
|-----------|----------------|---------|--------------|
| n8n Webhook node | typeVersion 2 | Receives Vapi POST webhook | Already in use in wf1; supports headerAuth for security |
| n8n Code node | typeVersion 2 | Transform Vapi payload to intake format | Handles conditional logic, fallbacks; more reliable than pure expressions |
| n8n HTTP Request node | typeVersion 4.2 | Call intake-lead edge function | Same node used in wf1, wf4 for Supabase calls |
| n8n IF node | typeVersion 2 | Route on HTTP status code | Same pattern used in wf4 heartbeat |
| n8n Respond to Webhook node | typeVersion 1 | Immediately ACK Vapi webhook | Prevents Vapi timeout; matches wf1 pattern |
| Vapi analysisPlan | structuredDataSchema | Extract structured fields from call transcript | Most reliable extraction; avoids fragile transcript parsing |

### Supporting

| Component | Version/Detail | Purpose | When to Use |
|-----------|----------------|---------|-------------|
| n8n Set node | typeVersion 3.3 | Log success/failure state | Used in wf4; useful for execution history readability |
| Resend via HTTP Request | Direct API call from n8n | Admin failure notification email | Reuses existing RESEND_API_KEY env var; no new credential |
| n8n Error Trigger workflow | Separate wf | Catch uncaught workflow exceptions | For unhandled errors that bypass the IF node (network failure, etc.) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vapi structuredData | Transcript string parsing with regex | structuredData is authoritative; transcript parsing is fragile and brittle |
| HTTP Request to Resend | n8n Gmail node or SMTP | Resend already configured in project; no new credentials |
| Separate error workflow | continueOnFail on every node | Error workflow catches ALL failures including unhandled ones; continueOnFail only handles specific nodes |

**No npm installation needed.** This phase is pure n8n workflow JSON + Vapi assistant configuration update (analysisPlan).

---

## Architecture Patterns

### Recommended Workflow Structure

```
wf5-vapi-intake-pipeline.json
Nodes (left to right):
  [Vapi Webhook]
    -> [Respond Accepted]        # immediate 200 ACK
    -> [Filter: end-of-call]     # IF on message.type
        TRUE -> [Extract Fields] # Code node
                -> [Call intake-lead] # HTTP Request
                    -> [Check Status] # IF on statusCode
                        200/201 -> [Log Success]
                        4xx/5xx -> [Build Error Email] -> [Send Admin Alert]
        FALSE -> [Stop: not end-of-call]
```

### Pattern 1: Immediate ACK Before Processing

**What:** The Webhook node uses `responseMode: "responseNode"`. The first node after the trigger is a Respond to Webhook node that returns `{ received: true }` with HTTP 200. Processing continues after the response is sent.

**When to use:** Always with Vapi webhooks. Vapi has a webhook timeout and will retry if it does not get a quick response.

**Example:**
```json
// Source: wf1-sentinel-pipeline-orchestrator.json (existing project pattern)
{
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ JSON.stringify({ received: true, call_id: $json.body.message.call.id }) }}",
    "options": {}
  },
  "id": "respond-accepted",
  "name": "Respond Accepted",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1,
  "position": [440, 160]
}
```

### Pattern 2: Vapi Payload Extraction via Code Node

**What:** A Code node accesses the Vapi payload from the Webhook trigger node's output and builds the intake API payload.

**When to use:** When structuredData may be partially populated (fields are optional in Vapi analysis). Code node handles null-safety and fallbacks.

**Vapi payload paths (MEDIUM confidence, verified via community + official API docs):**

```javascript
// Source: https://vapi.ai/community/m/1256306703776088068
// Source: https://docs.vapi.ai/api-reference/calls/get

const msg = $('Vapi Webhook').item.json.body.message;

// Primary: use analysisPlan structuredData (most reliable)
const sd = msg.analysis?.structuredData || {};

// Fallback fields from call object
const call = msg.call || {};
const customer = call.customer || {};

// Build intake payload
const intake = {
  caller_name:          sd.caller_name || customer.name || 'Unknown Caller',
  caller_phone:         sd.caller_phone || customer.number || '',
  caller_email:         sd.caller_email || null,
  service_type:         sd.service_type || 'unknown',
  job_description:      sd.job_description || msg.analysis?.summary || '',
  call_id:              call.id || '',
  property_address:     sd.property_address || null,
  preferred_date:       sd.preferred_date || null,
  qualification_status: sd.qualification_status || 'pending',
  sentiment:            msg.analysis?.structuredData?.sentiment || null,
};

return [{ json: intake }];
```

### Pattern 3: Header Auth on Webhook Node

**What:** The n8n webhook node uses `authentication: "headerAuth"` to validate that incoming requests include the correct `X-Vapi-Secret` header value before processing.

**When to use:** Always. Prevents unauthorized actors from triggering the intake workflow.

**Configuration:**
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "vapi-intake",
    "authentication": "headerAuth",
    "responseMode": "responseNode",
    "options": {}
  },
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2
}
```
The n8n `Generic Credential` of type `Header Auth` stores the expected header name (`X-Vapi-Secret`) and value. Vapi is configured to send this header via its server URL credential (Bearer token or custom header).

### Pattern 4: HTTP Request to intake-lead Edge Function

**What:** The n8n HTTP Request node POSTs the transformed payload to the Supabase edge function with the webhook secret header.

**Example:**
```json
// Source: wf4 and wf1 patterns (existing project)
{
  "parameters": {
    "method": "POST",
    "url": "={{ $env.SUPABASE_URL }}/functions/v1/intake-lead",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "x-webhook-secret", "value": "={{ $env.INTAKE_WEBHOOK_SECRET }}" },
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify($json) }}",
    "options": { "timeout": 30000 }
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "continueOnFail": true
}
```

`continueOnFail: true` is critical here so the IF node downstream can check the status code even on 4xx/5xx responses.

### Pattern 5: Admin Failure Notification via Resend

**What:** On intake failure (4xx/5xx from edge function), an HTTP Request node calls the Resend API directly to send an email to the admin.

**Why Resend directly:** The n8n instance already has `RESEND_API_KEY` available. Calling the Resend API directly from n8n avoids creating a dependency on a Supabase edge function for failure notifications (which could itself fail).

**Example:**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.resend.com/emails",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Authorization", "value": "=Bearer {{ $env.RESEND_API_KEY }}" },
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ from: 'n8n-alerts@sentinelaerial.com', to: ['contact@sentinelaerial.com'], subject: 'ALERT: Vapi intake failed', text: 'Intake failed for call ' + $('Extract Fields').item.json.call_id + '. Error: ' + $json.body.error }) }}"
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2
}
```

### Pattern 6: Vapi analysisPlan Configuration (in Vapi assistant)

**What:** The Vapi assistant must have an `analysisPlan` with a `structuredDataSchema` and `structuredDataPrompt` to reliably extract caller data from each call.

**When to configure:** This configuration lives in the Vapi assistant (Phase 2 artifact), not in n8n. Phase 3 depends on it being set. If Phase 2 was built without an analysisPlan, the n8n workflow must rely on transcript parsing as the primary extraction method.

**Example analysisPlan for Sentinel:**
```json
{
  "analysisPlan": {
    "structuredDataPrompt": "Extract the following from the call transcript. Use null for any field the caller did not provide.",
    "structuredDataSchema": {
      "type": "object",
      "properties": {
        "caller_name": { "type": "string", "description": "Full name of the caller" },
        "caller_phone": { "type": "string", "description": "Phone number provided by caller" },
        "caller_email": { "type": "string", "description": "Email address if provided, else null" },
        "service_type": {
          "type": "string",
          "enum": ["re_basic", "re_standard", "re_premium", "construction", "inspection", "site_survey"],
          "description": "Service package the caller is interested in"
        },
        "job_description": { "type": "string", "description": "Description of the job or property" },
        "property_address": { "type": "string", "description": "Property address if provided" },
        "preferred_date": { "type": "string", "format": "date", "description": "Preferred service date in YYYY-MM-DD format" },
        "qualification_status": {
          "type": "string",
          "enum": ["qualified", "declined", "transferred", "pending"],
          "description": "Outcome of the qualification conversation"
        },
        "sentiment": {
          "type": "string",
          "enum": ["positive", "neutral", "negative"],
          "description": "Overall caller sentiment"
        }
      },
      "required": ["caller_name", "caller_phone", "service_type", "job_description"]
    }
  }
}
```

### Anti-Patterns to Avoid

- **No-ACK webhook processing:** Never process Vapi data before responding. Vapi will timeout and retry, creating duplicate intakes.
- **Fragile transcript string parsing as primary extraction:** Transcript text format changes based on speaker labels and language settings. Use it only as a last-resort fallback.
- **Missing `continueOnFail` on the HTTP Request node:** Without this, a 4xx from intake-lead stops execution entirely and the error notification branch never runs.
- **Filtering on `message.type` after the ACK:** Always ACK immediately, then filter. If you filter before ACKing and the message type check fails, Vapi gets no response and retries.
- **Hardcoding the n8n webhook URL in Vapi:** The URL format is `https://<your-tunnel-url>/webhook/vapi-intake`. If the Cloudflare Tunnel URL changes, update the Vapi server URL. Use the stable Cloudflare named tunnel (not the temporary trycloudflare.com URLs).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema field extraction from call transcripts | Custom regex or NLP parsing | Vapi `analysisPlan.structuredDataSchema` | Vapi runs extraction post-call with its LLM. More accurate, handles ambiguous caller speech. |
| Retry logic on failed intake calls | Manual retry loop in Code node | n8n `continueOnFail` + error workflow | n8n has built-in execution retry and error workflow pattern |
| Webhook secret validation middleware | Custom IF node checking headers | n8n built-in headerAuth on Webhook node | headerAuth is a first-class node feature; no custom logic needed |
| Admin email HTML templates | Build custom HTML in Code node | Direct Resend API text email | For failure alerts, plain text is sufficient and simpler to maintain |

**Key insight:** The value of this phase is the glue code between Vapi and intake-lead, not building new capabilities. Every element of the chain already exists: the Vapi webhook fires automatically, n8n receives it, and intake-lead already does the Supabase work. The workflow is approximately 6 nodes.

---

## Common Pitfalls

### Pitfall 1: Vapi Sends Multiple Event Types to the Same Webhook URL

**What goes wrong:** By default, Vapi sends ALL server events (call-start, transcript updates, tool calls, end-of-call-report) to the same server URL. The n8n workflow receives call-start and status-update events and tries to run intake logic on them.

**Why it happens:** Vapi's server URL is set once on the assistant or phone number. It does not support per-event-type routing at the server URL level.

**How to avoid:** Add an IF node immediately after Respond Accepted that checks `$json.body.message.type === 'end-of-call-report'`. Route all other types to a No-op (Set node with `result: 'skipped'`) so they exit cleanly.

**Warning signs:** Intake endpoint returning errors for missing required fields in the middle of calls. Check n8n execution history for non end-of-call-report events hitting the workflow.

### Pitfall 2: structuredData Is Null or Empty on First Calls

**What goes wrong:** The first few calls processed by the workflow fail with `Missing required fields: caller_name, caller_phone` because `analysis.structuredData` is null.

**Why it happens:** Vapi's analysisPlan extraction requires the assistant to have `analysisPlan.structuredDataSchema` configured. If Phase 2 did not include this configuration, structuredData will be null in every call. Even with the plan configured, structuredData may be null for very short calls (hangups, voicemails).

**How to avoid:** The Code node must have null-safe fallbacks. Required fields (`caller_name`, `caller_phone`) should attempt to extract from `call.customer.number` and the artifact transcript before marking as missing. For calls where extraction fails entirely, route to the admin notification branch rather than failing silently.

**Warning signs:** 400 responses from intake-lead with "Missing required fields" in the n8n execution log.

### Pitfall 3: Cloudflare Tunnel URL Changes

**What goes wrong:** n8n webhooks stop receiving Vapi events. Vapi dashboard shows failed webhook deliveries.

**Why it happens:** The n8n instance uses a Cloudflare Tunnel. If the tunnel restarts with a temporary trycloudflare.com URL (not a named tunnel), the URL changes on restart.

**How to avoid:** Verify the project uses a named Cloudflare Tunnel (confirmed from n8n-relay docs: "cloudflared tunnel create sentinel-n8n"). Named tunnels have stable URLs. The Vapi server URL should use this named tunnel URL. Document the stable URL in `.env.example` or the project's n8n setup notes.

**Warning signs:** n8n receives zero webhook executions after an infrastructure restart. Check `cloudflared tunnel list` to confirm named tunnel is running.

### Pitfall 4: Intake Called Before analysisPlan Completes

**What goes wrong:** structuredData is present but partially populated because n8n received the webhook before Vapi finished running post-call analysis.

**Why it happens:** Vapi sends the `end-of-call-report` webhook after the call ends but the timing of structuredData population can vary. Community reports indicate this is generally complete by the time the webhook fires, but edge cases exist for long calls.

**How to avoid:** Treat all required fields as potentially null in the Code node. If `caller_phone` is genuinely missing (not from analysis failure), do not attempt intake. Instead, log the call data to a holding structure (a Supabase table or n8n's internal logging) and alert admin. Do not silently drop calls.

**Warning signs:** Some calls produce intakes with `caller_name: 'Unknown Caller'` but have valid transcripts showing the name was stated.

### Pitfall 5: Duplicate Intakes from Vapi Retries

**What goes wrong:** The same call creates two leads in the system.

**Why it happens:** If the n8n workflow does not respond within Vapi's timeout window, Vapi retries the webhook. If the intake-lead call already succeeded on the first attempt before the n8n response timed out, the retry creates a duplicate.

**How to avoid:** The Respond Accepted node must fire before any processing begins (confirmed pattern in wf1). The intake-lead edge function uses `call_id` as an idempotency key candidate. Consider adding a unique constraint or upsert on `vapi_call_logs.call_id` so the second intake attempt matches the existing record rather than creating a new lead.

---

## Code Examples

### Complete Code Node: Extract Fields from Vapi Payload

```javascript
// Source: Derived from https://vapi.ai/community/m/1256306703776088068
// and https://docs.vapi.ai/api-reference/calls/get
// Paths confirmed: body.message.analysis.structuredData, body.message.call.id

const webhookBody = $('Vapi Webhook').item.json.body;
const msg = webhookBody.message || {};
const call = msg.call || {};
const analysis = msg.analysis || {};
const sd = analysis.structuredData || {};
const customer = call.customer || {};

// Build intake payload with null-safe fallbacks
const intake = {
  // Required fields - must be present for intake to succeed
  caller_name:          sd.caller_name || customer.name || null,
  caller_phone:         sd.caller_phone || customer.number || null,
  service_type:         sd.service_type || null,
  job_description:      sd.job_description || analysis.summary || null,
  call_id:              call.id || null,

  // Optional fields - pass through if available
  caller_email:         sd.caller_email || null,
  property_address:     sd.property_address || null,
  preferred_date:       sd.preferred_date || null,
  qualification_status: sd.qualification_status || 'pending',
  sentiment:            sd.sentiment || null,
};

// Validate required fields before calling intake
const missing = ['caller_name', 'caller_phone', 'service_type', 'job_description', 'call_id']
  .filter(f => !intake[f]);

return [{
  json: {
    ...intake,
    _validation_errors: missing,
    _can_proceed: missing.length === 0,
  }
}];
```

### IF Node: Check Vapi Event Type

```json
// Source: n8n IF node pattern from wf4-n8n-heartbeat.json (existing project)
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $json.body.message.type }}",
          "rightValue": "end-of-call-report",
          "operator": { "type": "string", "operation": "equals" }
        }
      ],
      "combinator": "and"
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2
}
```

### IF Node: Check Intake Response Status

```json
// Source: wf4-n8n-heartbeat.json pattern (existing project)
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $response.statusCode }}",
          "rightValue": 300,
          "operator": { "type": "number", "operation": "lt" }
        }
      ],
      "combinator": "and"
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2
}
```

### IF Node: Check Validation Passed

```json
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $json._can_proceed }}",
          "rightValue": true,
          "operator": { "type": "boolean", "operation": "equals" }
        }
      ],
      "combinator": "and"
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Transcript regex parsing for field extraction | Vapi `analysisPlan.structuredDataSchema` LLM extraction | 2024 (Vapi v2) | Reliable structured fields without fragile string parsing |
| Vapi sends to a single server URL (all events) | Same behavior - still one server URL per assistant | Current | Workflow must filter event types |
| n8n HTTP Request typeVersion 4.1 | typeVersion 4.2 | ~2024 | Minor: use 4.2 as in wf1 and wf4 |

**Current Vapi webhook payload paths (MEDIUM confidence, verified via official API docs + community):**
- Event type: `body.message.type`
- Structured data: `body.message.analysis.structuredData`
- Call summary: `body.message.analysis.summary`
- Call ID: `body.message.call.id`
- Call ended reason: `body.message.endedReason`
- Caller phone: `body.message.call.customer.number`
- Caller name: `body.message.call.customer.name`
- Transcript: `body.message.artifact.transcript`

---

## Open Questions

1. **Does Phase 2 include the analysisPlan configuration in the Vapi assistant?**
   - What we know: Phase 2 plans are not yet written. The analysisPlan is a Vapi assistant configuration detail.
   - What's unclear: If Phase 2 omits the analysisPlan, the n8n Code node must treat structuredData as always null and parse from transcript.
   - Recommendation: The Phase 3 planner should flag this as a dependency. Either (a) require Phase 2 to include analysisPlan as a task, or (b) build the Code node with a robust transcript fallback path. Document this as a coordination point between Phase 2 and Phase 3 plans.

2. **What admin notification channel should failure alerts use?**
   - What we know: The project uses Resend (RESEND_API_KEY in env) for all email. The n8n instance has RESEND_API_KEY available. Calling Resend directly from n8n avoids a Supabase edge function dependency in the failure path.
   - What's unclear: Whether the admin prefers email or an in-app notification (conversations/messages table).
   - Recommendation: Use Resend email as the primary notification channel. Plain text email to `contact@sentinelaerial.com` is sufficient. Do not write to the messaging table from n8n (adds complexity, requires authenticated Supabase call).

3. **Is `customer.number` always populated for inbound Vapi calls?**
   - What we know: Vapi call objects include a `customer` field with number and optional name. For inbound calls, caller ID should populate `customer.number`.
   - What's unclear: Behavior for callers with blocked caller ID or VOIP numbers that don't send caller ID.
   - Recommendation: Treat `caller_phone` as required. If both `sd.caller_phone` and `customer.number` are null, route to the admin notification branch rather than proceeding to intake. Log the call_id and transcript for manual follow-up.

4. **Should the n8n workflow also log to `vapi_call_logs` directly?**
   - What we know: The `intake-lead` edge function already updates `vapi_call_logs` with `lead_id` and `sentiment` after creating the lead. The call log row itself is created... (unclear - Phase 1 plans should have addressed this).
   - What's unclear: Who creates the initial `vapi_call_logs` row. If it is created by the Vapi webhook or n8n before calling intake-lead, the foreign key reference in intake-lead works. If intake-lead tries to update a row that doesn't exist, it logs a warning but does not fail.
   - Recommendation: Review Phase 1 plans to confirm vapi_call_logs row creation flow. If n8n is responsible for creating the call log row first, add a Supabase upsert node before the intake-lead call.

---

## Workflow File Naming

Follow existing project pattern:
- File: `D:/Projects/FaithandHarmony/n8n-workflows/wf5-vapi-intake-pipeline.json`
- n8n workflow name: `WF5 - Vapi Intake Pipeline`
- Webhook path: `vapi-intake` (resulting URL: `https://<tunnel-url>/webhook/vapi-intake`)
- n8n workflow tags: `sentinel`, `vapi`, `intake`

---

## Sources

### Primary (HIGH confidence)
- `D:/Projects/FaithandHarmony/supabase/functions/intake-lead/index.ts` - Exact intake API format, required fields, auth header name, response structure
- `D:/Projects/FaithandHarmony/n8n-workflows/wf4-n8n-heartbeat.json` - IF node pattern, Set node pattern, existing n8n workflow JSON structure
- `D:/Projects/FaithandHarmony/n8n-workflows/wf1-sentinel-pipeline-orchestrator.json` - Webhook trigger with headerAuth, respondToWebhook pattern, HTTP Request to Supabase pattern, continueOnFail usage
- `https://docs.vapi.ai/api-reference/calls/get` - Call object structure: `call.id`, `call.customer.number`, `call.analysis`, `call.artifact.transcript`

### Secondary (MEDIUM confidence)
- `https://vapi.ai/community/m/1256306703776088068` - Confirmed paths: `body.message.analysis.structuredData`, `body.message.call.id`, `body.message.analysis.summary` (multiple community members verified same paths)
- `https://docs.vapi.ai/server-url/events` - End-of-call-report payload structure: `{ message: { type: 'end-of-call-report', endedReason, call, artifact } }`
- `https://docs.vapi.ai/server-url/server-authentication` - Vapi supports Header Auth (X-Vapi-Secret), Bearer token, and HMAC for server URL authentication
- `https://docs.vapi.ai/assistants/structured-outputs-examples` - analysisPlan structuredDataSchema JSON schema format and field definition patterns
- `https://automategeniushub.com/mastering-the-n8n-webhook-node-part-a/` - Expression syntax: `$json.body.message.type`, nested path access patterns in n8n

### Tertiary (LOW confidence, flag for validation)
- Vapi analysisPlan exact key names (`structuredDataPrompt`, `structuredDataSchema`) - referenced in search results but the direct docs page returned 404. Verify key names match current Vapi API when configuring the assistant.
- n8n Resend direct API call from n8n - no direct official n8n Resend node doc verified; using generic HTTP Request node is the confirmed fallback.

---

## Metadata

**Confidence breakdown:**
- Vapi end-of-call webhook payload structure: MEDIUM - official API docs confirm the call object structure; community confirms the analysis.structuredData path; exact analysisPlan config key names need verification against live Vapi dashboard
- n8n workflow JSON structure: HIGH - existing wf1 and wf4 files provide direct patterns from this exact n8n instance
- intake-lead API contract: HIGH - read directly from the deployed edge function source
- Admin notification via Resend: MEDIUM - Resend API is stable; using HTTP Request node pattern which is confirmed in wf1

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (Vapi API moves fast; re-verify analysisPlan key names before Phase 3 execution starts)
