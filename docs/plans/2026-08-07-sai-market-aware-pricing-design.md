# SAI Market-Aware Pricing Design

## Purpose

Sentinel Aerial Inspections needs one controlled pricing system that protects gross margin, reflects the reviewed 2026 market, and keeps the CRM, voice assistant, local Trestle estimator, and public website aligned. The system is a quoting aid, not an autonomous promise: unusual scope, unavailable capabilities, and custom enterprise work still require operator review.

## Approved Business Rules

| Service | Customer-facing rule | Included scope / note |
| --- | ---: | --- |
| Listing Lite | $225 fixed | Existing package retained |
| Listing Pro | $450 fixed | Existing package retained |
| Luxury Listing | $750 fixed | Existing package retained |
| Brokerage Retainer | $1,800/month | Five Listing Pro shoots; $360 effective rate |
| Construction Progress, recurring | $450/visit | Scheduled repeat visual documentation |
| Construction Progress, one-time | $550 | One-off visual documentation |
| Construction Mapping | Starting at $750 | Construction-oriented orthomosaic deliverable |
| Construction Analysis | $950-$1,200 | Scope-dependent analysis and reporting |
| Commercial Marketing | Starting at $850 | Scope-dependent commercial media |
| Residential Visual Roof Documentation | $450-$650 | Documentation only; no certification claim |
| Commercial Visual Roof Documentation | Starting at $750 | Documentation only; no certification claim |
| Commercial Thermal Roof Documentation | Starting at $1,200 | Unavailable until a verified thermal capability is active |
| Mapping Basic | $800 up to 10 acres | Orthomosaic and point cloud; $14/additional acre |
| Mapping Pro | $1,800 up to 25 acres | Measurements, annotations, and CAD exports; $22/additional acre |
| Mapping Enterprise | Starting at $3,500 | Custom reporting, change detection, and priority handling; scope review required |
| Routine LAANC | Included | Automated routine authorization is not itemized |
| Manual airspace coordination | $250 | Zero-grid, CAPS, or further manual coordination |
| Rush | +25% / +50% | Next-day / same-day when operationally available |

The market benchmark is effective 2026-08-07 and must be reviewed by 2026-11-07. A quote may be generated after the review date, but the UI must warn that the benchmark is stale.

## Architecture

### Canonical data source

Supabase will own a new `sai_pricing_catalog` table. Each row stores the service code, customer-facing price model, base/range values, included quantity, overage rate, target gross margin, market benchmark range, effective date, review date, capability requirement, and active/available flags. A restricted `sai_public_pricing_catalog` view exposes only customer-safe fields to the marketing site.

`drone_packages` remains the operational execution catalog because its IDs drive shot plans and processing. A pricing row may reference an operational package code, but pricing logic never reads hard-coded prices from UI components. Existing operational rows will be updated by a new idempotent migration; new pricing variants are not inserted into operational workflows until they have a valid shot plan and processing path.

### Pricing calculation

The pure calculation layer receives true mission costs, a pricing-catalog rule, and scope modifiers:

```text
true_cost = direct_costs + overhead + depreciation + administration
cost_floor = true_cost / (1 - target_gross_margin)

market_subtotal = service_anchor
                + acreage_overage
                + selected_deliverable_modifiers
                + travel_surcharge
                + manual_authorization_fee

market_price = market_subtotal * rush_multiplier
recommended_quote = max(cost_floor, market_price)
```

Gross margin is calculated as `(recommended_quote - true_cost) / recommended_quote`. The current 40 percent default therefore means a true 40 percent gross margin, not a 40 percent markup.

The engine returns the cost floor and market components separately so an administrator can see why a price was recommended. Client quote line items contain the service and customer-visible surcharges only; they do not disclose internal labor, overhead, or profit.

### Capability and review gates

- A catalog row with `requires_capability = 'thermal'` is not quotable unless both the row is marked available and the caller supplies a verified active thermal capability.
- The migration seeds commercial thermal roof documentation as unavailable because the current live fleet has no verified thermal aircraft record.
- Routine LAANC adds $0. Manual coordination adds $250.
- Rules past `review_due_date` remain calculable but return a stale-market warning.
- Invalid target margins (less than 0 or greater than or equal to 100 percent), negative scope inputs, and unknown modifier codes are rejected.

### Integration surfaces

1. `src/lib/mission-costing.ts` becomes the canonical TypeScript calculation module.
2. `PricingEngine.tsx` selects a catalog rule, captures acreage/rush/manual coordination/travel, and displays cost floor, market price, and final recommendation.
3. `SentinelPricing.tsx` reads package presentation data from the catalog hook and changes the retainer default to $1,800.
4. `pricing-lookup` and `vapi-tool-handler` read the catalog instead of maintaining separate price maps; unavailable thermal services return a request-for-review response.
5. `trestle-tools/pricing_core.py` implements the identical formula and catalog semantics, with database loading and a versioned offline fallback.
6. The marketing site uses one local fallback catalog module with an optional Supabase public-view refresh, then updates service pages and machine-readable Markdown to match it.
7. A new migration extends saved mission costings with the selected rule, cost floor, market price, recommended quote, quote link, actual cost, and realized margin fields for later win/loss and margin reporting.

## Data Safety and Claims

- No existing applied migration is edited.
- The new migration is additive and idempotent where practical.
- Public policies expose only active, public, customer-safe catalog data.
- Thermal services are described as planned or availability-gated until fleet records prove capability.
- Roof, pavement, mapping, and inspection outputs are documentation and data products. Sentinel does not certify condition, code compliance, engineering conclusions, property boundaries, or survey accuracy beyond the documented workflow.
- Routine airspace authorization is included, but quotes do not promise approval or operational availability.

## Verification Strategy

- TypeScript unit tests cover gross-margin math, market components, higher-of selection, acreage overages, rush/manual fees, stale benchmarks, and capability rejection.
- Deno tests cover fixed, starting-at, unavailable, and unknown voice-pricing responses.
- Python `unittest` cases mirror the TypeScript pricing vectors.
- Migration contract tests inspect required tables, policies, seed rows, dates, and idempotent updates.
- Marketing tests validate public catalog values and prohibit unsupported active thermal/fleet claims.
- Both production builds and all new targeted tests must pass.
- Pre-existing full-suite failures from the untouched baselines are reported separately and must not increase.

## Release Boundary

This work produces committed, reviewable branches and an unapplied Supabase migration. It does not push, merge, apply migrations, change live database rows, or deploy either application without separate approval.
