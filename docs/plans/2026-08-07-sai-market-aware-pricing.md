# SAI Market-Aware Pricing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace SAI's markup-only estimator and duplicated public prices with a Supabase-backed, market-aware quoting system that protects true gross margin and gates unavailable services.

**Architecture:** Supabase stores canonical pricing rules and exposes a customer-safe view. Pure TypeScript and Python calculation layers apply the same cost-floor and market-price formula, while the admin calculator, voice assistant, and marketing site consume the catalog with deterministic fallbacks for offline/build availability.

**Tech Stack:** React 18, TypeScript, Vitest, Supabase/Postgres/Deno Edge Functions, Python `unittest`, Next.js 16, ESLint

---

## Repository and Gate Notes

- Internal worktree: `C:\Users\redle.SOULAAN\.config\superpowers\worktrees\faith-and-harmony\sai-pricing-redesign`
- Marketing worktree: `C:\Users\redle.SOULAAN\.config\superpowers\worktrees\sentinel-landing\sai-pricing-redesign`
- Never edit an existing applied migration.
- Do not push, merge, deploy, link Supabase, or apply migrations.
- Baseline exceptions approved by the user: internal full tests require missing Supabase env values; internal lint/typecheck have unrelated errors; marketing lint has two pre-existing `ContactForm` errors. New targeted tests and both builds must pass, and changed files must introduce no new lint/type errors.

### Task 1: TypeScript Pricing Domain

**Files:**
- Modify: `src/lib/mission-costing.spec.ts`
- Modify: `src/lib/mission-costing.ts`

**Step 1: Write failing gross-margin and market tests**

Add test vectors that require:

```ts
const rule: PricingRule = {
  code: "MAPPING_BASIC",
  name: "Mapping Basic",
  pricingModel: "starting_at",
  basePrice: 800,
  minimumPrice: 800,
  maximumPrice: null,
  includedQuantity: 10,
  overageRate: 14,
  targetGrossMarginPct: 40,
  modifiers: { manual_authorization: 250, next_day: 0.25, same_day: 0.5 },
  requiresCapability: null,
  available: true,
  effectiveDate: "2026-08-07",
  reviewDueDate: "2026-11-07",
};

expect(calculateCostFloor(600, 40)).toBe(1000);
expect(calculateMarketPrice(rule, { quantity: 15 }).marketPrice).toBe(870);
expect(recommendQuote({ trueCost: 600, rule, scope: { quantity: 15 } }).recommendedQuote).toBe(1000);
```

Also test invalid margins, negative acreage, manual coordination, next-day/same-day rush, stale review dates, unknown modifiers, and unavailable thermal capability.

**Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/mission-costing.spec.ts`

Expected: FAIL because the new domain types/functions do not exist.

**Step 3: Implement the pure pricing domain**

Add `PricingRule`, `PricingScope`, `MarketPriceResult`, and `QuoteRecommendation` types. Preserve the existing direct/indirect cost calculation, but replace markup math with:

```ts
export function calculateCostFloor(trueCost: number, targetGrossMarginPct: number): number {
  if (trueCost < 0) throw new RangeError("trueCost cannot be negative");
  if (targetGrossMarginPct < 0 || targetGrossMarginPct >= 100) {
    throw new RangeError("targetGrossMarginPct must be between 0 and 100");
  }
  return roundCurrency(trueCost / (1 - targetGrossMarginPct / 100));
}
```

Calculate acreage only above included quantity, add customer-visible modifiers, apply rush last, and return `Math.max(costFloor, marketPrice)`. Capability and stale-review warnings are structured values, not UI strings embedded in math.

**Step 4: Run tests and verify GREEN**

Run: `npx vitest run src/lib/mission-costing.spec.ts`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/lib/mission-costing.ts src/lib/mission-costing.spec.ts
git commit -m "feat(pricing): calculate market-aware gross-margin quotes"
```

### Task 2: Canonical Supabase Catalog and Costing Audit Fields

**Files:**
- Create: `supabase/migrations/20260807160000_sai_market_aware_pricing.sql`
- Create: `supabase/migrations/sai-market-aware-pricing.spec.ts`
- Modify: `src/integrations/supabase/types.ts`
- Create: `src/hooks/usePricingCatalog.ts`
- Create: `src/hooks/usePricingCatalog.spec.ts`
- Modify: `src/hooks/useMissionCostings.ts`

