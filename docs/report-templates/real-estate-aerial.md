# Real Estate Aerial Deliverable Package — SAI Template

> **Service line**: Aerial stills and video for residential, commercial, and land MLS listings; marketing collateral for brokers and agents
> **Grade**: Marketing / Transaction
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "Aerial Marketing Deliverable"`

---

## 1. Project Identification

| Field | Value |
|---|---|
| Client (brokerage) | `{{BROKERAGE}}` |
| Listing Agent | `{{AGENT_NAME}}` — license # `{{LIC}}` |
| Property Address | `{{ADDRESS}}` |
| MLS # | `{{MLS}}` (if assigned at delivery) |
| Listing Type | `{{TYPE}}` (residential / commercial / land / multi-family / industrial) |
| Acreage / Building SF | `{{SIZE}}` |
| Listing Price | `{{PRICE}}` (optional — redact on this report if client prefers) |
| Flight Date | `{{DATE}}` |
| Package Tier | `{{TIER}}` (Standard / Premium / Land-Package / Luxury / Commercial) |

## 2. Deliverable Package Manifest

### 2.1 Standard Package (included unless noted)

| Item | Spec | Count |
|---|---|---|
| Hero stills | 4000+ px long edge, sRGB, ≥ 300 dpi | `{{N_STILLS}}` |
| Aerial video (edited) | 4K @ 30 fps, `{{DURATION}}`, color graded | 1 |
| Video variants | With music + music-free | 2 |
| Orbit flyover | Smooth orbit, `{{RADIUS}}` ft radius | 1 |
| Elevation reveal | Low-to-high reveal shot | 1 |
| Map overlay still | Parcel boundary overlay (county GIS) | 1 |
| Twilight / golden-hour (premium) | `{{INCLUDED}}` Y/N | |

### 2.2 Extended Package (if contracted)

- 3D Matterport-style walkable model (exterior): `{{INCLUDED}}`
- Floor-plan sketch from interior scan: `{{INCLUDED}}` (separate service)
- Neighborhood / POI overview video: `{{INCLUDED}}`
- Voiceover / branded intro & outro: `{{INCLUDED}}`

## 3. Property Description Summary

*Drawn from MLS / agent intake — reproduced for completeness.*

- **Highlights featured in deliverables**: `{{HIGHLIGHTS}}` (waterfront access, pool, acreage, mountain views, barn, outbuildings, dock, etc.)
- **Shot list honored**: full list at Appendix A

## 4. Flight Operations

| Field | Value |
|---|---|
| PIC | `{{PIC}}` — Part 107 `{{CERT}}` |
| Aircraft | `{{AIRCRAFT}}` |
| Weather | See metadata header |
| Sorties | `{{N}}` |
| Flight time | `{{TIME}}` |
| Airspace | Class `{{CLASS}}`, LAANC `{{ID}}` |
| Homeowner / seller consent | ON FILE (signed release, Appendix C) |
| Neighbor property privacy | Flight plan designed to minimize overflight of adjacent private dwellings per §9 |

## 5. Technical Specifications — Stills

| Spec | Value |
|---|---|
| Color space | sRGB (web) + AdobeRGB (print, on request) |
| Resolution | `{{W}} × {{H}}` px minimum |
| File format | JPEG (Q 92) for delivery; RAW DNG archived |
| Editing | Lens correction, exposure, white-balance, highlight recovery, vertical straightening; no composites, no removals of permanent features |
| Watermark | None (client use) |
| Metadata | EXIF retained; photographer-credit IPTC tag `Sentinel Aerial Inspections` |

## 6. Technical Specifications — Video

| Spec | Value |
|---|---|
| Resolution | 3840 × 2160 (4K UHD) |
| Frame rate | 30 fps (standard) / 60 fps (slo-mo b-roll) |
| Codec | H.264 deliverable + H.265 archival |
| Color grade | LUT applied: `{{LUT}}` — natural / vibrant / cinematic |
| Audio tracks | Licensed music (ASCAP/BMI cleared) + music-free variant |
| Branding | Optional SAI bug lower-right 5% opacity, or unbranded |
| Aspect variants | 16:9 hero, 9:16 vertical (social/TikTok), 1:1 square (Instagram feed) on request |

## 7. Shot List Execution

| Shot # | Description | Delivered | Notes |
|---|---|---|---|
| 1 | Hero establishing from NE, 150 ft | ✓ | |
| 2 | Orbit CCW 360° | ✓ | |
| 3 | Elevation reveal front approach | ✓ | |
| 4 | Waterfront reverse-orbit | ✓ | |
| 5 | Parcel overview with boundary overlay | ✓ | |
| 6 | Rooftop condition (if requested) | | |
| 7-N | `{{ADDITIONAL}}` | | |

## 8. Map Overlay Details (for land / large-parcel listings)

- **Parcel boundary source**: `{{COUNTY}} GIS Parcel layer`, retrieved `{{DATE}}`
- **Acreage shown**: `{{ACRES}}` (per county assessor)
- **Disclaimer on overlay**: *"Parcel boundary approximate; derived from public GIS. Not a legal survey. Consult a licensed surveyor for boundary determination."*
- **Additional overlays** (if contracted): contour lines, soils, FEMA flood zone, zoning classification

## 9. Privacy & Regulatory Notes

- Flight paths designed to keep the aircraft within the subject parcel airspace column whenever feasible
- No imagery captured of adjacent-property interiors, windows, fenced private spaces, or identifiable persons
- FAA Part 107 operations; no Part 107.39 waiver used unless non-participating occupants inside the subject property gave written consent
- HOA / community notification: `{{STATUS}}` (N/A or notified per community rule)
- State-specific drone/privacy statute compliance: `{{STATE}}` — reviewed for applicable restrictions

## 10. License & Rights Grant

Per the Sentinel Aerial Inspections MSA dated `{{MSA}}`:

- **Licensee**: `{{BROKERAGE}}` and listing agent `{{AGENT}}`
- **Permitted use**: marketing of the subject property at the address above, including MLS upload, brokerage websites, social media, print collateral, and aggregator syndication
- **Term**: perpetual for the active listing; continuing use rights after sale for marketing of the agent's body of work
- **Transferability**: non-transferable to subsequent owners or brokerages without SAI written consent
- **Photographer credit**: appreciated but not required; IPTC credit tag retained in file metadata
- **SAI retention**: SAI retains copyright and the right to use imagery in its portfolio/marketing

*Custom terms (exclusive use, extended rights, photographer credit requirement) available as contract addenda.*

## 11. File Delivery

- **Primary delivery**: downloadable gallery at `{{PORTAL_LINK}}` (expires `{{EXPIRY}}`)
- **Archive copy**: secondary cloud backup retained for 90 days post-delivery
- **Raw originals**: archived for 2 years; available for recovery at client request

## 12. Release Form (Executed)

*Signed release from the homeowner/seller is included as Appendix C. Required for deliverable release to agent/brokerage.*

## 13. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.7 (real estate).*

Real-estate-specific:
- Imagery captures the property on the flight date; subsequent changes (landscaping, lighting, damage) are not reflected.
- Any implied property condition from imagery is not a warranty. Buyers should conduct professional inspections.
- Acreage, room counts, building SF, and parcel boundaries are as supplied by client/county; SAI does not verify.

## 14. Compliance Attestation

*Include `_shared/compliance_attestation.md`.*

## 15. Appendices

- **A** — Shot list as planned vs. delivered
- **B** — Technical specs sheet for prints
- **C** — Signed homeowner release form
- **D** — License grant language (full MSA excerpt)
- **E** — Flight log + weather + airspace authorization

---

*Questions: info@sentinelaerialinspections.com.*
