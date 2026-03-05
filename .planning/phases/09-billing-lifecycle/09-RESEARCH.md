# Phase 9: Billing Lifecycle - Research

**Researched:** 2026-03-05
**Domain:** Square Invoices API, Supabase Edge Functions, Resend email delivery, React admin UI
**Confidence:** HIGH

## Summary

Phase 9 builds the complete balance billing lifecycle on top of existing infrastructure. The payments table, Square webhook with HMAC validation, and deposit invoice edge function already exist and provide proven patterns to follow. The watermark pipeline from Phase 8 populates `preview_urls` on drone_jobs, giving the balance due email its thumbnail content.

The core work breaks into five functional areas. Balance invoice creation (edge function + admin UI button), balance due email with watermarked previews and Square payment link, webhook completion (job status update + receipt + delivery trigger), receipt email edge function, and an admin payments panel component. Every new edge function follows the same Deno + CORS + serve() + Resend pattern already used across 40+ functions in this project.

**Primary recommendation:** Model the balance invoice edge function on create-deposit-invoice but fix the insert order (Supabase row BEFORE Square API call) and accept job_id instead of quote_id since balance invoicing happens after processing, not during quoting.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-02 | Admin can trigger balance invoice creation via Square after job processing completes | Create balance invoice edge function modeled on create-deposit-invoice. Add button to DroneJobDetail page. Insert Supabase payments row BEFORE Square API call. |
| BILL-04 | Client receives balance due email with 2 to 3 watermarked preview thumbnails and Square payment link | New edge function using Resend. Read preview_urls from drone_jobs. Include Square public_url from invoice. Use Sentinel branding from drone-delivery-email BRAND object. |
| BILL-05 | Square webhook processes balance payment confirmation and triggers receipt and delivery | Extend existing square-webhook to update drone_jobs.status to 'paid', then invoke receipt email and delivery email edge functions. |
| BILL-06 | Client receives receipt email after balance payment clears | New edge function using Resend with Sentinel branding. Triggered by square-webhook after balance payment confirmed. |
| BILL-07 | Full resolution deliverables release automatically after balance payment confirmed | Square webhook calls drone-delivery-email (already exists) after marking payment as paid. This gates delivery on payment. |
| BILL-08 | Admin payments panel shows deposit and balance status per job with paid, pending, and overdue states | New React component querying payments table joined with drone_jobs. Status badges for paid/pending/overdue. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions | Deno std@0.190.0 | Balance invoice, balance due email, receipt email | All 40+ edge functions use this pattern |
| Square Invoices API | v2 (2024-01-18) | Invoice creation and publishing | Already used by create-deposit-invoice |
| Resend | npm:resend@2.0.0 | Email delivery (balance due, receipt) | Already used by drone-delivery-email |
| React + TanStack Query | v5 | Admin payments panel | Standard pattern across all admin pages |
| shadcn/ui | latest | UI components (Badge, Table, Card) | Project standard component library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | existing | Date formatting in payment panel | Already in project dependencies |
| lucide-react | existing | Icons for payment status badges | Already in project dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate receipt edge function | Inline in square-webhook | Separate function is testable and reusable. Webhook should stay lean. |
| Direct drone-delivery-email call from webhook | New delivery gate function | drone-delivery-email already does everything needed. Just call it from the webhook. |

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
  create-balance-invoice/index.ts    # NEW: balance invoice via Square
  send-balance-due-email/index.ts    # NEW: email with previews + pay link
  send-payment-receipt-email/index.ts # NEW: receipt after payment
  square-webhook/index.ts            # MODIFY: add job status + trigger chain
  drone-delivery-email/index.ts      # EXISTING: delivery (called by webhook)
  create-deposit-invoice/index.ts    # EXISTING: reference pattern

src/pages/admin/
  DroneJobDetail.tsx                 # MODIFY: add balance invoice button
  components/
    PaymentsPanel.tsx                # NEW: deposit/balance status per job