**Step 1: Write migration contract tests**

Read the SQL as text and assert it defines `sai_pricing_catalog`, the restricted public view, RLS/admin policy, all approved seed codes, effective/review dates, the $1,800 retainer, $0 routine LAANC, $250 manual coordination, and unavailable thermal seed. Assert the migration alters `mission_costings` additively and updates—not recreates—operational package rows.

**Step 2: Verify RED**

Run: `npx vitest run supabase/migrations/sai-market-aware-pricing.spec.ts`

Expected: FAIL because the migration does not exist.

**Step 3: Create the additive migration**

The table must include:

```sql
code text primary key,
name text not null,
category text not null,
pricing_model text not null check (pricing_model in ('fixed','starting_at','range','custom')),
base_price numeric(10,2),
minimum_price numeric(10,2),
maximum_price numeric(10,2),
unit text,
included_quantity numeric(10,2),
overage_rate numeric(10,2),
target_gross_margin_pct numeric(5,2) not null default 40,
market_low numeric(10,2),
market_high numeric(10,2),
modifiers jsonb not null default '{}'::jsonb,
requires_capability text,
available boolean not null default true,
public boolean not null default true,
effective_date date not null,
review_due_date date not null,
drone_package_code text,
active boolean not null default true
```

Seed with `INSERT ... ON CONFLICT (code) DO UPDATE`. Create a security-invoker public view containing no margin or benchmark-internal fields. Extend `mission_costings` with selected rule code, cost floor, market price, recommended quote, quote link, actual cost fields, and realized gross margin. Update active operational package rows and deactivate the thermal package until capability exists.

**Step 4: Add generated Supabase-compatible types and hooks**

`usePricingCatalog` queries active rows ordered by category/name. It exposes a versioned fallback matching the migration for offline admin rendering. Update save-costing payload fields without changing existing required database fields.

**Step 5: Verify GREEN**

Run:

```powershell
npx vitest run supabase/migrations/sai-market-aware-pricing.spec.ts src/hooks/usePricingCatalog.spec.ts
npm run build
```

Expected: focused tests and build pass.

**Step 6: Commit**

```powershell
git add supabase/migrations/20260807160000_sai_market_aware_pricing.sql supabase/migrations/sai-market-aware-pricing.spec.ts src/integrations/supabase/types.ts src/hooks/usePricingCatalog.ts src/hooks/usePricingCatalog.spec.ts src/hooks/useMissionCostings.ts
git commit -m "feat(pricing): add canonical Supabase pricing catalog"
```

### Task 3: Admin Pricing Calculator and Catalog Presentation

**Files:**
- Create: `src/components/PricingEngine.spec.tsx`
- Modify: `src/components/PricingEngine.tsx`
- Modify: `src/pages/admin/SentinelPricing.tsx`

**Step 1: Write failing UI behavior tests**

Test the extracted view-model helpers rather than brittle layout details. Require that the UI:

- labels the control `Target Gross Margin`;
- displays cost floor, market price, and recommended quote;
- exposes acreage only for quantity-priced rules;
- includes routine LAANC at $0 and manual coordination at $250;
- blocks unavailable thermal quoting;
- warns after the review date;
- defaults a new brokerage retainer to $1,800.

**Step 2: Verify RED**

Run: `npx vitest run src/components/PricingEngine.spec.tsx`

Expected: FAIL against the markup-only component.

**Step 3: Implement the catalog-driven UI**

Replace `PACKAGES` rendering with `usePricingCatalog`. Keep internal costs visible only in the admin calculation breakdown. Convert-to-quote emits a service line plus customer-visible modifiers and uses `recommendedQuote`, never internal labor/overhead/profit line items. Preserve the existing session-storage QuoteBuilder handoff.

**Step 4: Verify GREEN**

Run:

```powershell
npx vitest run src/lib/mission-costing.spec.ts src/components/PricingEngine.spec.tsx
npm run build
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/components/PricingEngine.tsx src/components/PricingEngine.spec.tsx src/pages/admin/SentinelPricing.tsx
git commit -m "feat(pricing): surface market-aware quote recommendations"
```

### Task 4: Voice Pricing Lookup

