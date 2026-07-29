# Session Handoff
**Date:** 2026-07-28
**Project:** faith-and-harmony (CRM/web app)
**Branch:** `main` = production `08edc02`, clean, pushed, local == origin

> ⚠️ **This repo was worked from two sessions on 2026-07-28.** This session shipped the
> redesign merge, the QA-gate fix, the ReportBuilder scroll fix and the Paula pricing fix;
> a parallel COO session then reconciled `dev` into `main` (`c6e1f06` → `c0f8d42`). Both
> sets of commits are in `main`. Verify with `git log`, not with either session's notes.

## Accomplished (this session)

- **Admin portal redesign, option A** — split into `redesign/admin-portal-ui` (merged,
  `b254013`) and `redesign/revenue-chain` (parked). `Projects` and `Invoices` deleted: both
  queried tables that do not exist and threw on mount.
- **Wildlife Census QA gate** (`8161df9`) — `qa_threshold` was 1, so the gate passed every
  score. The `20260416130000` seed wrote `0.75` (a 0-1 fraction) into an integer percent
  column and Postgres rounded it. Fixed to 75, template deactivated, `CHECK (30..100)` added.
- **ReportBuilder dead scroll** (`9e9dfae`) — 6567px document in a 911px viewport, zero
  internally-scrolling panes, Save 2888px above the fold, with a class chain that was correct
  at every level. `min-h-screen` is a FLOOR, not a bound. Fixed on the shell root; re-measured
  on production.
- **Paula quoting a nonexistent package** (`02a7a78`) — `get_package_pricing` answered from a
  March-era hardcoded map and said "Inspection Data, twelve hundred dollars" for work the live
  catalogue prices at 0 (quote-based). Now reads `drone_packages` live. Deployed and verified
  against the live function with 6 payloads.
- **Stale comment corrected** (`08edc02`) — the dev reconciliation left ReportBuilder asserting
  the shell is `min-h-screen`. No behaviour change, but it stated the exact false belief that
  caused the original bug.

## Landed by the parallel COO session (verify independently)

- `c6e1f06` / `c0f8d42` — `dev` reconciled into the redesigned `main`, deployed. Per its notes:
  1 real conflict (DeliveryReview), 6 identical add/add migration mirrors, and a **silent
  auto-merge landmine** — both branches implemented `job_price` at intake independently, and
  the merged schema carried a duplicate key that flipped the field required and broke 7 tests.
  Resolved by keeping main's tested slice-5 version. `dev` fast-forwarded; branches unified.
- The `adiat_roof` / `adiat_insurance` sortie-key gap is reported closed on the desktop side.

## Next Steps

1. **Land the revenue chain** (`redesign/revenue-chain` @ `9d1fa75`) — the largest open item.
   Billing does not work: `payments` has 0 rows and a job reached `delivered` without one.
2. **Dependabot** — 5 vulns (3 high), open branches including major-version bumps.
3. **Single source of truth for pricing** — the six figures live in four places
   (`drone_packages`, `SentinelPricing.tsx`, the sentinel-landing site, Paula's prompt
   ballpark). Only the Vapi handler reads live.
4. **[ADAM]** Confirm which tools are attached to Vapi assistant
   `703d9226-e5ef-439f-a60e-c05b995ad6da`. No Vapi credential exists in `n8n/.env` or
   `apikeys.txt`, so it cannot be checked from a session. The handler fix is safe either way.
5. Re-verify the merged `DeliveryReview` and `JobIntake` in a browser — they were the conflict
   and the landmine respectively, and both were resolved by another session's judgement.

## Known Issues

- `supabase db reset` is unreplayable — aborts at `profiles` idx 33 and
  `vegetation_detections` idx 84. Neither table is created by any migration.
- `intake-lead` writes `customer_id` with no `client_id`. Blocks retiring `customers`, and is
  why the `customers`→`clients` edge-function sweep was reverted this session.
- Two migrations in live history with no local file: `20260727230414`, `20260727230943`.
- `DJ-2026-0003` has `is_test = false` despite being the seed's own test fixture.
- `handleLookupCustomer` carries 18 type errors — `createClient` called with no schema
  generic, so the schema infers as `never`. Pre-existing, untouched.
- Carried from 2026-06-09 and still open: public packages are old-model relative to the trestle
  engine's $350 floor (Listing Lite is $225). Business decision, not a bug.

## Key Decisions

- **Split over a third remediation round.** Certification returned 9 blocking findings, but
  most were pre-existing production defects the audit surfaced, not redesign defects.
- **CHECK floor is 30, not 1.** A naive `1..100` range would not have caught the original bug,
  since 0.75 rounds to 1 and sits inside it.
- **No literal prices in the Vapi handler, ever.** A failed query hands off to a callback
  rather than falling back to a hardcoded number.
- **jsdom cannot verify layout.** The ReportBuilder chain was class-correct at every level and
  still broken. Layout defects need a real browser.
- **`npm run typecheck` was vacuous** (tsconfig with `"files": []`, exit 0 having compiled
  nothing). Every prior green typecheck in this repo meant nothing. Real count is 38.

## Gates (re-run on the merged HEAD `08edc02`, not inherited)

| Gate | Result |
|---|---|
| Tests | 393 passed / 33 files |
| Typecheck | 38 errors — unchanged from pre-merge |
| Build | OK (5.54s); rollup chunking warning is pre-existing |
| Scroll invariant | no `min-h-screen` in any admin className — only comments and spec guards |
| Paula handler | live `drone_packages` read intact; no price literal survives the merge |

## Uncommitted Changes

None tracked. Untracked and deliberately left alone: `supabase/functions/checklist-emails/`
(off-limits this session), `deno.lock` (generated by running the Deno tests).
