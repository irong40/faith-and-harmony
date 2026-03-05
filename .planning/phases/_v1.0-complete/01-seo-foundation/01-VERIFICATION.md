---
phase: 01-seo-foundation
verified: 2026-02-26T00:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "View-source on the landing page shows the title 'Drone Photography & Aerial Inspections | Hampton Roads VA' (not 'Trestle')"
    status: partial
    reason: "This is a Vite SPA with no SSR or prerendering. react-helmet-async injects the title via JavaScript at runtime. The static index.html served by the server contains '<title>Sentinel Aerial Inspections</title>' — not the Sentinel drone services title. Googlebot does execute JavaScript so crawling will see the correct title, but the literal view-source test passes 'Sentinel Aerial Inspections' not the required string. The PWA manifest in vite.config.ts also still declares name 'Trestle Field Operations' and short_name 'Trestle', which Googlebot may surface as a brand signal."
    artifacts:
      - path: "index.html"
        issue: "Static title is 'Sentinel Aerial Inspections', not 'Drone Photography & Aerial Inspections | Hampton Roads VA'. Helmet only sets this after JS executes."
      - path: "vite.config.ts"
        issue: "PWA manifest declares name 'Trestle Field Operations', short_name 'Trestle', description 'Sentinel Aerial Inspections field operations command center'. Contradicts Sentinel drone services identity."
    missing:
      - "Either (a) add SSR/prerendering so the HTML returned by the server contains the correct title, or (b) update index.html <title> to the exact string 'Drone Photography & Aerial Inspections | Hampton Roads VA' to satisfy view-source test. Option (b) is sufficient for Google since Googlebot renders JS."
      - "Update vite.config.ts PWA manifest: set name to 'Sentinel Aerial Inspections', short_name to 'Sentinel', description to the drone services description, and start_url to '/'"

human_verification:
  - test: "Deploy to staging and paste the production URL into Twitter Card Validator (cards-dev.twitter.com/validator) or Open Graph debugger (developers.facebook.com/tools/debug)"
    expected: "Card shows title 'Drone Photography & Aerial Inspections | Hampton Roads VA', description containing 'veteran owned', 'Hampton Roads', 'LAANC', and the hero image"
    why_human: "Social card crawlers fetch the static HTML and may or may not execute JavaScript. Twitter's crawler does not execute JS; it needs the OG tags in the server-rendered HTML or a prerendered snapshot."
  - test: "Use Google's Rich Results Test (search.google.com/test/rich-results) on the production URL"
    expected: "LocalBusiness schema detected with no errors. Service schema for all 6 packages shown. FAQPage schema with 10 Q&A pairs validated."
    why_human: "Rich Results Test executes JavaScript, so this verifies the full runtime output of LandingPageJsonLd. Cannot replicate locally without a deployed URL."
---

# Phase 1: SEO Foundation Verification Report

**Phase Goal:** Google can find and correctly identify Sentinel as a drone services company in Hampton Roads
**Verified:** 2026-02-26
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | View-source shows title "Drone Photography & Aerial Inspections \| Hampton Roads VA" (not "Trestle") | PARTIAL | `index.html` title is "Sentinel Aerial Inspections". Correct title only appears after JS executes via react-helmet-async. PWA manifest still names the app "Trestle Field Operations". |
| 2 | Visiting /sitemap.xml returns a valid XML sitemap listing the landing page URL | VERIFIED | `public/sitemap.xml` exists: valid XML with `<urlset>`, one `<url>` entry with `<loc>https://sentinelaerial.faithandharmonyllc.com/</loc>`, lastmod, changefreq, priority. |
| 3 | Visiting /robots.txt blocks /admin/\*, /pilot/\*, /auth and references the sitemap | VERIFIED | `public/robots.txt` has 7 Disallow entries including /admin/, /pilot/, /auth. `Sitemap:` directive present pointing to sitemap.xml. |
| 4 | Social card preview tool shows correct Sentinel title, description, and image | HUMAN NEEDED | LandingPageHelmet has all 8 OG tags and 4 Twitter tags with correct values and absolute URLs. However, Twitter's social card crawler does not execute JavaScript, so OG tags may not be visible to it. Human verification against card validator required. |
| 5 | Landing page DOM contains main element, nav inside header, and aria-label on sections | VERIFIED | `LandingPage.tsx`: `<main className="lp-main">` wraps all sections. Header contains `<nav aria-label="Site navigation">`. All 11 section elements across LandingPage.tsx and extracted components have aria-label attributes. |