**Files:**
- Modify: `supabase/functions/pricing-lookup/index.spec.ts`
- Modify: `supabase/functions/pricing-lookup/index.ts`
- Create: `supabase/functions/_shared/pricing-response.ts`
- Create: `supabase/functions/_shared/pricing-response.spec.ts`
- Modify: `supabase/functions/vapi-tool-handler/index.ts`

**Step 1: Write failing response tests**

Require exact behavior for fixed, starting-at, range, custom, stale, unavailable, and unknown rows. The voice response must say “starting at” for commercial/mapping services and must not quote an unavailable thermal service.

**Step 2: Verify RED**

Run the repository's Deno test command when available; otherwise run the pure shared module through Vitest and record Deno unavailability.

**Step 3: Implement shared response formatting**

Both edge functions query `sai_pricing_catalog` by normalized service aliases and use one shared formatter. Remove duplicated price maps. Return structured JSON with `service_code`, `pricing_model`, `display_price`, `available`, `effective_date`, and `review_due_date`.

**Step 4: Verify and commit**

```powershell
npx vitest run supabase/functions/_shared/pricing-response.spec.ts
git add supabase/functions/pricing-lookup supabase/functions/vapi-tool-handler/index.ts supabase/functions/_shared/pricing-response.ts supabase/functions/_shared/pricing-response.spec.ts
git commit -m "feat(pricing): serve canonical prices to voice intake"
```

### Task 5: Python Trestle Estimator Parity

**Files:**
- Create: `trestle-tools/test_pricing_core.py`
- Modify: `trestle-tools/pricing_core.py`
- Modify: `trestle-tools/mission_costing_engine.py`

**Step 1: Write failing parity tests**

Mirror the TypeScript vectors with `unittest`: $600 true cost at 40 percent margin yields $1,000; 15-acre Basic yields $870 market; recommendation selects $1,000; routine LAANC is $0; manual coordination is $250; thermal is rejected without capability.

**Step 2: Verify RED**

Run: `python -m unittest trestle-tools/test_pricing_core.py -v`

Expected: FAIL against `COST_PLUS_MARKUP` and the $75 LAANC fee.

**Step 3: Implement matching semantics**

Replace markup constants with `TARGET_GROSS_MARGIN = 0.40`, use the same market fields/codes, fix persisted `expenses_subtotal` to include labor, and add a Supabase catalog loader with a versioned offline fallback. The Tk UI labels gross margin correctly and explains which floor won.

**Step 4: Verify and commit**

```powershell
python -m unittest trestle-tools/test_pricing_core.py -v
python -m py_compile trestle-tools/pricing_core.py trestle-tools/mission_costing_engine.py
git add trestle-tools/pricing_core.py trestle-tools/mission_costing_engine.py trestle-tools/test_pricing_core.py
git commit -m "feat(pricing): align Trestle with market-aware pricing"
```

### Task 6: Marketing Catalog and Customer-Facing Prices

**Files (marketing repository):**
- Create: `src/lib/pricing-catalog.ts`
- Create: `src/lib/pricing-catalog.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/services/page.tsx`
- Modify: `src/app/services/construction-progress/page.tsx`
- Modify: `src/app/services/commercial-marketing/page.tsx`
- Modify: `src/app/services/inspection-data/page.tsx`
- Modify: `src/app/services/roof-documentation/page.tsx`
- Create: `src/app/services/mapping/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/components/ContactForm.tsx`

**Step 1: Add a test runner and write failing catalog tests**

Add Node's built-in TypeScript-compatible test path or a minimal Vitest dev dependency. Test every approved price, display label, review date, and unavailable thermal state. Test the optional Supabase read falls back deterministically when environment variables or the network are unavailable.

**Step 2: Verify RED**

Run the new focused catalog test command and confirm it fails before `pricing-catalog.ts` exists.

**Step 3: Implement public catalog consumption**

`getPublicPricingCatalog()` reads `sai_public_pricing_catalog` with the existing Supabase environment and Next cache revalidation. `PUBLIC_PRICING_FALLBACK` allows static builds without secrets. Pages consume the central module for numeric display; prose uses “starting at,” ranges, and request-review wording accurately.

**Step 4: Update all primary pricing surfaces**

