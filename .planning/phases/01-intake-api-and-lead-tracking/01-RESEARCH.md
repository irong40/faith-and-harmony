# Phase 1: Intake API and Lead Tracking - Research

**Researched:** 2026-03-03
**Domain:** Supabase Edge Functions (Deno), Postgres schema design, lead capture pipeline
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTAKE-01 | Leads table stores caller info, qualification status, source channel, and links to call log | New migration needed — no leads table exists yet. Schema design covered below. |
| INTAKE-02 | Call logs table stores Vapi call ID, transcript, duration, sentiment, and outcome | `vapi_call_logs` table ALREADY EXISTS in two migrations (20260301191812 and 20260301193705). Needs a gap analysis to confirm fields cover INTAKE-02. Missing: `sentiment` and `outcome` fields. |
| INTAKE-03 | Edge function receives structured call data from n8n and creates or matches a client record plus a quote request | New edge function following existing patterns. Upsert-by-phone logic on `clients` table. Insert into `quote_requests`. |
| INTAKE-04 | Edge function returns package pricing and deliverables for mid-call bot queries | New read-only edge function. Pricing is hardcoded in CLAUDE.md as canonical values. Data can come from static config or the `processing_templates` table. |
</phase_requirements>

---

## Summary

Phase 1 is a pure backend phase. No UI work. All four requirements map to database migrations and Supabase edge functions. The codebase already has solid foundation: `clients` table, `quote_requests` table, the full quote workflow, and even a partial `vapi_call_logs` table created from earlier exploratory work.

The key discovery is that `vapi_call_logs` ALREADY EXISTS in two applied migrations. INTAKE-02 requires `sentiment` and `outcome` fields that are not yet present. The plan must add those fields in a new migration rather than creating a new table from scratch. The existing table references `customers` and `service_requests` via foreign keys from the second migration (20260301193705) -- those reference tables may not exist in the current schema under those exact names, so the planner must verify that or strip those FKs.

The intake edge function (INTAKE-03) follows the `mission-control-api` pattern: service role client, URL path routing, structured TypeScript interfaces, JSON responses. The pricing edge function (INTAKE-04) is a simple read-only GET handler. Both functions authenticate via the `Authorization: Bearer` header using the Supabase service key, consistent with how n8n calls existing functions.

**Primary recommendation:** Write three new migrations (leads table, vapi_call_logs additions, quote_requests source column) and two new edge functions (intake and pricing-lookup), all following existing project patterns exactly.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Deno | std@0.190.0 | Edge function runtime | Already used by all 30+ existing functions |
| @supabase/supabase-js | 2.45.0 | Supabase client in edge functions | Pinned version already in mission-control-api and others |
| Postgres (Supabase) | 15.x | Database | Single Supabase project, all tables |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| deno.land/std http/server.ts | 0.190.0 | `serve()` function | Every edge function entry point |
| npm:resend@2.0.0 | 2.0.0 | Email delivery | Only needed if intake triggers notification email |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static pricing config in edge function | `processing_templates` table lookup | Static is simpler, faster, no DB call. Acceptable because CLAUDE.md marks prices as canonical/locked. |
| New `call_logs` table | Extending existing `vapi_call_logs` | Must extend existing — migration already applied to production. |

**Installation:** No new npm packages needed. All dependencies are already present in the project.

---

## Architecture Patterns

### Recommended Edge Function Structure

All edge functions in this project follow one pattern. New functions MUST follow it exactly.

```
supabase/functions/
├── intake-lead/          # INTAKE-03: POST receiver from n8n
│   └── index.ts
└── pricing-lookup/       # INTAKE-04: GET for mid-call pricing queries
    └── index.ts
```

### Pattern 1: Service Role Edge Function

**What:** Every function that writes to the database uses `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) so it bypasses RLS. This is the standard for all n8n-facing functions.

**When to use:** Any function called by n8n or backend systems (not browser clients).

```typescript
// Source: supabase/functions/mission-control-api/index.ts (existing codebase)
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ... handler logic

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

### Pattern 2: Client Upsert by Phone (INTAKE-03 core logic)

**What:** Match an incoming call to an existing client by phone number. If found, link to them. If not, create a new client record. This is the "create or match" requirement from INTAKE-03.

**When to use:** Any time a bot-submitted lead arrives with a phone number.