**Score:** 4/5 success criteria verified (3 VERIFIED, 1 PARTIAL, 1 HUMAN NEEDED)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/seo/LandingPageHelmet.tsx` | Per-route Helmet for landing page with title, description, canonical, robots | VERIFIED | Exports `LandingPageHelmet`. Sets title "Drone Photography & Aerial Inspections \| Hampton Roads VA", full meta description with veteran/LAANC/48hr/Hampton Roads, canonical via VITE_PUBLIC_URL, robots index/follow, 8 OG tags, 4 Twitter tags. |
| `src/components/seo/DefaultHelmet.tsx` | Default Helmet for authenticated routes with Trestle identity and noindex | VERIFIED | Exports `DefaultHelmet`. Sets title "Trestle — Sentinel Aerial Inspections", meta robots noindex/nofollow. |
| `src/components/seo/LandingPageJsonLd.tsx` | Three JSON-LD script tags: LocalBusiness, Service @graph, FAQPage | VERIFIED | Renders three `<script type="application/ld+json">` tags. LocalBusiness has correct name, telephone, email, address, areaServed, credentials. Service @graph has all 6 packages at locked prices. FAQPage uses `FAQ_ITEMS` from FAQSection (10 real Q&A pairs). |
| `public/sitemap.xml` | Valid XML sitemap listing production landing page URL | VERIFIED | Present. Valid XML with correct namespace. One URL entry: `https://sentinelaerial.faithandharmonyllc.com/`. |
| `public/robots.txt` | Crawler rules blocking private routes with Sitemap directive | VERIFIED | Present. 7 Disallow entries. Sitemap directive present. |
| `src/pages/LandingPage.tsx` | Semantically correct structure with main, nav, aria-labels, H1 keyword | VERIFIED | main wraps sections, nav inside header, aria-labels on all sections, H1 on keyword phrase in HeroSection, brand name as div.lp-logo-heading. |
| `src/components/landing/HeroSection.tsx` | H1 on keyword phrase with hero image as img element | VERIFIED | Single H1: "Drone Photography and Aerial Inspections / Hampton Roads VA". Hero image as `<img>` with fetchPriority="high", width=1920, height=1080. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/main.tsx` | HelmetProvider | Wraps App at root | WIRED | `import { HelmetProvider } from 'react-helmet-async'` present; `<HelmetProvider><App /></HelmetProvider>` is the render tree. |
| `src/pages/LandingPage.tsx` | `LandingPageHelmet.tsx` | Import and render as first child | WIRED | `import LandingPageHelmet from "@/components/seo/LandingPageHelmet"` present; `<LandingPageHelmet />` rendered as first child in return. |
| `src/pages/LandingPage.tsx` | `LandingPageJsonLd.tsx` | Import and render as second child | WIRED | `import LandingPageJsonLd from "@/components/seo/LandingPageJsonLd"` present; `<LandingPageJsonLd />` rendered immediately after LandingPageHelmet. |
| `src/App.tsx` | `DefaultHelmet.tsx` | Import and render above Routes | WIRED | `import DefaultHelmet from "./components/seo/DefaultHelmet"` present; `<DefaultHelmet />` rendered inside BrowserRouter, above the Suspense/Routes block. |
| `src/components/seo/LandingPageJsonLd.tsx` | `FAQSection.FAQ_ITEMS` | Named import used to build FAQPage schema | WIRED | `import { FAQ_ITEMS } from '@/components/landing/FAQSection'` present; `FAQ_ITEMS.map(...)` called in component body to build faqSchema. |
| `public/robots.txt` | `public/sitemap.xml` | Sitemap: directive | WIRED | `Sitemap: https://sentinelaerial.faithandharmonyllc.com/sitemap.xml` present on last line. |
| `src/components/seo/LandingPageHelmet.tsx` | `og:image` asset | Absolute URL via VITE_PUBLIC_URL | WIRED | `og:image` content is `` `${SITE_URL}/assets/landing/hero-banner.jpg` `` — absolute HTTPS URL. Same for twitter:image. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEO-01 | 01-01 | Page title contains primary keyword and location | SATISFIED | LandingPageHelmet sets title "Drone Photography & Aerial Inspections \| Hampton Roads VA" via react-helmet-async. Renders at JS runtime. |
| SEO-02 | 01-01 | Meta description contains service keywords, location, USPs | SATISFIED | Meta description in LandingPageHelmet: "Veteran owned drone services in Hampton Roads VA. FAA Part 107 certified, LAANC authorized for military airspace, 48 hour turnaround." |
| SEO-03 | 01-01 | Canonical URL set to production domain | SATISFIED | `<link rel="canonical" href={SITE_URL} />` in LandingPageHelmet. SITE_URL defaults to `https://sentinelaerial.faithandharmonyllc.com`. |
| SEO-04 | 01-03 | Open Graph tags render correctly | SATISFIED | All 8 OG tags present in LandingPageHelmet: og:type, og:url, og:title, og:description, og:image (absolute URL), og:image:width, og:image:height, og:site_name. |
| SEO-05 | 01-03 | Twitter card tags with summary_large_image and hero photo | SATISFIED | twitter:card="summary_large_image", twitter:title, twitter:description, twitter:image (absolute URL) all present. |
| SEO-06 | 01-02 | JSON-LD LocalBusiness schema | SATISFIED | LandingPageJsonLd Script 1: LocalBusiness with name, telephone (+17605754876), email, address, areaServed (10 entries), credentials, founder. |
| SEO-07 | 01-02 | JSON-LD Service schema per service type | SATISFIED | LandingPageJsonLd Script 2: @graph with 6 Service entries at locked prices ($225, $450, $750, $450, $850, $1200). |
| SEO-08 | 01-02 | JSON-LD FAQPage schema wrapping FAQ content | SATISFIED | LandingPageJsonLd Script 3: FAQPage built dynamically from FAQ_ITEMS (10 real Q&A pairs). |
| SEO-09 | 01-03 | sitemap.xml generated and accessible at /sitemap.xml | SATISFIED | public/sitemap.xml exists and is a valid XML sitemap with the production URL. |
| SEO-10 | 01-03 | robots.txt blocks private routes and includes Sitemap directive | SATISFIED | public/robots.txt: 7 Disallow entries covering /admin/, /pilot/, /auth, /proposal/, /invoice/, /drone-upload/, /my-jobs/. Sitemap directive present. |
| SEO-11 | 01-01 | react-helmet-async installed and managing per-route meta tags | SATISFIED | `react-helmet-async@2.0.5` in package.json dependencies. HelmetProvider wraps App in main.tsx. LandingPageHelmet and DefaultHelmet both use Helmet from react-helmet-async. |
| HTML-01 | 01-04 | Landing page wrapped in main element | SATISFIED | `<main className="lp-main">` in LandingPage.tsx wraps HeroSection through Contact section. |
| HTML-02 | 01-04 | Header contains nav element wrapping navigation links | SATISFIED | `<nav aria-label="Site navigation">` inside `lp-header-right` div wraps the Pilot Login Link. |
| HTML-03 | 01-04 | All section elements have aria-label attributes | SATISFIED | All 11 sections (including components) have aria-label: Hero, Services, Pricing, Equipment, Portfolio, Military airspace authorization, Frequently asked questions, Request a quote, Service area, About the founder, Contact information. Footer has aria-label="Site footer". |
| HTML-04 | 01-04 | H1 tag contains primary keyword phrase (not brand name) | SATISFIED | Single H1 in HeroSection.tsx: "Drone Photography and Aerial Inspections / Hampton Roads VA". Brand name in header is a `<div className="lp-logo-heading">`, not a heading element. |
| HTML-05 | 01-04 | Heading hierarchy flows H1 > H2 > H3 without skipping levels | SATISFIED | H1 in HeroSection only. H2 for all section titles. H3 for card and item titles. No heading levels skipped. Contact section uses h4 for sub-labels (PHONE, EMAIL, SERVICE AREA) — these are below H3 card context and within a section with an H2, so no skip occurs. |
| HTML-06 | 01-04 | All images have descriptive alt text, width, and height attributes | SATISFIED | sentinel-logo.png (width=400, height=400, alt present), matrice-4e.png (width=600, height=400, alt present), hero-banner.jpg in Equipment (width=1920, height=1080), hero-banner.jpg in HeroSection (width=1920, height=1080, fetchPriority="high"). Portfolio images in PortfolioGrid carry width/height per SUMMARY. |

