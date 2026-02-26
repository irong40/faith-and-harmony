# Roadmap: Sentinel Landing Page Overhaul

## Overview

The existing landing page misidentifies as "Trestle" and hides behind an auth check. This roadmap takes it from invisible to Google-indexed and conversion-ready in five phases. Phase 1 lays the SEO and semantic HTML foundation with no visual change. Phase 2 optimizes images before the content rebuild. Phases 3 and 4 rebuild the page content top-to-bottom, split at the fold between above-fold commercial sections and below-fold supporting sections. Phase 5 closes out with performance tuning and mobile responsiveness.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: SEO Foundation** - Install react-helmet-async, fix page identity, add structured data, sitemap, robots.txt, and semantic HTML markup
- [ ] **Phase 2: Image Optimization** - Compress logo, add WebP variants, fix dimensions, optimize hero delivery
- [ ] **Phase 3: Above-Fold Content** - Sticky nav, hero, trust bar, services, pricing, and portfolio sections with conversion CTAs
- [ ] **Phase 4: Below-Fold Content** - Military airspace differentiator, FAQ with schema, inline quote form, service area, about, contact, and footer
- [ ] **Phase 5: Performance and Mobile** - Eliminate mobile animation waste, reduce font load, add security headers, and add responsive breakpoints

## Phase Details

