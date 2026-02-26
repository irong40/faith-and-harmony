# Sentinel Aerial Inspections Landing Page

## What This Is

The public facing website for Sentinel Aerial Inspections (Faith & Harmony LLC), a veteran owned drone services company in Hampton Roads, Virginia. The landing page is the first thing prospective clients see. It must convert visitors into booked jobs while ranking in Google for local drone service searches. The backend infrastructure (Supabase, auth, admin portal, pilot portal) already exists and stays untouched.

## Core Value

When a real estate agent, contractor, or property owner in Hampton Roads searches for drone services, they find Sentinel, understand the offering, see the pricing, and submit a quote request without leaving the page.

## Requirements

### Validated

- Existing React 18 + Vite + TypeScript + Tailwind + Shadcn/ui + Supabase app
- Landing page renders at "/" for unauthenticated visitors
- Pilot login routes to "/auth"
- Admin portal at "/admin/*" (20+ pages)
- Pilot portal at "/pilot/*"
- PWA configured with vite-plugin-pwa
- 53 Supabase migrations, 41 edge functions
- Deployed to Vercel with SPA rewrites

### Active

- [ ] SEO infrastructure (meta tags, structured data, sitemap, robots.txt)
- [ ] Conversion focused page structure with inline quote form
- [ ] Pricing section with all 6 packages displayed
- [ ] Military airspace differentiator section
- [ ] Trust bar with credentials (FAA, insurance, veteran, turnaround)
- [ ] Inline portfolio grid (not external link)
- [ ] FAQ section with schema markup
- [ ] Service area with named cities
- [ ] Image optimization (1MB logo, missing dimensions, no WebP)
- [ ] Mobile responsive improvements (tablet + small mobile breakpoints)
- [ ] Performance improvements (font optimization, animation reduction)
- [ ] Sticky navigation with section anchors
- [ ] Semantic HTML (main, nav, aria labels)
- [ ] Security headers in vercel.json

### Out of Scope

- Admin portal changes (existing, untouched)
- Pilot portal changes (existing, untouched)
- Supabase schema changes (no new tables)
- SSR/SSG migration (prerendering only for landing page)
- Payment processing integration (Square is external)
- "Vets to Drones" as a main page section (move to separate route or footer link)
- Blog or content marketing pages (future milestone)
- Google Business Profile setup (external to codebase)
- Analytics implementation (recommend only, not in scope)

## Context

### SEO Audit Findings (2026-02-26)

The page title says "Trestle" (internal ops tool name) and the meta description says "field operations command center." Google is indexing the wrong content. No structured data, no sitemap, no canonical URL, no Open Graph image. The landing page renders behind a Supabase auth check, so Googlebot may see a spinner before content loads.

The sentinel-logo.png is 1.06 MB with no optimization. No images have width/height attributes, loading lazy, or WebP variants. Three permanent fixed position CSS animations run on every page load including mobile.

Only one CSS media query (768px) exists for an 813 line stylesheet.

### Competitive Landscape (2026-02-26)

Primary competitors in Hampton Roads: Air Aspects (has CBRE/Howard Hanna logos, no published pricing), Hampton Roads Real Estate Photography (dominant local player), Dronegenuity (national SEO aggregator with Virginia specific pages), iSky Films (city specific pages for local SEO).

No competitor claims LAANC authorization for Norfolk Naval Station, NAS Oceana, or Langley AFB. No competitor mentions automated QA pipelines. These are uncontested ranking opportunities.

### Target Keywords

Primary: "drone photography Hampton Roads", "aerial photography Norfolk VA", "drone services Hampton Roads"
Long tail: "drone roof inspection Hampton Roads", "3D photogrammetry Hampton Roads VA", "real estate drone photography Virginia Beach", "drone photography near NAS Oceana"
Trust: "veteran owned drone company Virginia", "FAA Part 107 drone pilot Hampton Roads"

### Pricing (Locked, from CLAUDE.md)

Residential: Listing Lite $225, Listing Pro $450, Luxury Listing $750
Commercial: Construction Progress $450/visit, Commercial Marketing $850, Inspection Data $1,200
Add ons: Rush Premium (+25%/+50%), Raw File Buyout (+$250), Brokerage Retainer $1,500/month

## Constraints

- **Tech stack**: Must stay React 18 + Vite + TypeScript. No framework migration.
- **Shared codebase**: Landing page lives alongside admin/pilot portals in same repo. CSS must remain scoped.
- **Supabase project**: Shared with all F&H products. No new tables for the landing page.
- **Writing constraints**: No dashes, semicolons, emojis, asterisks, colons in prose, cliches, marketing language, AI filler. Active voice. Direct address. Per CLAUDE.md.
- **Image assets**: Limited to what exists in /public/assets/landing/ plus aerial before/after photos. New photos require actual drone shoots.
- **Deployment**: Vercel with existing vercel.json SPA rewrites.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep custom CSS over Tailwind for landing page | Landing page has 813 lines of themed CSS with custom properties and animations. Rewriting to Tailwind is high risk, low reward. Extend existing approach. | -- Pending |
| Add react-helmet-async for meta tags | Per route meta management without SSR. Lightweight, well maintained. | -- Pending |
| Inline quote form instead of external booking link | droneinvoice.com CTA leaks conversions. Inline form captures leads on page. Form submits to existing Supabase or email endpoint. | -- Pending |
| Move Vets to Drones to separate route | Breaks buyer journey for primary audience (realtors, contractors). Different audience, different conversion goal. | -- Pending |
| Skip SSR, use prerendering for landing page only | Full SSR migration is out of scope. Prerendering the static landing page gives Googlebot real HTML without architectural change. | -- Pending |

---
*Last updated: 2026-02-26 after initialization*
