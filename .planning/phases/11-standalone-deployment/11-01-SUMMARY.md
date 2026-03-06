---
phase: 11
plan: 01
status: complete
completed: 2026-03-05
---

# Plan 11-01 Summary: Trestle Standalone Deployment

## What Was Done
- Deployed Trestle PWA as standalone Vercel project at trestle.sentinelaerialinspections.com
- Configured DNS CNAME record pointing to Vercel
- Added Supabase auth redirect URLs for the new subdomain
- Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) in Vercel
- Domain-aware routing in App.tsx distinguishes Trestle vs F&H domains
- Auth page shows "Trestle Pilot Portal" on Trestle domain, "Faith & Harmony Admin" on F&H domain
- PWA is installable on mobile from the Trestle subdomain

## Artifacts
- vercel.json (SPA rewrites, security headers)
- src/App.tsx (isTrestleDomain routing)
- src/pages/Auth.tsx (domain-aware subtitles)

## Notes
- Plan tasks were mostly manual dashboard configuration (Vercel, DNS, Supabase)
- Code changes for domain routing were completed in commit ecddd96