### Phase 1: SEO Foundation
**Goal**: Google can find and correctly identify Sentinel as a drone services company in Hampton Roads
**Depends on**: Nothing (first phase)
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07, SEO-08, SEO-09, SEO-10, SEO-11, HTML-01, HTML-02, HTML-03, HTML-04, HTML-05, HTML-06
**Success Criteria** (what must be TRUE):
  1. View-source on the landing page shows the title "Drone Photography & Aerial Inspections | Hampton Roads VA" (not "Trestle")
  2. Visiting /sitemap.xml returns a valid XML sitemap listing the landing page URL
  3. Visiting /robots.txt returns a file that blocks /admin/*, /pilot/*, /auth and references the sitemap
  4. Pasting the production URL into a social card preview tool (Twitter card validator or Open Graph debugger) shows the correct Sentinel title, description, and image
  5. The landing page DOM contains a main element, a nav element inside the header, and aria-label attributes on section elements
**Plans**: TBD

Plans:
- [ ] 01-01: Install react-helmet-async and replace hardcoded title/meta tags with HelmetProvider and per-route Helmet components
- [ ] 01-02: Add JSON-LD structured data (LocalBusiness, Service schemas per service type, FAQPage schema stub)
- [ ] 01-03: Generate sitemap.xml and robots.txt, wire up Open Graph and Twitter card tags
- [ ] 01-04: Apply semantic HTML corrections (main, nav, aria-labels, H1 keyword, heading hierarchy, image alt/dimensions)

### Phase 2: Image Optimization
**Goal**: Landing page images load fast, have correct dimensions, and serve modern formats
**Depends on**: Phase 1
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04, IMG-05
**Success Criteria** (what must be TRUE):
  1. The sentinel-logo file is under 100 KB (down from 1.06 MB) and renders correctly in header
  2. The hero banner renders as an img element with fetchpriority="high" rather than a CSS background-image
  3. Every landing page image has explicit width and height attributes in the HTML
  4. Below-fold images have loading="lazy" and the hero does not
**Plans**: TBD

Plans:
- [ ] 02-01: Compress sentinel-logo.png, generate WebP variant, update img tag with width/height
- [ ] 02-02: Convert hero CSS background-image to img element with fetchpriority="high", add width/height and alt text to all landing page images, add loading="lazy" to below-fold images

### Phase 3: Above-Fold Content
**Goal**: Visitors arriving from search land on a page that immediately communicates who Sentinel is, what it costs, and how to start
**Depends on**: Phase 2
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, PAGE-06, CONV-01, CONV-02, CONV-04, CONV-05
**Success Criteria** (what must be TRUE):
  1. A sticky navigation bar is visible on scroll with section anchor links and a "Get a Quote" CTA button
  2. The hero section shows an H1 with a keyword phrase, a subheadline addressing realtors and contractors, a visible phone number, and a conversion CTA above the fold
  3. A trust bar below the hero shows FAA Part 107, $1M Insurance, Veteran Owned, and 48 Hour Turnaround badges
  4. A pricing section displays all 6 packages with deliverables and each card has its own CTA that pre-selects the service type in the quote form
  5. An inline portfolio grid shows 6 to 9 photos with service type labels, not an external link
**Plans**: TBD

Plans:
- [ ] 03-01: Build sticky navigation component with section anchor links and Get a Quote CTA
- [ ] 03-02: Rebuild hero section (H1 keyword, subheadline, phone, CTA) and trust bar (FAA, insurance, veteran, turnaround)
- [ ] 03-03: Build pricing section with all 6 packages, deliverables, add-ons, and per-card CTAs
- [ ] 03-04: Build inline portfolio grid with local photos and service type labels

### Phase 4: Below-Fold Content
**Goal**: Visitors who scroll past pricing find the answers they need to commit to a quote request and can submit without leaving the page
**Depends on**: Phase 3
**Requirements**: PAGE-07, PAGE-08, PAGE-09, PAGE-10, PAGE-11, PAGE-12, PAGE-13, CONV-03
**Success Criteria** (what must be TRUE):
  1. A military airspace section names Norfolk Naval Station, NAS Oceana, and Langley AFB as authorized flight areas
  2. A FAQ section answers 8 to 10 questions and the page DOM includes JSON-LD FAQPage schema matching those questions
  3. A quote request form (name, email, phone, service type, preferred date, message) submits without page navigation and shows a confirmation
  4. A service area section lists Hampton Roads cities plus Maryland and Northern NC coverage
  5. Footer contains copyright, certifications, and veteran owned badge
**Plans**: TBD

Plans:
- [ ] 04-01: Build military airspace differentiator section with named installations
- [ ] 04-02: Build FAQ section (8 to 10 questions) and wire JSON-LD FAQPage schema from Phase 1 stub to real content
- [ ] 04-03: Build inline quote request form with Supabase or email submission, service type pre-selection from pricing CTA, and confirmation state
- [ ] 04-04: Build service area section, compressed about/founder section, contact section, and footer with certifications

### Phase 5: Performance and Mobile
**Goal**: The page loads fast on mobile, animations do not drain battery on small screens, and security headers protect all visitors
**Depends on**: Phase 4
**Requirements**: PERF-01, PERF-02, PERF-03, MOBL-01, MOBL-02, MOBL-03, MOBL-04
**Success Criteria** (what must be TRUE):
  1. On a real mobile device with reduced motion enabled, the scanline overlay and grid pulse animations do not run
  2. The page loads no more than 2 Google Font families
  3. Resizing the browser to 480px shows a hamburger nav and pricing cards stacked vertically
  4. Resizing to 768px to 1024px shows a readable tablet layout with no overflow or collapsed elements
  5. Response headers on the Vercel deployment include X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security
**Plans**: TBD

Plans:
- [ ] 05-01: Disable CSS animations via prefers-reduced-motion and mobile media query, reduce Google Fonts to 2 families
- [ ] 05-02: Add tablet breakpoint (768px to 1024px) and small mobile breakpoint (below 480px) to landing page CSS
- [ ] 05-03: Build hamburger nav for mobile, ensure pricing cards stack vertically below 480px
- [ ] 05-04: Add security headers to vercel.json

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. SEO Foundation | 0/4 | Not started | - |
| 2. Image Optimization | 0/2 | Not started | - |
| 3. Above-Fold Content | 0/4 | Not started | - |
| 4. Below-Fold Content | 0/4 | Not started | - |
| 5. Performance and Mobile | 0/4 | Not started | - |
