---
phase: 7
slug: foundation-and-quick-wins
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (configured in vite.config.ts) |
| **Config file** | vite.config.ts (test section, lines 109-113) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | EQUIP-01 | unit | `npx vitest run src/pages/admin/Accessories.spec.tsx` | No, W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | EQUIP-01 | unit | `npx vitest run src/hooks/useFleetMutations.spec.ts` | No, W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | EQUIP-02 | unit | `npx vitest run src/components/admin/AccessoryFormDialog.spec.tsx` | No, W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | EQUIP-03 | unit | `npx vitest run src/components/pilot/EquipmentSelector.spec.tsx` | No, W0 | ⬜ pending |
| 07-03-01 | 03 | 1 | BILL-01 | unit | `npx vitest run src/pages/admin/components/QuoteBuilder.spec.tsx` | No, W0 | ⬜ pending |
| 07-04-01 | 04 | 1 | DEPLOY-01 | manual | Visual inspection on device | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/pages/admin/Accessories.spec.tsx` — stubs for EQUIP-01 CRUD
- [ ] `src/hooks/useFleetMutations.spec.ts` — stubs for EQUIP-01 deletion guard
- [ ] `src/components/admin/AccessoryFormDialog.spec.tsx` — stubs for EQUIP-02 aircraft assignment
- [ ] `src/components/pilot/EquipmentSelector.spec.tsx` — stubs for EQUIP-03 filtering
- [ ] `src/pages/admin/components/QuoteBuilder.spec.tsx` — stubs for BILL-01 deposit

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA icons show Sentinel branding | DEPLOY-01 | Visual/device-specific | 1. Build production app 2. Install PWA on Android/iOS 3. Verify home screen icon is Sentinel branded PNG, not SVG placeholder |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