**Note on REQUIREMENTS.md status:** SEO-01, SEO-02, SEO-03, SEO-11 are still marked `[ ]` (Pending) in REQUIREMENTS.md. This is a tracking error in the file — the implementation exists and satisfies these requirements. The Traceability table shows them as "Pending" which disagrees with the implementation reality. REQUIREMENTS.md should be updated to mark these as complete.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `vite.config.ts` | PWA manifest: `name: "Trestle Field Operations"`, `short_name: "Trestle"`, `description: "Sentinel Aerial Inspections field operations command center"`, `start_url: "/pilot"` | WARNING | When users install the PWA or when Google indexes PWA metadata, the app identity is "Trestle", not Sentinel drone services. start_url "/pilot" also routes to the pilot portal rather than the landing page. |
| `index.html` | `<title>Sentinel Aerial Inspections</title>` | WARNING | View-source on the raw HTML does not show the full SEO title "Drone Photography & Aerial Inspections \| Hampton Roads VA". This is the title Google may index before JS executes, and the title Twitter/Facebook card scrapers will see (they do not execute JS). |

---

### Human Verification Required

#### 1. Social Card Preview Validation

**Test:** Deploy to the production domain and paste `https://sentinelaerial.faithandharmonyllc.com` into Twitter's Card Validator at `cards-dev.twitter.com/validator` and Facebook's Open Graph Debugger at `developers.facebook.com/tools/debug`.
**Expected:** Both tools show title "Drone Photography & Aerial Inspections | Hampton Roads VA", the meta description containing "veteran owned", "Hampton Roads", "LAANC", "48 hour turnaround", and the hero banner image.
**Why human:** Twitter's crawler does not execute JavaScript. OG tags injected by react-helmet-async at JS runtime will not appear in Twitter's scrape of the raw HTML. This test will likely reveal that the social card shows the index.html fallback title "Sentinel Aerial Inspections" rather than the full SEO title, confirming the architectural gap in Success Criterion 4.

