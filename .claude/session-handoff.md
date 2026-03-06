# Session Handoff
**Date:** 2026-03-06
**Branch:** main

## Accomplished
- **Pilot login redirect**: Pilots logging in from the F&H domain now redirect to `trestle.sentinelaerialinspections.com/pilot` via full page redirect (Auth.tsx `redirectByRole` and App.tsx `RootRedirect`)
- **Trestle guest redirect**: Unauthenticated visitors to `trestle.sentinelaerialinspections.com` go straight to `/auth` instead of seeing the F&H landing page
- **Pilot Portal link**: Added "Pilot Portal" link in the F&H landing page nav pointing to `trestle.sentinelaerialinspections.com/auth`
- All three commits pushed to main and deploying on Vercel

## Next Steps
1. **Add Supabase auth redirect URLs** for `trestle.sentinelaerialinspections.com` (dashboard manual step):
   - `https://trestle.sentinelaerialinspections.com/`
   - `https://trestle.sentinelaerialinspections.com/auth`
   - `https://trestle.sentinelaerialinspections.com/admin/settings`
2. **Deploy `create-deposit-invoice` edge function**: Run `supabase login` then `npx supabase functions deploy create-deposit-invoice --use-api`
3. **Square production cutover** (Phase 11 Plan 02): All manual dashboard work per 11-02-PLAN.md
   - Get production credentials from Square Developer Console
   - Register webhook at `https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/square-webhook`
   - Set Supabase secrets (SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT=production, SQUARE_WEBHOOK_SIGNATURE_KEY, SQUARE_WEBHOOK_URL)
   - Archive sandbox payment records
   - Send test webhook event and verify 200 response
4. **Fix faithandharmonyllc.com 404 on deep links**: Cloudflare DNS is proxied (orange cloud), which may block SPA routing. Either set DNS to DNS-only (gray cloud) or add Cloudflare page rule for catch-all forwarding.
5. **Phase 8 (Watermark Pipeline)**: Next in critical path after Phase 11 complete
6. **Phase 9 (Billing Lifecycle)**: Depends on Phase 8

## Known Issues
- `faithandharmonyllc.com/admin/pilots` returns 404. Likely Cloudflare proxy interfering with Vercel SPA rewrite. Landing page works, deep links do not.
- `sentinelaerial.com` on Vercel is misconfigured (nameservers mismatch). Remove if not needed.
- Phase 8 plan file has minor uncommitted edit (08-01-PLAN.md, 3 lines)

## Key Decisions
- Pilot domain redirect uses hostname check against `trestle.sentinelaerialinspections.com` constant, not env var. Hardcoded in Auth.tsx and App.tsx.
- F&H landing page keeps its own "Login" link for admin access. "Pilot Portal" is a separate link pointing to Trestle domain.
- All three domains (faithandharmonyllc.com, trestle.sentinelaerialinspections.com, sentinelaerial.com variants) serve the same faith-and-harmony Vercel project.

## Uncommitted Changes
- `.claude/project-state.json` (session metadata)
- `.claude/session-handoff.md` (this file)
- `package.json` / `package-lock.json` (dependency change from prior session)
- `.planning/phases/11-standalone-deployment/11-VERIFICATION.md` (untracked)