```typescript
// Derived from existing clients table schema and Supabase JS client patterns
async function findOrCreateClient(supabase, { name, phone, email }) {
  // Normalize phone: strip non-digits for comparison
  const normalizedPhone = phone.replace(/\D/g, '');

  // Try to find existing client by phone
  const { data: existing } = await supabase
    .from('clients')
    .select('id, name, email, phone')
    .or(`phone.eq.${phone},phone.eq.${normalizedPhone}`)
    .limit(1)
    .single();

  if (existing) {
    return { client_id: existing.id, created: false };
  }

  // Create new client
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({ name, phone, email, created_by: null })
    .select('id')
    .single();

  if (error) throw error;
  return { client_id: newClient.id, created: true };
}
```

### Pattern 3: Quote Request Insert (feeds existing admin workflow)

**What:** The intake edge function inserts into `quote_requests` using the EXISTING schema. This is how the lead appears in the admin Quote Requests page automatically.

```typescript
// Source: quote_requests schema from 20260227100000_repair_quote_tables.sql
const { data: request, error } = await supabase
  .from('quote_requests')
  .insert({
    name: callerName,
    email: callerEmail ?? '',
    phone: callerPhone,
    job_type: serviceType,      // maps to package code: re_basic, re_standard, etc.
    description: jobDescription,
    status: 'new',              // default status, appears in admin immediately
  })
  .select('id')
  .single();
```

### Pattern 4: Static Pricing Lookup (INTAKE-04)

**What:** The pricing edge function returns a package by service code. Prices are canonical in CLAUDE.md and hard-coded in `SentinelPricing.tsx` already. The edge function mirrors that same data structure.

```typescript
// Derived from SentinelPricing.tsx constants (existing codebase)
const PACKAGES: Record<string, { name: string; price: number; unit?: string; deliverables: string[] }> = {
  re_basic: {
    name: 'Listing Lite',
    price: 225,
    deliverables: ['10 photos', 'Sky replacement', 'Next day delivery'],
  },
  re_standard: {
    name: 'Listing Pro',
    price: 450,
    deliverables: ['25 photos', '60 second reel', '2D boundary overlay', '48 hour turnaround'],
  },
  re_premium: {
    name: 'Luxury Listing',
    price: 750,
    deliverables: ['40+ photos', '2 minute cinematic video', 'Twilight shoot', '24 hour priority'],
  },
  construction: {
    name: 'Construction Progress',
    price: 450,
    unit: '/visit',
    deliverables: ['Orthomosaic', 'Site overview', 'Date stamped archive'],
  },
  commercial: {
    name: 'Commercial Marketing',
    price: 850,
    deliverables: ['4K video', '3D model', 'Raw footage', 'Perpetual license'],
  },
  inspection: {
    name: 'Inspection Data',
    price: 1200,
    deliverables: ['Inspection grid photography', 'Annotated report', 'Exportable data'],
  },
};
```

### Migration Pattern

**What:** All migrations follow a consistent style in this project.

```sql
-- Description comment first
-- Phase context: what this migration belongs to

CREATE TABLE IF NOT EXISTS public.table_name (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  -- ... fields
);

ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.table_name
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_table_field
  ON public.table_name (field);

COMMENT ON TABLE public.table_name IS 'Description.';
```

### Anti-Patterns to Avoid

