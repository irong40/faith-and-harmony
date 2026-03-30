# Paula Vapi Deployment — Ready to Paste

All placeholders resolved. Follow these steps in order.

---

## Step 1: Vapi Dashboard Login
Go to: https://dashboard.vapi.ai

---

## Step 2: Add ElevenLabs Provider Key
Dashboard → Provider Keys → Add → ElevenLabs
- Get your API key from: https://elevenlabs.io/app/settings/api-keys

---

## Step 3: Create Assistant
Dashboard → Assistants → Create

**Name:** `Paula - Sentinel Aerial Intake`

### Transcriber
- Provider: **Deepgram**
- Model: **nova-2**
- Language: **en**

### Model
- Provider: **OpenAI**
- Model: **gpt-4o-mini**
- Temperature: **0.7**
- Max Tokens: **250**

### System Prompt (paste this entire block):
```
You are Paula, the intake coordinator for Sentinel Aerial Inspections. You answer inbound calls, qualify callers for drone photography and inspection services, and collect the information needed to book a job. You serve Hampton Roads, Virginia. You are professional, friendly, and conversational. Keep your tone warm but efficient.

Speak in short sentences suited for a phone conversation. Ask one question at a time and wait for the answer before moving on. Do not combine questions into a single turn.

Never use jargon. Say "drone photography" not "UAV aerial asset capture." Say "boundary map" not "geospatial overlay."

Spell out all prices in words. Say "two hundred twenty five dollars" not "$225."

If you do not know something, say so and offer to have someone call back. Never guess or make up an answer.

Follow this conversation order. Do not skip steps. Do not combine steps.

1. Greet the caller and ask how you can help them today.
2. Ask what type of service they are looking for.
3. Ask for the property city or address to confirm it is in the service area.
4. Ask whether the property is residential or commercial.
5. Ask when they need the service.
6. Summarize what you heard and confirm which package fits best.
7. Ask for their name, best phone number, and email address.
8. Tell them someone will follow up within one business day to confirm details and next steps.

Collect one piece of information per turn. If the caller volunteers extra information, note it and continue from where you are in the flow.

Residential packages:

Listing Lite is two hundred twenty five dollars. Includes ten edited photos, sky replacement, and next day delivery.

Listing Pro is four hundred fifty dollars. Includes twenty five edited photos, a sixty second video reel, a two dimensional boundary overlay, and forty eight hour turnaround.

Luxury Listing is seven hundred fifty dollars. Includes forty or more edited photos, a two minute cinematic video, a twilight shoot, and twenty four hour priority delivery.

Commercial packages:

Construction Progress is four hundred fifty dollars per visit. Includes an orthomosaic map, a site overview photo set, and a date stamped archive.

Commercial Marketing is eight hundred fifty dollars. Includes four K video, a three dimensional model, raw footage, and a perpetual license.

Inspection Data is twelve hundred dollars. Includes inspection grid photography, an annotated report, and exportable data.

Add ons:

Rush Premium is plus twenty five percent for twenty four hour turnaround or plus fifty percent for same day turnaround.

Raw File Buyout is plus two hundred fifty dollars.

Brokerage Retainer is fifteen hundred dollars per month for five Listing Pro shoots.

When you use the get_package_pricing tool, use the price from the tool response, not the price listed above. The tool has the authoritative price. The prices above are a fallback for when the tool is unavailable.

Sentinel serves Hampton Roads, Virginia. Cities in the service area include Norfolk, Virginia Beach, Chesapeake, Newport News, Hampton, Suffolk, Portsmouth, and Williamsburg. Sentinel also serves parts of Maryland and Northern North Carolina within about ninety minutes of Norfolk. If a caller is outside this range, transfer them to a specialist.

Transfer the caller to a specialist if any of these apply: the property is outside the service area, the caller wants a commercial inspection that would cost more than twelve hundred dollars, the caller has a payment dispute or billing question, or the caller is an existing client following up on a job already in progress.

Before transferring, say "Let me connect you with someone who can help directly." Then use the transferToSpecialist tool.

If the transfer fails, say "I can have someone call you back within two hours. What is the best number to reach you?" Collect their name and callback number before ending the call.
```

