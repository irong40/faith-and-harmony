# Session Handoff
**Date:** 2026-06-09
**Project:** faith-and-harmony (CRM/web app + `trestle-tools/`)
**Branch:** `dev` (= origin/dev `4995861`); `main` = production `fc67f86`

## Accomplished
- **Public `/quote` lead-intake form — LIVE in production** (PR #28 → dev, PR #29 → main).
  - `RequestQuoteForm` mounted at `/quote` and embedded in landing `#contact` (one component, two surfaces). Free-text-first; deliverable chips + tooltips; honeypot; UTM capture; composes `raw_intake`. No "inspection" language. Styled with landing `fh-*`.
  - Edge fn `quote-request` **deployed to prod v17, `verify_jwt:false`** (via Supabase MCP, explicit). Maps new payload to live `quote_requests` cols (`full_name→name`, `location→address`, `target_date→preferred_date`, `raw_intake→description`); backward-compatible. **Verified live: HTTP 200 no-auth, correct mapping.**
- **Lead→OPORD = PULL poller** (`trestle-tools/opord_intake.py watch`): polls `web_form` leads missing a draft, links `opord_proposals.quote_request_id` (idempotent, self-healing). No tunnel / no exposed port (cloudflared is manual + was down). Edge fn push-forward removed.
- Earlier this session: `trestle-tools/` (hybrid pricing engine + OPORD generator, local-Ollama intake) built, merged (PR #26), promoted to main (PR #27).

## Next Steps
- **Run the poller on the host** for drafts to generate: `cd trestle-tools && python opord_intake.py watch`. (Optional: register as a Windows scheduled task.)
- **Resume the parked hybrid-pricing PORT** into the website's TS engine: `src/lib/mission-costing.ts` + `src/components/PricingEngine.tsx` are still the legacy strict cost-plus model. Adam chose to port the new hybrid model (LAANC/CAPS, day rates, tiers, $350 floor) there. `costing_settings` table + `useCostingSettings` hook should be extended (don't hardcode).
- Delete now-unused `src/components/landing/QuoteForm.tsx` (old form, no longer referenced).

## Known Issues
- This session the **local working tree rolled back** to `aeb32cd` with files missing on disk (cause unknown). Fixed via `git reset --hard origin/dev`. Watch for recurrence; work was safe on origin throughout.
- PR "Supabase Preview" check fails against the **preview** project (`hybwrkeltpfkxgdypjdu`) — preview-infra drift, not prod; non-blocking.
- Public packages on the marketing page are still old-model (e.g., Listing Lite $225 < the $350 floor) — a business decision pending the pricing port.

## Key Decisions
- OPORD drafting = **pull, not push** (no Cloudflare tunnel; host is intermittent).
- Pricing math is **deterministic Python**; AI (local Ollama) only drafts prose.
- `verify_jwt:false` on `quote-request` is mandatory (2026-06-03 outage cause).

## Uncommitted Changes
- None — all changes committed and merged to origin (dev + main).
