# Requirements: Sentinel Landing Page Overhaul

**Defined:** 2026-02-26
**Core Value:** Prospective clients find Sentinel via search, understand the offering, see pricing, and submit a quote request without leaving the page.

## v1 Requirements

### SEO Infrastructure

- [ ] **SEO-01**: Page title contains primary keyword "Drone Photography & Aerial Inspections" and location "Hampton Roads VA"
- [ ] **SEO-02**: Meta description contains service keywords, location, and unique selling points (veteran owned, LAANC authorized, 48 hour turnaround)
- [ ] **SEO-03**: Canonical URL set to production domain
- [x] **SEO-04**: Open Graph tags (og:title, og:description, og:image, og:url, og:type) render correctly for social sharing
- [x] **SEO-05**: Twitter card tags with summary_large_image and hero photo
- [x] **SEO-06**: JSON-LD LocalBusiness schema with name, address, phone, email, service area, price range, credentials
- [x] **SEO-07**: JSON-LD Service schema for each service type with pricing
- [x] **SEO-08**: JSON-LD FAQPage schema wrapping FAQ section content
- [x] **SEO-09**: sitemap.xml generated and accessible at /sitemap.xml
- [x] **SEO-10**: robots.txt blocks /admin/*, /pilot/*, /auth and includes Sitemap directive
- [ ] **SEO-11**: react-helmet-async installed and managing per route meta tags

### Semantic HTML & Accessibility

- [x] **HTML-01**: Landing page wrapped in main element
- [x] **HTML-02**: Header contains nav element wrapping navigation links
- [x] **HTML-03**: All section elements have aria-label attributes
- [x] **HTML-04**: H1 tag contains primary keyword phrase (not brand name)
- [x] **HTML-05**: Heading hierarchy flows H1 > H2 > H3 without skipping levels
- [x] **HTML-06**: All images have descriptive alt text, width, and height attributes

### Page Structure & Content

- [x] **PAGE-01**: Sticky navigation bar with section anchor links and "Get a Quote" CTA button
- [x] **PAGE-02**: Hero section with H1 keyword headline, subheadline addressing client types, phone number visible, conversion CTA
- [x] **PAGE-03**: Trust bar strip below hero showing FAA Part 107, $1M Insurance, Veteran Owned, 48 Hour Turnaround badges
- [x] **PAGE-04**: Services section reframed around client outcomes (realtors, property owners, developers)
- [x] **PAGE-05**: Pricing section displaying all 6 packages with deliverables, add ons listed below
- [x] **PAGE-06**: Inline portfolio grid showing 6 to 9 representative photos with service type labels
- [x] **PAGE-07**: Military airspace differentiator section with Norfolk Naval Station, NAS Oceana, Langley AFB named in heading or subheading
- [x] **PAGE-08**: FAQ section with 8 to 10 questions covering LAANC, turnaround, weather, service area, pricing, insurance, equipment
- [x] **PAGE-09**: Inline quote request form (name, email, phone, service type dropdown, preferred date, message) that submits without leaving page
- [x] **PAGE-10**: Service area section listing Hampton Roads cities (Virginia Beach, Norfolk, Chesapeake, Portsmouth, Newport News, Hampton, Suffolk, Williamsburg) plus Maryland and Northern NC
- [x] **PAGE-11**: Compressed About/founder section connecting military background to operational reliability
- [x] **PAGE-12**: Contact section with phone, email, service area (keep existing)
- [x] **PAGE-13**: Footer with copyright, certifications, veteran owned badge

### Conversion Optimization

- [x] **CONV-01**: Primary CTA above the fold is "Get a Quote" or "Book a Flight" (not "View Our Work")
- [x] **CONV-02**: Phone number visible in header and hero section
- [x] **CONV-03**: Quote form accessible from sticky nav CTA button
- [x] **CONV-04**: Each pricing card has its own CTA linking to the quote form with service type pre-selected
- [x] **CONV-05**: Portfolio section embedded inline (not external link only)

### Image Optimization

- [x] **IMG-01**: sentinel-logo.png compressed from 1.06 MB to under 100 KB
- [x] **IMG-02**: All landing page images have explicit width and height attributes
- [x] **IMG-03**: Below fold images use loading="lazy"
- [x] **IMG-04**: Hero image uses fetchpriority="high" or is preloaded
- [x] **IMG-05**: Hero banner moved from CSS background-image to img tag for SEO indexing

### Performance

- [x] **PERF-01**: Permanent CSS animations (scanline overlay, grid pulse) disabled on mobile via prefers-reduced-motion or media query
- [x] **PERF-02**: Google Fonts reduced to 2 families max or self hosted
- [ ] **PERF-03**: Security headers added to vercel.json (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security)

### Mobile Responsive

- [ ] **MOBL-01**: Tablet breakpoint added (768px to 1024px)
- [ ] **MOBL-02**: Small mobile breakpoint added (below 480px)
- [ ] **MOBL-03**: Sticky nav collapses to hamburger menu on mobile
- [ ] **MOBL-04**: Pricing cards stack vertically on mobile with clear hierarchy

## v2 Requirements

### Analytics & Tracking

- **ANLYT-01**: Google Analytics 4 or Plausible integration
- **ANLYT-02**: UTM parameters on all external links
- **ANLYT-03**: Form submission tracking as conversion events

### Content Expansion

- **CONT-01**: Testimonials section with real client quotes
- **CONT-02**: Case study pages for completed projects
- **CONT-03**: Service area sub pages for individual cities (Virginia Beach, Norfolk, etc.)
- **CONT-04**: Blog for content marketing and organic SEO

### Prerendering

- **PREND-01**: Static HTML prerendering for landing page via vite-ssg or react-snap
- **PREND-02**: Prerendered sitemap with all public routes

### Veteran Outreach

- **VETS-01**: Dedicated /veterans route for Vets to Drones content
- **VETS-02**: Separate conversion goal and CTA for veteran recruitment

## Out of Scope

| Feature | Reason |
|---------|--------|
| Admin portal changes | Existing system, not part of landing page overhaul |
| Pilot portal changes | Existing system, not part of landing page overhaul |
| New Supabase tables | Landing page uses existing infrastructure only |
| Full SSR migration | Architectural change beyond scope. Prerendering deferred to v2 |
| Payment processing | Square integration is external, not on landing page |
| Google Business Profile | External setup, not part of codebase |
| Blog/content pages | Future milestone, requires content strategy |
| Real time chat widget | High complexity, low priority for initial launch |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEO-01 | Phase 1: SEO Foundation | Pending |
| SEO-02 | Phase 1: SEO Foundation | Pending |
| SEO-03 | Phase 1: SEO Foundation | Pending |
| SEO-04 | Phase 1: SEO Foundation | Complete |
| SEO-05 | Phase 1: SEO Foundation | Complete |
| SEO-06 | Phase 1: SEO Foundation | Complete |
| SEO-07 | Phase 1: SEO Foundation | Complete |
| SEO-08 | Phase 1: SEO Foundation | Complete |
| SEO-09 | Phase 1: SEO Foundation | Complete |
| SEO-10 | Phase 1: SEO Foundation | Complete |
| SEO-11 | Phase 1: SEO Foundation | Pending |
| HTML-01 | Phase 1: SEO Foundation | Complete |
| HTML-02 | Phase 1: SEO Foundation | Complete |
| HTML-03 | Phase 1: SEO Foundation | Complete |
| HTML-04 | Phase 1: SEO Foundation | Complete |
| HTML-05 | Phase 1: SEO Foundation | Complete |
| HTML-06 | Phase 1: SEO Foundation | Complete |
| IMG-01 | Phase 2: Image Optimization | Complete |
| IMG-02 | Phase 2: Image Optimization | Complete |
| IMG-03 | Phase 2: Image Optimization | Complete |
| IMG-04 | Phase 2: Image Optimization | Complete |
| IMG-05 | Phase 2: Image Optimization | Complete |
| PAGE-01 | Phase 3: Above-Fold Content | Complete |
| PAGE-02 | Phase 3: Above-Fold Content | Complete |
| PAGE-03 | Phase 3: Above-Fold Content | Complete |
| PAGE-04 | Phase 3: Above-Fold Content | Complete |
| PAGE-05 | Phase 3: Above-Fold Content | Complete |
| PAGE-06 | Phase 3: Above-Fold Content | Complete |
| CONV-01 | Phase 3: Above-Fold Content | Complete |
| CONV-02 | Phase 3: Above-Fold Content | Complete |
| CONV-04 | Phase 3: Above-Fold Content | Complete |
| CONV-05 | Phase 3: Above-Fold Content | Complete |
| PAGE-07 | Phase 4: Below-Fold Content | Complete |
| PAGE-08 | Phase 4: Below-Fold Content | Complete |
| PAGE-09 | Phase 4: Below-Fold Content | Complete |
| PAGE-10 | Phase 4: Below-Fold Content | Complete |
| PAGE-11 | Phase 4: Below-Fold Content | Complete |
| PAGE-12 | Phase 4: Below-Fold Content | Complete |
| PAGE-13 | Phase 4: Below-Fold Content | Complete |
| CONV-03 | Phase 4: Below-Fold Content | Complete |
| PERF-01 | Phase 5: Performance and Mobile | Complete |
| PERF-02 | Phase 5: Performance and Mobile | Complete |
| PERF-03 | Phase 5: Performance and Mobile | Pending |
| MOBL-01 | Phase 5: Performance and Mobile | Pending |
| MOBL-02 | Phase 5: Performance and Mobile | Pending |
| MOBL-03 | Phase 5: Performance and Mobile | Pending |
| MOBL-04 | Phase 5: Performance and Mobile | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
