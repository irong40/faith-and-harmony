---
phase: 8
slug: watermark-pipeline
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-05
---

# Phase 8 -- Validation Strategy

> Per phase validation contract for feedback sampling during execution.

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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 08-01-01 | 01 | 1 | BILL-03 | content-check | `grep -l 'watermark-previews' supabase/migrations/*watermark*` + `grep -l 'public = false' supabase/migrations/*private_bucket*` + `grep -l 'preview_urls' supabase/migrations/*preview_urls*` | pending |
| 08-01-02 | 01 | 1 | BILL-03 | grep-check | `grep -rn 'storage/v1/object/public/drone-jobs' src/ \| wc -l` returns 0 | pending |
| 08-02-01 | 02 | 2 | BILL-03 | file-check | `test -f assets/watermark-tile.png` + PNG magic byte validation | pending |
| 08-02-02 | 02 | 2 | BILL-03 | content-check | `grep -c 'watermark' n8n-workflows/wf1-sentinel-pipeline-orchestrator.json` returns > 0 | pending |
| 08-02-03 | 02 | 2 | BILL-03 | manual-only | Visual inspection of watermark quality and n8n pipeline structure | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Wave 0 test infrastructure is addressed inline within plan task `<verify>` blocks rather than as separate test files, because this phase produces SQL migrations and JSON configuration rather than testable application code.

- [x] Migration content verification: grep checks for key SQL tokens ('watermark-previews', 'public = false', 'preview_urls TEXT[]') built into Plan 01 Task 1 automated verify
- [x] Private bucket verification: grep check for zero references to public drone-jobs URLs built into Plan 01 Task 2 automated verify
- [x] Pipeline content verification: grep checks for watermark node references built into Plan 02 Task 2 automated verify

Integration tests (curl commands against live Supabase after migration apply) are covered by the Plan 02 checkpoint where the user applies migrations and verifies bucket access patterns in the Supabase dashboard.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Watermark visible and cannot be cropped out | BILL-03 | Watermark coverage is a visual quality judgment, not automatable | 1. Trigger pipeline on a test job. 2. Download preview from `watermark-previews` bucket. 3. Verify tiled diagonal "SENTINEL AERIAL" text covers entire image at 30 to 40% opacity. 4. Attempt to crop to usable photo without watermark. Must fail. |
| Watermark tile deployed to processing rig | BILL-03 | Requires SSH/file copy to physical machine | Copy `assets/watermark-tile.png` to `/opt/sentinel/assets/watermark-tile.png` on the rig. Verify path matches the n8n Execute Command node reference. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are manual-only checkpoints
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all verification needs (inline grep checks)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
