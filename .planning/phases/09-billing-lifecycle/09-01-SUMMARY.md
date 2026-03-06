---
phase: 09-billing-lifecycle
plan: 01
subsystem: payments
tags: [square, supabase, resend, edge-functions, invoicing, email]

# Dependency graph
requires:
  - phase: 08-watermark-pipeline
    provides: preview_urls column on drone_jobs populated by n8n watermark step
  - phase: 07-payment-infra
    provides: payments table, create-deposit-invoice edge function, Square integration
provides:
  - paid enum value on drone_job_status for payment gating
  - job_id FK on payments for direct job to payment lookup
  - create-balance-invoice edge function with orphan prevention
  - send-balance-due-email edge function with watermark previews
affects: [09-billing-lifecycle, admin-ui, square-webhook]

# Tech tracking
tech-stack:
  added: []
  patterns: [supabase-insert-before-square-api, share-manually-delivery, edge-function-chaining]

key-files:
  created:
    - supabase/migrations/20260305700100_add_paid_status_and_job_id.sql
    - supabase/functions/create-balance-invoice/index.ts
    - supabase/functions/send-balance-due-email/index.ts
  modified: []

key-decisions:
  - "Insert Supabase payments row BEFORE Square API call (orphan prevention), reversing deposit function order"
  - "Use SHARE_MANUALLY delivery method to prevent Square from sending its own email"
  - "Net 15 payment terms for balance invoices (vs Net 3 for deposits)"
  - "Balance due email uses accent gold for Pay Now button to differentiate from delivery email blue CTA"

patterns-established:
  - "Orphan prevention: Supabase row first, rollback on Square failure"
  - "Edge function chaining: balance invoice triggers email via service role fetch"

requirements-completed: [BILL-02, BILL-04]

# Metrics
duration: 9min
completed: 2026-03-06
---

# Phase 9 Plan 01: Billing Foundation Summary

**Balance invoice edge function with orphan prevention pattern and branded balance due email with watermarked preview thumbnails and Square payment link**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-06T16:54:43Z
- **Completed:** 2026-03-06T17:04:04Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Migration adds 'paid' enum value to drone_job_status and job_id FK to payments table
- Balance invoice edge function creates Square invoice with Supabase row inserted BEFORE Square API call, preventing orphaned invoices
- Balance due email sends branded Sentinel email with up to 3 watermarked preview thumbnails and prominent Pay Now button

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for paid status and job_id column** - `b419416` (feat)
2. **Task 2: Balance invoice edge function with orphan prevention** - `3ddf81a` (feat)
3. **Task 3: Balance due email edge function with watermark previews** - `9fbe701` (feat)

## Files Created/Modified
- `supabase/migrations/20260305700100_add_paid_status_and_job_id.sql` - Adds paid enum value and job_id FK on payments
- `supabase/functions/create-balance-invoice/index.ts` - Balance invoice creation via Square with orphan prevention
- `supabase/functions/send-balance-due-email/index.ts` - Branded email with watermark previews and Square payment link

## Decisions Made
- Reversed insert order from deposit function: Supabase row inserted BEFORE Square API call, with rollback on failure. This prevents orphaned Square invoices that have no matching Supabase record.
- Set Square delivery_method to SHARE_MANUALLY so Square does not send its own invoice email. The branded Sentinel email via Resend is the only client communication.
- Net 15 payment terms for balance invoices (deposit uses Net 3) to give clients reasonable time after project completion.
- Used accent gold gradient for the Pay Now button to create visual urgency and differentiate from the blue View Your Deliverables button in the delivery email.

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None. Both edge functions use existing environment variables (SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT, RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Migration needs to be applied via `supabase db push`.

## Next Phase Readiness
- Balance invoice and email functions ready for deployment via `supabase functions deploy --use-api`
- Square webhook extension (Plan 02) can reference the 'paid' enum value
- Admin UI button (Plan 02) can call create-balance-invoice
- Migration must be applied before edge functions reference job_id column or paid status

## Self-Check: PASSED

---
*Phase: 09-billing-lifecycle*
*Completed: 2026-03-06*
