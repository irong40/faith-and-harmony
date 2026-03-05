---
phase: 8
slug: watermark-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) + manual n8n workflow test |
| **Config file** | vite.config.ts (vitest configured) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual n8n pipeline test + visual watermark inspection
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | BILL-03 | integration | Migration test: verify bucket creation | W0 | pending |
| 08-01-02 | 01 | 1 | BILL-03 | integration | `curl` test: public preview access returns 200 | W0 | pending |
| 08-01-03 | 01 | 1 | BILL-03 | integration | `curl` test: private original access returns 400 | W0 | pending |
| 08-02-01 | 02 | 1 | BILL-03 | manual | Trigger n8n pipeline, verify watermarked files in bucket | N/A | pending |
| 08-02-02 | 02 | 1 | BILL-03 | manual-only | Visual inspection: watermark visible and not croppable | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Migration test: verify `watermark-previews` bucket creation succeeds
- [ ] Migration test: verify `drone-jobs` bucket reverts to private without breaking service role access
- [ ] Integration test script: curl commands to verify public/private access patterns after migrations

*Existing vitest infrastructure covers unit test needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Watermark visible and cannot be cropped out | BILL-03 | Watermark coverage is a visual quality judgment, not automatable | 1. Trigger pipeline on a test job. 2. Download preview from `watermark-previews` bucket. 3. Verify tiled diagonal "SENTINEL AERIAL" text covers entire image at 30-40% opacity. 4. Attempt to crop to usable photo without watermark. Must fail. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