- **Re-creating vapi_call_logs:** The table already exists in production via applied migrations. Never DROP and recreate. Use ALTER TABLE ADD COLUMN IF NOT EXISTS.
- **Using anon key for n8n-facing functions:** n8n uses the service role key. Functions called by n8n must use SUPABASE_SERVICE_ROLE_KEY.
- **Phone number matching without normalization:** Phone numbers arrive from Vapi in E.164 format (+17575551234) but the clients table may store them in various formats. Always normalize before matching.
- **Skipping the CORS preflight check:** Every single existing function handles OPTIONS first. Never omit it.
- **Hardcoding Supabase credentials:** Always use `Deno.env.get('SUPABASE_URL')` and `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number E.164 normalization | Custom regex parser | Simple `replace(/\D/g, '')` then compare digit strings | Vapi always sends E.164, clients table stores raw input; digit comparison handles both |
| Auth token validation | Custom JWT parsing | `createClient` + `auth.getUser()` pattern (existing in n8n-relay) | Supabase client handles expiry, signature, and claims |
| Pricing data store | Database table with CRUD | Static object in edge function | Prices are locked canonical values per CLAUDE.md. No admin needs to edit them via the intake API. |
| Client deduplication logic | Fuzzy matching on name | Exact phone number match | Phone is the reliable identifier from a voice call. Name can vary ("Iron Pierce" vs "Adam Pierce"). |

**Key insight:** The leads and call_logs tables exist to record facts about calls. The quote_requests table is the hook into the existing workflow. The intake edge function is a thin orchestrator, not business logic.

---

## Common Pitfalls

### Pitfall 1: The vapi_call_logs Table Has Dangling FKs

**What goes wrong:** Migration 20260301193705 adds `customer_id uuid REFERENCES public.customers(id)` and `service_request_id uuid REFERENCES public.service_requests(id)`. These reference `customers` and `service_requests` tables which may not exist in the current schema under those exact names. The project uses `clients` (not `customers`) and `quote_requests` (not `service_requests`).

**Why it happens:** The enhancement migration was written speculatively before the exact table names were confirmed.

**How to avoid:** When adding `sentiment` and `outcome` columns in the new migration, do NOT add new FKs. Add a `lead_id uuid REFERENCES public.leads(id)` column instead, which is the correct relationship for Phase 1. The existing dangling FKs should be dropped or confirmed as valid.

**Warning signs:** `ERROR: relation "public.customers" does not exist` when running the migration.

### Pitfall 2: quote_requests Missing source_channel Column

**What goes wrong:** The admin Quote Requests page shows all rows from `quote_requests` without filtering by source. When bot-created requests arrive, Iron cannot distinguish them from website-submitted requests.

**Why it happens:** The original `quote_requests` schema was designed for the web form only.

**How to avoid:** Add a `source` column (text, default `'web'`) to `quote_requests` in a new migration. The intake edge function sets `source: 'voice_bot'` when inserting. This is non-breaking and the existing admin page continues to work without changes.

**Warning signs:** Iron opens a quote request created by the bot and is confused by the missing address/email fields (bot calls may not always collect email).

### Pitfall 3: Email Required Field in quote_requests

**What goes wrong:** The `quote_requests` table has `email text NOT NULL`. A bot call may collect phone and name but not email. The intake edge function insert will fail with a NOT NULL constraint violation.

**Why it happens:** The original form always had an email field. Voice calls may not.

**How to avoid:** In the new migration that adds `source` column, also change `email` to nullable: `ALTER TABLE public.quote_requests ALTER COLUMN email DROP NOT NULL`. This is safe because the admin page already handles null email display gracefully (renders `N/A`).

**Warning signs:** `null value in column "email" violates not-null constraint` in edge function logs.

### Pitfall 4: vapi_call_logs Missing sentiment and outcome

**What goes wrong:** INTAKE-02 requires sentiment and outcome storage. The existing table has `ended_reason` (Vapi's native field) but no `sentiment` (e.g., `positive`, `neutral`, `negative`) or `outcome` (e.g., `qualified`, `declined`, `transferred`, `voicemail`).

**Why it happens:** The earlier exploratory migration predates the v1.1 requirements.

**How to avoid:** New migration adds both columns: `sentiment text` and `outcome text`. These arrive from the Vapi end-of-call webhook analysis fields.

### Pitfall 5: N8n Calls the Intake Function Without Authorization

**What goes wrong:** n8n sends a POST to the intake edge function but doesn't include a valid auth header. The function returns 401.

**Why it happens:** n8n uses service role key via a custom header (`apikey`) not a `Bearer` token. The function may be checking for `Authorization: Bearer` when n8n sends `apikey: <service_role_key>`.

**How to avoid:** The intake function should accept the service role key via the `apikey` header OR accept it as a Bearer token. Look at how `quote-request` (the existing function) handles auth -- it uses no auth at all (public insert). The intake function needs to decide: open or authenticated. Given it writes to clients and quote_requests with elevated permissions, use the `apikey` header pattern that Supabase Edge Functions accept natively. Alternatively, add a shared secret check: `Deno.env.get('INTAKE_WEBHOOK_SECRET')` compared against an incoming `x-webhook-secret` header.

---

## Code Examples

### Complete Intake Edge Function Shape

```typescript
// Source: supabase/functions/intake-lead/index.ts (to be created)
// Pattern derived from: mission-control-api/index.ts and quote-request/index.ts

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type IntakePayload = {
  caller_name: string;
  caller_phone: string;
  caller_email?: string;
  service_type: string;      // re_basic | re_standard | re_premium | construction | commercial | inspection
  job_description: string;
  call_id: string;           // Vapi call ID for linking to vapi_call_logs
  qualification_status?: string; // qualified | declined | transferred
  sentiment?: string;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Webhook secret validation
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== Deno.env.get('INTAKE_WEBHOOK_SECRET')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body: IntakePayload = await req.json();

  // 1. Find or create client
  const { client_id, created: clientCreated } = await findOrCreateClient(supabase, body);

  // 2. Create quote request
  const { data: qr, error: qrError } = await supabase
    .from('quote_requests')
    .insert({
      name: body.caller_name,
      email: body.caller_email ?? null,
      phone: body.caller_phone,
      job_type: body.service_type,
      description: body.job_description,
      status: 'new',
      source: 'voice_bot',
    })
    .select('id')
    .single();

  if (qrError) return json({ error: qrError.message }, 500);

  // 3. Create lead record
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      client_id,
      quote_request_id: qr.id,
      call_id: body.call_id,
      source_channel: 'voice_bot',
      qualification_status: body.qualification_status ?? 'pending',
      caller_phone: body.caller_phone,
      caller_name: body.caller_name,
    })
    .select('id')
    .single();

  if (leadError) return json({ error: leadError.message }, 500);

  console.log(`Intake: client=${client_id} (new=${clientCreated}) qr=${qr.id} lead=${lead.id}`);

  return json({ success: true, quote_request_id: qr.id, lead_id: lead.id, client_id });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Complete Pricing Lookup Edge Function Shape

