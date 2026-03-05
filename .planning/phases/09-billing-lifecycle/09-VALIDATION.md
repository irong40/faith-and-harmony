---
phase: 9
slug: billing-lifecycle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 9 -- Validation Strategy

> Per phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) + manual Square sandbox testing |
| **Config file** | vite.config.ts (vitest configured) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual Square sandbox end to end test
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 09-01-01 | 01 | 1 | BILL-02 | content-check | grep for Supabase insert before Square call in edge function | pending |
| 09-01-02 | 01 | 1 | BILL-04 | content-check | grep for preview_urls and payment link in email template | pending |
| 09-01-03 | 01 | 1 | BILL-05 | content-check | grep for drone_jobs status update in webhook handler | pending |
| 09-01-04 | 01 | 1 | BILL-06, BILL-07 | content-check | grep for receipt email and delivery release in webhook | pending |
| 09-02-01 | 02 | 2 | BILL-08 | unit | `npx vitest run` PaymentsPanel tests | pending |
| 09-02-02 | 02 | 2 | BILL-02 thru BILL-08 | manual-only | Square sandbox end to end test | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Migration for 'paid' enum value on drone_job_status
- [ ] Migration for job_id column on payments table (if adopted)
- [ ] PaymentsPanel.spec.ts stub for BILL-08

*Edge function testing is manual via Square sandbox webhook testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Balance invoice creates Supabase row before Square call | BILL-02 | Edge function execution order requires runtime verification | Trigger balance invoice from admin UI, check Supabase payments row exists before Square invoice appears |
| Balance due email with previews and payment link | BILL-04 | Email rendering requires visual inspection | Trigger balance email, verify watermarked thumbnails display and Square link works |
| Webhook updates job status to paid | BILL-05 | Requires Square sandbox payment flow | Pay invoice in Square sandbox, verify drone_jobs.status = 'paid' |
| Receipt email and deliverable release | BILL-06, BILL-07 | Requires Square sandbox payment completion | After payment, verify receipt email sent and download links generated |
| Payments panel shows all states | BILL-08 | UI rendering requires visual inspection | View admin payments panel with jobs in paid, pending, and overdue states |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or are manual-only checkpoints
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