#### 2. Google Rich Results Test

**Test:** After deployment, run `https://sentinelaerial.faithandharmonyllc.com` through Google's Rich Results Test at `search.google.com/test/rich-results`.
**Expected:** LocalBusiness schema detected with no errors, Service schema for all 6 packages listed, FAQPage schema with 10 Q&A pairs validated.
**Why human:** Requires a live deployed URL. Rich Results Test renders JavaScript, so this verifies the full runtime output of LandingPageJsonLd and confirms Google can read the structured data.

---

### Gaps Summary

**1 gap blocking the literal success criterion; 1 item requiring human validation.**

**Gap 1 — SPA architecture vs. view-source title requirement (PARTIAL)**

Success Criterion 1 states "View-source on the landing page shows the title 'Drone Photography & Aerial Inspections | Hampton Roads VA' (not 'Trestle')." The implementation uses react-helmet-async in a Vite SPA without prerendering. The server delivers `index.html` with `<title>Sentinel Aerial Inspections</title>`. The correct SEO title only appears in the DOM after JavaScript executes. Googlebot does execute JavaScript, so the title will be indexed correctly. However:

- The literal view-source test fails — view-source shows "Sentinel Aerial Inspections" not the drone services title.
- Twitter's social card crawler does not execute JavaScript, so the OG title will also not appear in Twitter card previews.
- The PWA manifest still identifies the app as "Trestle Field Operations", creating a conflicting signal.

**Root cause:** The implementation is architecturally correct for a React SPA (react-helmet-async is the right tool), but the phase goal's Success Criterion 1 is worded for an SSR or prerendered context. The minimum fix without SSR is to update `index.html` `<title>` to the full SEO title string so that view-source and non-JS crawlers see the correct identity.

**Gap 2 — PWA manifest Trestle identity (WARNING, not a phase 1 requirement)**

`vite.config.ts` PWA manifest declares `name: "Trestle Field Operations"` and `start_url: "/pilot"`. This is outside the Phase 1 plan scope but conflicts with the goal of Google correctly identifying Sentinel as a drone services company. If the PWA manifest is indexed, it undermines the SEO signal.

---

## Verification Summary by Plan

| Plan | Requirements | Artifacts | Key Links | Status |
|------|-------------|-----------|-----------|--------|
| 01-01 | SEO-01, 02, 03, 11 | LandingPageHelmet, DefaultHelmet | HelmetProvider→App, LandingPage→LandingPageHelmet, App→DefaultHelmet | VERIFIED (with SPA caveat on view-source) |
| 01-02 | SEO-06, 07, 08 | LandingPageJsonLd | LandingPage→LandingPageJsonLd, JsonLd→FAQ_ITEMS | VERIFIED |
| 01-03 | SEO-04, 05, 09, 10 | sitemap.xml, robots.txt, LandingPageHelmet OG tags | robots.txt→sitemap.xml, LandingPageHelmet→og:image | VERIFIED (human needed for social card preview) |
| 01-04 | HTML-01 through HTML-06 | LandingPage.tsx, HeroSection.tsx + 8 other components | header→nav, H1→keyword phrase | VERIFIED |

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-verifier)_