```typescript
// Source: supabase/functions/pricing-lookup/index.ts (to be created)
// Pattern derived from: mission-control-api/index.ts (GET handler shape)

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Canonical prices from CLAUDE.md. Do not modify without updating CLAUDE.md.
const PACKAGES: Record<string, { name: string; price: number; unit?: string; deliverables: string[] }> = {
  re_basic:     { name: 'Listing Lite',           price: 225,  deliverables: ['10 photos', 'Sky replacement', 'Next day delivery'] },
  re_standard:  { name: 'Listing Pro',            price: 450,  deliverables: ['25 photos', '60 second reel', '2D boundary overlay', '48 hour turnaround'] },
  re_premium:   { name: 'Luxury Listing',         price: 750,  deliverables: ['40+ photos', '2 minute cinematic video', 'Twilight shoot', '24 hour priority'] },
  construction: { name: 'Construction Progress',  price: 450,  unit: '/visit', deliverables: ['Orthomosaic', 'Site overview', 'Date stamped archive'] },
  commercial:   { name: 'Commercial Marketing',   price: 850,  deliverables: ['4K video', '3D model', 'Raw footage', 'Perpetual license'] },
  inspection:   { name: 'Inspection Data',        price: 1200, deliverables: ['Inspection grid photography', 'Annotated report', 'Exportable data'] },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const serviceType = url.searchParams.get('service_type');

  if (!serviceType) {
    // Return all packages if no filter
    return json({ packages: PACKAGES });
  }

  const pkg = PACKAGES[serviceType];
  if (!pkg) {
    return json({ error: `Unknown service type: ${serviceType}` }, 404);
  }

  return json({ service_type: serviceType, ...pkg });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Leads Table Migration

```sql
-- Phase 1: Intake API and Lead Tracking
-- Leads table: tracks bot-sourced prospects through the qualification funnel

