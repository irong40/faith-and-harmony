---
phase: 11
slug: standalone-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | vite.config.ts (inline test config) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | DEPLOY-02 | manual | Visit trestle.sentinelaerial.com, verify PWA install prompt | N/A | ⬜ pending |
| 11-01-02 | 01 | 1 | DEPLOY-03 | manual | Test login/signup/reset at new domain | N/A | ⬜ pending |
| 11-02-01 | 02 | 2 | DEPLOY-04 | manual | Square test event from Developer Console | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files needed — all verification is manual deployment testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA loads at subdomain and is installable | DEPLOY-02 | Requires live Vercel deployment + DNS propagation | 1. Visit trestle.sentinelaerial.com 2. Verify page loads 3. Check PWA install prompt appears on mobile |
| Auth login/signup/reset works at subdomain | DEPLOY-03 | Requires Supabase auth redirect allowlist configured | 1. Navigate to login page 2. Test login flow 3. Test signup flow 4. Test password reset |
| Square production webhook processes payments | DEPLOY-04 | Requires Square production environment + webhook registration | 1. Send test event from Square Developer Console 2. Verify webhook endpoint receives event 3. Verify payment status updates in database |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