- recurring construction $450/visit and one-time $550;
- commercial marketing starting at $850;
- visual roof tiers and gated thermal tier;
- mapping Basic/Pro/Enterprise limits and overages;
- contact form labels;
- JSON-LD and metadata without a fixed inspection price.

**Step 5: Verify and commit**

```powershell
npm run test -- pricing-catalog
npm run build
git add src/lib/pricing-catalog.ts src/lib/pricing-catalog.test.ts src/app
git commit -m "feat(pricing): publish competitive service pricing"
```

### Task 7: Sitewide Thermal and Machine-Readable Consistency

**Files (marketing repository):**
- Modify every file returned by the pre-change fleet/thermal/pricing inventory under `src/` and `public/`.

**Step 1: Add failing claim-consistency test**

Create `scripts/check-pricing-claims.mjs` that fails on active claims that the Matrice 4E has a thermal sensor, that a Matrice 4T is in the current fleet, that thermal work is currently available, or that Inspection Data is a fixed $1,200 package. Permit explicitly future-tense content on `/thermal-services`.

**Step 2: Run and verify RED**

Run: `node scripts/check-pricing-claims.mjs`

Expected: FAIL and list all stale files.

**Step 3: Correct all occurrences in one pass**

Use documentation language: observations, imagery, measurements, and client-ready reports; no certification, engineering, boundary-survey, or guaranteed-accuracy claims. Represent Matrice 4E as the active RGB mapping/visual-inspection platform and Matrice 4T/thermal as planned or availability-gated only.

**Step 4: Verify GREEN**

Run:

```powershell
node scripts/check-pricing-claims.mjs
npm run test
npm run build
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add public src scripts package.json package-lock.json
git commit -m "fix(marketing): align pricing and fleet capability claims"
```

### Task 8: Documentation, Cross-Repo Audit, and Release Handoff

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs/pricing/market-benchmark-2026-08-07.md`
- Modify: `C:\Users\redle.SOULAAN\obsidian-dev\projects\sentinel-aerial\MOC.md` or create a linked pricing status note
- Append: `C:\Users\redle.SOULAAN\obsidian-dev\last-session.md`

**Step 1: Update canonical operating documentation**

Replace the locked legacy pricing block with the approved catalog, gross-margin formula, capability gate, effective date, review date, and explicit rule that Supabase is canonical.

**Step 2: Run the full release audit**

Internal worktree:

```powershell
npx vitest run src/lib/mission-costing.spec.ts src/hooks/usePricingCatalog.spec.ts src/components/PricingEngine.spec.tsx supabase/migrations/sai-market-aware-pricing.spec.ts supabase/functions/_shared/pricing-response.spec.ts
python -m unittest trestle-tools/test_pricing_core.py -v
python -m py_compile trestle-tools/pricing_core.py trestle-tools/mission_costing_engine.py
npm run build
git diff --check origin/main...HEAD
git status --short
```

Marketing worktree:

```powershell
npm run test
node scripts/check-pricing-claims.mjs
npm run build
git diff --check origin/main...HEAD
git status --short
```

Also rerun full lint/typecheck/tests and compare failures with the recorded baseline; no pricing-related or newly introduced failure is allowed.

**Step 3: Inspect the migration and changed-file inventory**

Confirm there is exactly one new migration timestamp, no old migration changed, no secrets, no generated build output, and no live-state mutation. Confirm every approved business rule has direct test evidence.

**Step 4: Update the Obsidian project status**

Record branch names, worktree paths, commits, gates, baseline exceptions, unapplied migration name, and the production release steps still requiring approval.

**Step 5: Commit documentation changes**

```powershell
git add CLAUDE.md docs/pricing/market-benchmark-2026-08-07.md
git commit -m "docs(pricing): record benchmark and review controls"
```

## Completion Criteria

- Supabase is the declared canonical price source and the migration is unapplied.
- All approved prices, ranges, overages, review dates, and availability rules appear in code and tests.
- TypeScript and Python return the same outputs for shared vectors.
- Admin quotes use `max(cost_floor, market_price)` and true gross margin.
- Voice intake never invents or quotes unavailable services.
- Public website prices, structured data, Markdown, and capability claims agree.
- New targeted tests and both builds pass.
- Full-suite baseline failures do not increase and are reported explicitly.
- No push, merge, migration application, or deployment occurs.