CREATE TABLE IF NOT EXISTS public.leads (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,

  -- Caller identity
  caller_name         text        NOT NULL,
  caller_phone        text        NOT NULL,
  caller_email        text,

  -- Source tracking
  source_channel      text        NOT NULL DEFAULT 'voice_bot',  -- voice_bot | web | manual
  call_id             text,       -- Vapi call ID, links to vapi_call_logs.call_id

  -- Qualification state
  qualification_status text       NOT NULL DEFAULT 'pending',
  -- values: pending | qualified | declined | transferred | no_answer

  -- Links to downstream records
  client_id           uuid        REFERENCES public.clients(id),
  quote_request_id    uuid        REFERENCES public.quote_requests(id)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.leads
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_read_leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_leads_call_id
  ON public.leads (call_id) WHERE call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_client_id
  ON public.leads (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_qualification_status
  ON public.leads (qualification_status, created_at DESC);

COMMENT ON TABLE public.leads IS 'Bot-sourced prospects. Populated by intake-lead edge function. Created alongside quote_requests for every qualified call.';
```

### vapi_call_logs Additions Migration

```sql
-- Phase 1: Add sentiment and outcome to vapi_call_logs
-- INTAKE-02 requires these fields. Table already exists from 20260301191812.

ALTER TABLE public.vapi_call_logs
  ADD COLUMN IF NOT EXISTS sentiment  text,    -- positive | neutral | negative | unknown
  ADD COLUMN IF NOT EXISTS outcome    text;    -- qualified | declined | transferred | voicemail | abandoned

COMMENT ON COLUMN public.vapi_call_logs.sentiment IS 'Caller sentiment derived from Vapi call analysis. Set by n8n webhook workflow.';
COMMENT ON COLUMN public.vapi_call_logs.outcome   IS 'Call outcome classification. Set by n8n webhook workflow.';
```

### quote_requests Additions Migration

```sql
-- Phase 1: Add source tracking and relax email constraint on quote_requests
-- Required for bot-created requests that may not have caller email

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';
  -- values: web | voice_bot | manual

ALTER TABLE public.quote_requests
  ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_source
  ON public.quote_requests (source, created_at DESC);

COMMENT ON COLUMN public.quote_requests.source IS 'How this request was created: web (landing page form), voice_bot (Vapi intake), manual (admin direct entry).';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Email-based notifications only (quote-request function) | Database row creation + email (intake function) | Phase 1 | Bot requests survive email failures and appear in admin CRM |
| Web-only quote intake | Multi-channel intake with source tracking | Phase 1 | Admin can filter by source channel |

**Deprecated/outdated:**
- The `quote-request` edge function sends emails but does NOT write to the `quote_requests` database table (it only sends email). This is a known gap from the v1.0 landing page phase. The intake edge function for Phase 1 writes to the database, which is the correct pattern going forward.

---

## Open Questions

1. **vapi_call_logs dangling FKs from 20260301193705**
   - What we know: The second Vapi migration adds `customer_id REFERENCES public.customers(id)` and `service_request_id REFERENCES public.service_requests(id)`. Neither `customers` nor `service_requests` table names appear in confirmed active migrations. The project uses `clients` and `quote_requests`.
   - What's unclear: Were those FK columns actually applied to production, or did the migration fail silently? If applied, they are orphaned references.
   - Recommendation: The planner should add a Wave 0 check task to confirm `\d public.vapi_call_logs` actual column state. If the FK columns exist and reference non-existent tables, they need to be dropped in a new migration before adding the `leads` FK.

2. **`profiles` table role check in leads RLS**
   - What we know: The quotes migration uses `profiles.role = 'admin'` for admin access. The leads table admin policy should use the same pattern.
   - What's unclear: Whether `super_admin` is a valid profile role in the current system (used in the brands migration but not in quotes).
   - Recommendation: Use `profiles.role = 'admin'` only (same as quotes) for safety. Can be extended later.

3. **Webhook authentication for n8n calls**
   - What we know: n8n already uses `SUPABASE_SERVICE_ROLE_KEY` for direct Supabase HTTP calls. But when calling an edge function, n8n can either use `apikey` header or a custom secret header.
   - What's unclear: Whether the existing n8n credential setup sends the service key as `apikey` header on edge function calls.
   - Recommendation: Use a dedicated `INTAKE_WEBHOOK_SECRET` env var. This is a lightweight shared secret that avoids exposing the service role key in n8n workflow nodes. Set it in both Supabase secrets and n8n credentials.

4. **`quote-request` function vs `intake-lead` function**
   - What we know: The existing `quote-request` function only sends an email and does NOT insert into the `quote_requests` table.
   - What's unclear: Should Phase 1 also backfill the web form to write to the database?
   - Recommendation: Out of scope for Phase 1 per REQUIREMENTS.md. The new `intake-lead` function handles database writes. Web form behavior is unchanged.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read: `supabase/functions/mission-control-api/index.ts` -- edge function pattern
- Codebase direct read: `supabase/functions/n8n-relay/index.ts` -- auth and relay pattern
- Codebase direct read: `supabase/migrations/20260301191812_vapi_call_logs.sql` -- existing table schema
- Codebase direct read: `supabase/migrations/20260301193705_vapi_call_logs_enhancements.sql` -- existing enhancement migration
- Codebase direct read: `supabase/migrations/20260226000001_quote_requests.sql` and `20260227100000_repair_quote_tables.sql` -- quote_requests schema
- Codebase direct read: `supabase/migrations/20260224120000_create_clients_table.sql` -- clients table schema
- Codebase direct read: `src/pages/admin/QuoteRequests.tsx` -- how QuoteRequests page queries and renders data
- Codebase direct read: `src/pages/admin/SentinelPricing.tsx` -- canonical package codes and prices
- Codebase direct read: `CLAUDE.md` -- locked pricing values, coding guidelines, technology stack

### Secondary (MEDIUM confidence)

- Migration naming convention: observed from `ls supabase/migrations/` -- timestamp prefix + descriptive slug

### Tertiary (LOW confidence)

- None -- all findings are based on direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- every library version is confirmed from existing `index.ts` files
- Architecture: HIGH -- patterns copied directly from production edge functions in the same repo
- Pitfalls: HIGH for items 1-4 (discovered from migration inspection), MEDIUM for item 5 (n8n auth pattern needs runtime verification)
- Pricing data: HIGH -- canonical values confirmed in both CLAUDE.md and SentinelPricing.tsx constants

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- no external APIs involved in this phase, all internal patterns)