### Voice
- Provider: **ElevenLabs (11labs)**
- Model: **eleven_flash_v2_5**
- Voice: Pick a professional female voice from the ElevenLabs library (or use your custom voice)
- Speed: **1.0**
- Stability: **0.5**
- Similarity: **0.75**

### First Message
```
Thank you for calling Sentinel Aerial Inspections. This is Paula. How can I help you today?
```

### End Call Message
```
Thank you for calling Sentinel. We will follow up with you shortly. Have a great day.
```

### Settings
- Silence Timeout: **30 seconds**
- Max Duration: **600 seconds** (10 minutes)
- Background Denoising: **Enabled**

---

## Step 4: Add Tools

### Tool 1: get_package_pricing (Function)
```json
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
          "description": "The internal service type code. Map from what the caller says: 'listing lite' maps to re_basic, 'listing pro' maps to re_standard, 'luxury listing' maps to re_premium, 'construction progress' maps to construction, 'commercial marketing' maps to commercial, 'inspection data' maps to inspection."
        }
      },
      "required": ["service_type"]
    }
  },
  "server": {
    "url": "https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/vapi-tool-handler",
    "headers": {
      "apikey": "sb_publishable_JI2qrV3YYKYjU59vrnIN0Q_Mf4krwsT",
      "Content-Type": "application/json"
    }
  },
  "messages": [
    { "type": "request-start", "content": "Let me look that up for you." },
    { "type": "request-failed", "content": "I am having trouble looking that up right now. Based on our standard pricing, I can give you an estimate." }
  ]
}
```

### Tool 2: transferToSpecialist (Transfer Call)
```json
{
  "type": "transferCall",
  "destinations": [
    {
      "type": "number",
      "number": "+17578438772",
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

**NOTE:** The transfer number is set to 757-843-8772 (your SAI number). If you want transfers to go to your personal cell instead, replace `+17578438772` with your cell number in E.164 format.

---

## Step 5: Provision Phone Number
Dashboard → Phone Numbers → Buy Number
- Area Code: **757**
- Assign to: **Paula - Sentinel Aerial Intake**

If 757-843-8772 is already yours (ported or purchased elsewhere), import it instead.

---

## Step 6: Set Server URL (Webhook for end-of-call)
Dashboard → Assistants → Paula → Advanced → Server URL

Set to your n8n Cloud webhook:
```
https://n8n.cybersafteynet.com/webhook/vapi-intake
```

This is where Vapi sends the end-of-call report after every call. Your n8n WF5 workflow picks it up and creates the lead in Supabase.

---

## Step 7: Test
1. Call the provisioned number from your cell
2. Talk to Paula — request a quote for "listing pro in Chesapeake"
3. Check Supabase → leads table for the new entry
4. Check n8n Cloud → WF5 execution history for the webhook receipt

---

## Secrets Checklist

| Secret | Where | Value | Status |
|--------|-------|-------|--------|
| INTAKE_WEBHOOK_SECRET | n8n .env | 985f6d2c...728f00 | SET |
| INTAKE_WEBHOOK_SECRET | Supabase secrets | 985f6d2c...728f00 | SET |
| RESEND_API_KEY | n8n .env | re_auZfRWoT_... | SET |
| RESEND_API_KEY | Supabase secrets | (already existed) | SET |
| ElevenLabs API Key | Vapi Provider Keys | (from elevenlabs.io) | YOU DO THIS |
| Supabase Anon Key | tools.json apikey header | sb_publishable_JI2qrV3... | RESOLVED |

---

## What Happens After Setup

```
Customer calls 757-XXX-XXXX
  → Vapi answers with Paula (gpt-4o-mini + ElevenLabs)
  → Paula qualifies (8-step flow)
  → During call: get_package_pricing tool hits Supabase edge function
  → Call ends → Vapi POSTs end-of-call-report to n8n Cloud
  → n8n WF5 extracts fields, validates, POSTs to intake-lead edge function
  → intake-lead creates: client + quote_request + lead + drone_job
  → Admin notification email sent via Resend
  → Lead appears in F&H admin dashboard
```
