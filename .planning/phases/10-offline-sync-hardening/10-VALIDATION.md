---
phase: 10
slug: offline-sync-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SYNC-04 | unit | `npx vitest run src/lib/sync/network-probe.spec.ts` | No, W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | SYNC-01 | unit | `npx vitest run src/lib/sync/db.spec.ts` | No, W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | SYNC-01 | unit | `npx vitest run src/lib/sync/sync-engine.spec.ts` | No, W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | SYNC-04 | unit | `npx vitest run src/lib/sync/sync-engine.spec.ts` | No, W0 | ⬜ pending |
| 10-02-03 | 02 | 1 | SYNC-03 | unit | `npx vitest run src/lib/sync/sync-engine.spec.ts` | No, W0 | ⬜ pending |
| 10-03-01 | 03 | 1 | SYNC-02 | unit | `npx vitest run src/components/pilot/DeadLetterBanner.spec.tsx` | No, W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/sync/network-probe.spec.ts` — stubs for SYNC-04 network probe
- [ ] `src/lib/sync/db.spec.ts` — stubs for dead letter store CRUD (SYNC-01)
- [ ] `src/lib/sync/sync-engine.spec.ts` — stubs for SYNC-01 dead letter, SYNC-03 offline queue, SYNC-04 navigator.onLine removal
- [ ] `src/components/pilot/DeadLetterBanner.spec.tsx` — stubs for SYNC-02 warning banner
- [ ] Install `fake-indexeddb` as dev dependency for IndexedDB mocking

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
