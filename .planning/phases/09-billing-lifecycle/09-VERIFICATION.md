---
phase: 09-billing-lifecycle
verified: 2026-03-05T20:00:00Z
status: gaps_found
score: 0/5 must-haves verified
gaps:
  - truth: "Admin triggers balance invoice creation from the job detail page, and the Supabase payments row is created before the Square invoice API call"
    status: failed
    reason: "No balance invoice creation exists. The create-deposit-invoice edge function handles deposits only. The DroneJobDetail page has zero invoice or payment UI. The payments row is inserted AFTER the Square API call (line 216 vs line 162 in create-deposit-invoice), violating the orphan prevention requirement."
    artifacts:
      - path: "supabase/functions/create-deposit-invoice/index.ts"
        issue: "Handles deposits only, not balance invoices. Supabase insert happens after Square call (step 3 after step 1), not before."
      - path: "src/pages/admin/DroneJobDetail.tsx"
        issue: "No balance invoice button, no payment panel, no billing UI of any kind."
    missing:
      - "Edge function to create balance invoices (separate from deposit)"
      - "Balance invoice button on job detail page triggered after processing completes"
      - "Payments row must be inserted BEFORE Square API call to prevent orphaned invoices"
  - truth: "Client receives a balance due email with 2 to 3 watermarked preview thumbnails and a Square payment link"
    status: failed
    reason: "No balance due email function exists. The send-service-invoice-email function is a generic Faith and Harmony invoice email with no watermarked preview thumbnails, no Square payment link, and no Sentinel branding. No edge function combines watermark preview URLs with a Square payment link."
    artifacts:
      - path: "supabase/functions/send-service-invoice-email/index.ts"
        issue: "Generic invoice email for Faith and Harmony services. No watermark previews. No Square payment link. Wrong brand."
    missing:
      - "Balance due email edge function that includes watermarked preview thumbnails from the watermark-previews bucket"
      - "Square payment link inclusion in balance due email"
      - "Sentinel Aerial Inspections branding on balance due email"
  - truth: "When client pays balance via Square, webhook processes payment and job status updates to paid within seconds"
    status: partial
    reason: "The square-webhook edge function exists and correctly processes invoice.payment_made events, marks payments as paid with HMAC signature validation and idempotency. However, it does NOT update the drone_jobs status to paid. Line 182 contains a TODO comment acknowledging this gap."
    artifacts:
      - path: "supabase/functions/square-webhook/index.ts"
        issue: "Marks payment row as paid but does not update drone_jobs.status. Contains TODO on line 182 for receipt email trigger."
    missing:
      - "drone_jobs.status update to 'paid' when balance payment confirmed"
      - "Connection between payments table and drone_jobs status lifecycle"
  - truth: "Client receives receipt email after balance payment clears, and full resolution deliverables are released automatically"
    status: failed
    reason: "No receipt email function exists. No automatic deliverable release logic exists. The square-webhook explicitly marks this as TODO on line 182. The drone-delivery-email function exists but is a manual trigger for delivery, not an automatic post-payment release."
    artifacts:
      - path: "supabase/functions/square-webhook/index.ts"
        issue: "Line 182 TODO: receipt email and delivery trigger not implemented"
      - path: "supabase/functions/drone-delivery-email/index.ts"
        issue: "Manual delivery email, not triggered by payment. Does not gate on payment status."
    missing:
      - "Receipt email edge function triggered by square-webhook after balance payment"
      - "Automatic deliverable release (download links sent) after balance payment confirmed"
      - "Payment gate on delivery: deliverables should not release until balance is paid"
  - truth: "Admin payments panel shows deposit and balance status per job with paid, pending, and overdue states"
    status: failed
    reason: "No admin payments panel exists. The admin Invoices page (src/pages/admin/Invoices.tsx) operates on the legacy invoices table, not the payments table. It shows Faith and Harmony generic invoices, not Sentinel deposit and balance tracking per drone job."
    artifacts:
      - path: "src/pages/admin/Invoices.tsx"
        issue: "Uses legacy invoices table, not the payments table. No deposit/balance dual-row view. No per-job payment status."
    missing:
      - "Admin payments panel component showing deposit and balance rows per job"
      - "Status badges for paid, pending, and overdue states using the payment_status enum"
      - "Link between payments panel and drone_jobs for per-job billing overview"
---

# Phase 9: Billing Lifecycle Verification Report