```

### Pattern 1: Supabase Row Before Square API Call (Orphan Prevention)
**What:** Insert the payments row with status 'pending' and square_invoice_id as NULL before calling Square. Update the row with the Square invoice ID after the API succeeds. If Square fails, delete or mark the row as failed.
**When to use:** Every time a payment row corresponds to an external API call.
**Example:**
```typescript
// Step 1: Insert pending payment row
const { data: payment, error: insertError } = await supabase
  .from("payments")
  .insert({
    quote_id,
    payment_type: "balance",
    status: "pending",
    amount: balanceAmount,
    customer_email: email,
    due_date: futureDateStr(15), // Net 15
  })
  .select("id")
  .single();

// Step 2: Create Square invoice
const createResp = await fetch(`${SQUARE_BASE}/v2/invoices`, { ... });

if (!createResp.ok) {
  // Rollback: delete the pending row
  await supabase.from("payments").delete().eq("id", payment.id);
  return errorResponse(502, "Square invoice creation failed");
}

// Step 3: Update row with Square IDs
await supabase.from("payments")
  .update({
    square_invoice_id: squareInvoice.id,
    square_invoice_url: publishedInvoice.public_url,
  })
  .eq("id", payment.id);
```

### Pattern 2: Webhook Trigger Chain
**What:** After marking payment as paid, the square-webhook invokes downstream edge functions (receipt email, delivery email) using Supabase service role fetch calls.
**When to use:** When a webhook needs to trigger follow-on actions.
**Example:**
```typescript
// After payment marked as paid in square-webhook
if (payment.payment_type === "balance") {
  // Update drone_jobs.status to 'paid'
  const { data: job } = await supabase
    .from("drone_jobs")
    .select("id")
    .eq("quote_id", payment.quote_id)
    .maybeSingle();

  if (job) {
    await supabase.from("drone_jobs")
      .update({ status: "paid" })
      .eq("id", job.id);

    // Trigger receipt email
    await fetch(`${SUPABASE_URL}/functions/v1/send-payment-receipt-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: job.id, payment_id: payment.id }),
    });

    // Trigger delivery (releases full resolution files)
    await fetch(`${SUPABASE_URL}/functions/v1/drone-delivery-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: job.id }),
    });
  }
}
```

### Pattern 3: Sentinel Branded Email Template
**What:** All Sentinel emails use the same BRAND object and HTML structure from drone-delivery-email.
**When to use:** Balance due email, receipt email.
**Example:**
```typescript
const BRAND = {
  navy: "#0f1e36",
  sky: "#3b82f6",
  accent: "#f59e0b",
  light: "#f0f4f8",
  companyName: "Sentinel Aerial Inspections",
  tagline: "Veteran-Owned Aerial Services — Hampton Roads, VA",
  email: "deliveries@sentinelaerialinspections.com",
  website: "sentinelaerialinspections.com",
  location: "Hampton Roads, Virginia",
};
```

### Anti-Patterns to Avoid
- **Square API call before Supabase insert:** The existing create-deposit-invoice does this (lines 162 vs 216). The balance invoice function MUST reverse the order.
- **Embedding delivery logic in the webhook:** The webhook should call existing edge functions, not duplicate email/delivery logic inline.
- **Adding a 'paid' status to drone_job_status without a migration:** The enum needs `ALTER TYPE drone_job_status ADD VALUE IF NOT EXISTS 'paid' AFTER 'complete'` in a new migration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | SMTP client | Resend (npm:resend@2.0.0) | Already integrated, handles bounces, tracking |
| Invoice creation | Custom payment forms | Square Invoices API | Handles PCI compliance, payment processing, receipts |
| HMAC webhook validation | Custom crypto | Existing validateSquareSignature function | Already proven in square-webhook |
| Watermarked preview thumbnails | Runtime generation | preview_urls column on drone_jobs | Phase 8 pipeline generates these during processing |
| Delivery email with download links | New delivery function | drone-delivery-email edge function | Already handles all delivery logic with tokens |

**Key insight:** The balance billing lifecycle connects existing pieces (Square API, Resend, webhook, delivery email) rather than building from scratch. The work is primarily wiring and a few new edge functions.

## Common Pitfalls

### Pitfall 1: Missing 'paid' enum value on drone_job_status
**What goes wrong:** Attempting to set drone_jobs.status = 'paid' fails because the enum does not include that value.
**Why it happens:** The original enum (intake, scheduled, captured, uploaded, processing, qa, revision, delivered, cancelled) plus later additions (review_pending, complete, failed, ingested) never included 'paid'.
**How to avoid:** Create a migration adding 'paid' to drone_job_status before any code references it.
**Warning signs:** Supabase update silently fails or throws a type error.

### Pitfall 2: payments.quote_id vs drone_jobs.quote_id join path
**What goes wrong:** The balance invoice edge function needs job_id (admin clicks from job detail page), but payments table references quote_id.
**Why it happens:** The payments table was designed around the quote lifecycle. Balance invoicing happens from the job context.
**How to avoid:** Accept job_id in the balance invoice function. Look up the quote_id from drone_jobs.quote_id. Alternatively, add a job_id column to the payments table for direct linking.
**Warning signs:** The admin UI cannot find payments for a given job.

### Pitfall 3: Square invoice public_url availability
**What goes wrong:** The public_url field is NULL on the invoice object returned by CreateInvoice. It only appears after PublishInvoice.
**Why it happens:** Square generates the payment link during publishing, not creation.
**How to avoid:** Use the published invoice response (not the created invoice response) when storing the payment URL.
**Warning signs:** Balance due email has a NULL payment link.

### Pitfall 4: Webhook edge function calling other edge functions
**What goes wrong:** The receipt email or delivery email call fails because of missing authorization headers or incorrect URL construction.
**Why it happens:** Edge functions calling other edge functions need to use the service role key for authorization, and the URL must use SUPABASE_URL environment variable.
**How to avoid:** Use the pattern `fetch(\`${SUPABASE_URL}/functions/v1/function-name\`, { headers: { Authorization: \`Bearer ${SUPABASE_SERVICE_ROLE_KEY}\` } })`.
**Warning signs:** 401 or 404 errors in webhook logs after payment processing.

### Pitfall 5: Balance amount calculation
**What goes wrong:** Balance amount calculated incorrectly because deposit was 25% in old code but is now 50%.
**Why it happens:** The deposit amount was changed from 25% to 50% in Phase 7. Balance = total - deposit.
**How to avoid:** Always calculate balance as `quote.total - quote.deposit_amount` (the deposit_amount column stores the actual dollar amount, not a percentage).
**Warning signs:** Balance invoice amount does not match expected remainder.

## Code Examples

### Balance Invoice Edge Function (core logic)
```typescript
// Source: Modeled on create-deposit-invoice/index.ts with insert-order fix
// Accept job_id, look up quote, calculate balance, insert row, then call Square

const { data: job } = await supabase
  .from("drone_jobs")
  .select("id, quote_id, job_price, preview_urls")
  .eq("id", job_id)
  .single();

const { data: quote } = await supabase
  .from("quotes")
  .select("id, total, deposit_amount, quote_requests(name, email, job_type)")
  .eq("id", job.quote_id)
  .single();

const balanceAmount = Number(quote.total) - Number(quote.deposit_amount);
const balanceAmountCents = Math.round(balanceAmount * 100);
```

### Balance Due Email Preview Thumbnails
```typescript
// Source: preview_urls column from 20260305600200_preview_urls_column.sql
// preview_urls is TEXT[] on drone_jobs, populated by n8n watermark step

const previewHtml = (job.preview_urls || []).slice(0, 3).map((url: string) =>
  `<img src="${url}" alt="Preview" style="width: 180px; border-radius: 8px; margin: 4px;" />`
).join("");
```

### Admin Payments Panel Query
```typescript
// Source: payments migration 20260226120000
// Join payments with drone_jobs via quote_id

const { data: payments } = await supabase
  .from("payments")
  .select(`
    id, payment_type, status, amount, paid_at, due_date,
    square_invoice_url, customer_email,
    quotes!inner(
      id,
      drone_jobs(id, property_address, status)
    )
  `)
  .order("created_at", { ascending: false });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase row after Square call | Supabase row BEFORE Square call | Phase 9 requirement | Prevents orphaned invoices |
| Manual delivery trigger | Automatic delivery on balance payment | Phase 9 | Removes admin bottleneck |
| Legacy invoices table | payments table with deposit/balance enum | Migration 20260226120000 | Proper dual-row billing model |

**Deprecated/outdated:**
- send-service-invoice-email: Generic Faith & Harmony invoice email. NOT for Sentinel billing. Do not use.
- src/pages/admin/Invoices.tsx: Legacy invoices page using old invoices table. The new admin payments panel queries the payments table.

## Open Questions

1. **Should payments table get a job_id column?**
   - What we know: Currently payments references quote_id. drone_jobs also has quote_id. The join works but is indirect.
   - What's unclear: Whether adding job_id creates a denormalization problem or simplifies queries enough to justify it.
   - Recommendation: Add job_id to payments table. The admin UI queries by job and the webhook needs to find the job. A direct FK eliminates the two-hop join through quotes. Add it in a Wave 0 migration.

2. **drone_job_status enum: where does 'paid' fit in the lifecycle?**
   - What we know: Current values in order: intake, scheduled, captured, uploaded, ingested, processing, review_pending, complete, qa, revision, delivered, failed, cancelled.
   - What's unclear: Whether 'paid' should come after 'complete' (before delivery) or after 'delivered'.
   - Recommendation: Add 'paid' after 'complete'. The lifecycle becomes: complete (processing done) -> paid (balance received) -> delivered (files sent). This is logical because delivery is gated on payment.

3. **Should the balance due email be sent by the edge function or by Square?**
   - What we know: Square can send invoice emails natively (delivery_method: "EMAIL"). The project also sends custom branded emails via Resend.
   - What's unclear: Whether to let Square send its own invoice email (simpler) and separately send a branded preview email via Resend (better UX).
   - Recommendation: Send the branded balance due email via Resend with previews AND the Square payment link. Set Square delivery_method to "SHARE_MANUALLY" to prevent Square from also emailing. This gives full control over branding and preview content.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing in project) |
| Config file | vite.config.ts (vitest config section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-02 | Balance invoice creation inserts Supabase row before Square call | unit | Manual verification via edge function logs | No, Wave 0 |
| BILL-04 | Balance due email includes preview thumbnails and payment link | unit | `npx vitest run src/components/drone/PaymentsPanel.spec.ts -t "balance"` | No, Wave 0 |
| BILL-05 | Webhook updates drone_jobs status to paid | integration | Manual Square sandbox test | No |
| BILL-06 | Receipt email sent after balance payment | integration | Manual Square sandbox test | No |
| BILL-07 | Deliverables released after payment | integration | Manual Square sandbox test | No |
| BILL-08 | Payments panel shows deposit/balance per job | unit | `npx vitest run src/components/drone/PaymentsPanel.spec.ts` | No, Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `src/components/drone/PaymentsPanel.spec.ts` covers BILL-08 (admin panel renders states)
- [ ] Edge function testing is manual via Square sandbox webhook testing
- [ ] Migration for 'paid' enum value and optional job_id column on payments

## Sources

### Primary (HIGH confidence)
- Existing codebase: create-deposit-invoice/index.ts, square-webhook/index.ts, drone-delivery-email/index.ts
- Existing migration: 20260226120000_payments.sql (payments table schema)
- Existing migration: 20260305600200_preview_urls_column.sql (preview_urls on drone_jobs)
- Existing migration: 20260305300000_quote_to_drone_job.sql (quote_id FK on drone_jobs)
- Square Invoices API docs: https://developer.squareup.com/docs/invoices-api/overview

### Secondary (MEDIUM confidence)
- Square public_url behavior: https://developer.squareup.com/docs/invoices-api/walkthrough (confirmed public_url appears after PublishInvoice)

### Tertiary (LOW confidence)
- None. All findings verified against existing codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. All libraries already in use across the project.
- Architecture: HIGH. Follows proven patterns from existing edge functions and the deposit invoice flow.
- Pitfalls: HIGH. Identified from direct code inspection of existing functions and schema.

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable, all APIs are established)