**Phase Goal:** The complete billing flow works end-to-end from balance invoice through payment to automatic receipt and deliverable release
**Verified:** 2026-03-05T20:00:00Z
**Status:** gaps_found
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin triggers balance invoice creation from the job detail page, Supabase row created before Square call | FAILED | No balance invoice function. create-deposit-invoice is deposit only. DroneJobDetail has no billing UI. Insert order is wrong (after Square call). |
| 2 | Client receives balance due email with watermarked preview thumbnails and Square payment link | FAILED | No balance due email function exists. send-service-invoice-email is wrong brand, no previews, no Square link. |
| 3 | Client pays balance via Square, webhook processes payment, job status updates to paid | FAILED | square-webhook marks payment row paid but does NOT update drone_jobs.status. TODO comment on line 182 acknowledges missing receipt/delivery trigger. |
| 4 | Client receives receipt email after payment, deliverables released automatically | FAILED | No receipt email function. No automatic delivery release. square-webhook has TODO for this. drone-delivery-email is manual only. |
| 5 | Admin payments panel shows deposit and balance status per job | FAILED | No payments panel. Invoices page uses legacy invoices table, not payments table. No per-job deposit/balance view. |

**Score:** 0/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| Balance invoice edge function | Creates balance invoice via Square after job processing | MISSING | Only deposit invoice function exists |
| Balance due email function | Sends email with watermark previews and Square link | MISSING | No function found |
| square-webhook drone_jobs update | Updates job status to paid | STUB | Webhook processes payment but TODO for status update |
| Receipt email function | Sends receipt after balance payment | MISSING | No function found |
| Delivery gate / auto-release | Releases deliverables after payment confirmed | MISSING | No payment gate logic anywhere |
| Admin payments panel | Shows deposit/balance status per job | MISSING | Only legacy invoices page exists |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DroneJobDetail | create-balance-invoice | Button click + fetch | NOT_WIRED | No balance invoice button in UI |
| Balance invoice | Balance due email | Edge function call | NOT_WIRED | Neither function exists |
| square-webhook | drone_jobs.status | Supabase update | NOT_WIRED | TODO on line 182, no status update |
| square-webhook | receipt email | Edge function call | NOT_WIRED | TODO on line 182 |
| square-webhook | deliverable release | Edge function call | NOT_WIRED | No auto-release logic |
| payments table | Admin UI | React Query | NOT_WIRED | No admin panel queries payments table |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BILL-02 | None | Admin can trigger balance invoice creation via Square after job processing completes | BLOCKED | No balance invoice function or UI trigger |
| BILL-04 | None | Client receives balance due email with watermarked previews and Square payment link | BLOCKED | No balance due email function |
| BILL-05 | None | Square webhook processes balance payment and triggers receipt and delivery | BLOCKED | Webhook marks payment paid but does not trigger receipt or delivery |
| BILL-06 | None | Client receives receipt email after balance payment clears | BLOCKED | No receipt email function |
| BILL-07 | None | Full resolution deliverables release automatically after balance payment confirmed | BLOCKED | No payment gate or auto-release logic |
| BILL-08 | None | Admin payments panel shows deposit and balance status per job | BLOCKED | No payments panel UI |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| supabase/functions/square-webhook/index.ts | 182 | TODO: receipt email and delivery trigger not implemented | BLOCKER | Payment webhook processes correctly but does not complete the lifecycle |
| supabase/functions/create-deposit-invoice/index.ts | 216 | Payments row inserted after Square API call | WARNING | Contradicts Success Criterion 1 requirement to create Supabase row first |

### Human Verification Required

None applicable. All five truths fail at the code existence level before reaching human verification needs.

### Gaps Summary

Phase 9 has not been started. The ROADMAP.md confirms "0/? plans" and "Not started" status. The infrastructure from earlier phases provides a foundation:

1. The payments table (migration 20260226120000) exists with the correct schema including payment_type enum (deposit/balance), payment_status enum (pending/paid/overdue/waived), Square integration columns, and an overdue detection cron job.

2. The create-deposit-invoice edge function handles deposit invoicing via Square but inserts the Supabase row after the Square call rather than before.

3. The square-webhook edge function processes invoice.payment_made events with proper HMAC validation and idempotency but stops at marking the payment row as paid without updating job status or triggering downstream actions.

4. The watermark preview infrastructure from Phase 8 (bucket, column) exists and the n8n pipeline has a watermark preview step, providing the inputs needed for balance due emails.

The entire balance lifecycle (balance invoice creation, balance due email with previews, receipt email, automatic delivery release, and admin payments panel) remains unbuilt.

---

_Verified: 2026-03-05T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
