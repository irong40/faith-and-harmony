## Session Context
At session start, read `.claude/session-handoff.md` and `.claude/project-state.json` for last session's context.
At session end, run /qend to save handoff notes.

# Sentinel Aerial Inspections / Faith & Harmony LLC

## Project Identity

Faith & Harmony LLC, doing business as Sentinel Aerial Inspections. 100% veteran owned drone services company based in Hampton Roads, Virginia. Owner is Dr. Adam Pierce, U.S. Army veteran (Captain, 9 years active duty). Primary MOS 13A Field Artillery, Functional Area 53A Information Systems Management.

Services include aerial photography, 3D photogrammetry, and property inspections for real estate professionals, commercial contractors, and faith based organizations across Virginia, Maryland, and Northern North Carolina.

The company differentiates through an AI powered quality assurance pipeline that validates every image for blur, exposure, and technical compliance before delivery. This automation enables consistent quality at scale without requiring artistic expertise for every job.

The competitive moat centers on Hampton Roads military airspace expertise (Norfolk Naval Station, NAS Oceana, Langley AFB) combined with enterprise grade equipment and automated processing.

## Writing Constraints (All Outputs)

These rules apply to every piece of text Claude produces in this project. No exceptions.

**Voice and Tone**
- Use active voice. Not "The meeting was canceled by management" but "Management canceled the meeting."
- Address readers directly with "you" and "your" when applicable.
- Maintain a natural, conversational tone. "But that's not how it works in real life."
- Keep it real. "This approach has problems."
- Use definitive statements over conditionals. "This approach improves results" not "This approach might improve results."

**Formatting Prohibitions**
- Never use any type of dash character. No hyphens in compound words, no en dashes, no em dashes. Rewrite sentences to avoid them entirely.
- No semicolons.
- No emojis.
- No asterisks for emphasis.
- No colons in prose (acceptable in code, config files, and technical schemas).
- No hashtags.

**Language Rules**
- No cliches or jargon.
- No marketing language. Not "Our cutting edge solution delivers unparalleled results" but "Our tool can help you track expenses."
- No AI filler phrases. Never use "it's important to note," "as we can see," "gamechanger," "streamline," "boosting," "it's not just but," "let's explore this fascinating opportunity," "genuinely," "honestly," "straightforward."
- No filler phrases. Get to the point.
- Use simple language. "We need to fix this problem."
- Use concrete, specific language. Not "Let's touch base to move the needle" but "Let's meet to discuss how to improve this project."

**Sentence Structure**
- Vary sentence lengths. Short. Medium. Longer when the explanation needs room.
- Mix short punchy sentences with longer explanatory ones.
- Use simple punctuation that keeps readers moving forward.

## Technology Stack

| System | Technology | Purpose |
|--------|-----------|---------|
| Database | Supabase (single project) | All tables, auth, storage, edge functions |
| Workflow Automation | n8n (cloud hosted) | Photo processing pipeline, delivery, notifications |
| Processing Rig | i9 14900K, RTX 4080, 64GB RAM, 2TB NVMe | Lightroom editing, Photoshop labeling, WebODM photogrammetry |
| Field App | React + TypeScript + Vite + shadcn/ui + Tailwind | Mission management, SOP checklists, flight logging |
| Authorization Service | TypeScript on Supabase Edge Functions | Airspace analysis, TFR detection, LAANC/CAPS management |
| Fleet Management | Supabase tables with automated triggers | Aircraft, battery, controller, maintenance tracking |
| Payments | Square | Client booking and payment processing |
| Email Delivery | Resend | Client delivery notifications |
| QA Engine | Gemini Pro Vision (via n8n) | Automated image quality validation |
| Mapping Software | DJI Terra Pro + WebODM (local) | Photogrammetry processing |
| Post Processing | Adobe Creative Cloud | Lightroom, Photoshop, Media Encoder |
| Tunnel | Cloudflare Tunnel | n8n cloud to local processing rig connectivity |

## Architecture Decisions

**Single Supabase Project.** All tables live in one Supabase instance organized by naming prefix. RLS policies enforce access boundaries between pilot, admin, and system roles. The v1.1 PRD proposed an isolated trestle ops project but the gap analysis revealed that splitting creates a bridge problem. Missions need to reference clients, equipment, authorization data, and trigger processing workflows.

**WebODM runs locally.** Not on a GCP VM. The i9/RTX 4090 processing rig handles all photogrammetry. n8n reaches WebODM through the existing Cloudflare Tunnel. No new infrastructure dependency.

**package_type enum drives everything.** The package_type value controls pilot shot plans, n8n routing, Lightroom preset selection, weather threshold lookup, equipment requirements, and delivery formatting. Values include re_basic, re_standard, re_premium, construction, inspection, and site_survey.

## Equipment Fleet

| Aircraft | Role | Key Specs |
|----------|------|-----------|
| DJI Matrice 4E | Primary (commercial mapping, inspections) | Mechanical shutter, built in RTK, 49 min flight time, 5 directional oblique capture |
| DJI Mavic 3 Enterprise | Secondary (residential, backup) | 4/3 CMOS Hasselblad sensor, mechanical shutter, compact form factor |
| DJI Mini 4 Pro | Residential lightweight work | Current operational aircraft during pre launch phase |

Supporting equipment includes Emlid Reach RS3 for survey grade RTK positioning (functions as both base station and rover, sends corrections to DJI controllers via NTRIP Caster), TB65 batteries, and DJI RC Plus 2 controller.

## Pricing (Locked Values)

These prices are canonical. Do not substitute web pricing or estimates.

**Residential Packages**
- Listing Lite: $225 (10 photos, sky replacement, next day delivery)
- Listing Pro: $450 (25 photos, 60 second reel, 2D boundary overlay, 48 hour turnaround)
- Luxury Listing: $750 (40+ photos, 2 minute cinematic video, twilight shoot, 24 hour priority)

**Commercial Packages**
- Construction Progress: $450/visit (orthomosaic, site overview, date stamped archive)
- Commercial Marketing: $850 (4K video, 3D model, raw footage, perpetual license)
- Inspection Data: $1,200 (inspection grid photography, annotated report, exportable data)

**Add Ons**
- Rush Premium: +25% (24 hour), +50% (same day)
- Raw File Buyout: +$250
- Brokerage Retainer: $1,500/month for 5 Listing Pro shoots (use it or lose it)

## Equipment Pricing (Locked Values)

- Matrice 4E (aircraft): $5,189
- Matrice 4 Series Battery (each): $506 (listed as $900 per TB65 in some contexts, verify which battery model)
- Emlid Reach RS3: $2,999
- DJI Terra Pro (1 year): $2,799
- DJI Care Enterprise Plus (M4E, 1 year): $499
- Mavic 3 Enterprise Fly More Combo: $5,949
- DJI RC Pro Enterprise Controller: $1,169
- DJI Care Enterprise Plus (M3E, 2 year): $519
- Matrice 4E subtotal: $12,530
- Mavic 3 Enterprise subtotal: $7,795.70
- Total equipment investment: approximately $20,326

## Financial Targets

| Metric | Year 1 (2026) | Year 2 (2027) | Year 3 (2028) |
|--------|---------------|---------------|---------------|
| Revenue | $92,000 | $198,000 | $372,000 |
| Operating Costs | $60,000 | $110,000 | $192,000 |
| Net Income | $32,000 | $88,000 | $180,000 |
| Net Margin | 35% | 44% | 48% |
| Total Jobs | 200 | 380 | 520 |
| Brokerage Retainers | 1 | 3 | 5 |

Break even at 20 jobs per month, projected by Month 6.

## Data Flow (Job Lifecycle)

A job flows through eight phases. Each phase maps to specific database tables and system interactions.

1. **Booking** via Website/Admin/Square touches clients and missions tables
2. **Mission Prep** in Trestle PWA touches missions, mission_authorizations, mission_equipment
3. **Field Operations** in Trestle PWA touches missions, flight_logs, checklist data
4. **Photo Upload** via upload page touches missions and Supabase Storage
5. **EXIF Extraction** via Supabase Edge Function populates drone_assets
6. **QA Gate** via n8n + Gemini Pro Vision populates qa_results
7. **Processing** on local rig (Lightroom/Photoshop/WebODM) updates drone_assets with processed paths
8. **Delivery** via n8n + Resend updates missions and delivery_log

## n8n Pipeline (Workflow 1 of 3)

The processing pipeline runs locally on the i9/RTX 4090 rig. n8n is cloud hosted but reaches local services through Cloudflare Tunnel.

Environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY (service role, not anon).

Credentials: Sentinel Webhook Auth (X Sentinel Key header) and Supabase HTTP (apikey header with service key).

The pipeline trigger receives POST from folder watcher with mission_id and file_count. It validates mission status equals "complete," fetches processing template for the package_type, builds a step plan, and routes to package specific processing paths.

Workflow 2 handles QA Resume (webhook that resumes from QA hold points). Workflow 3 handles ADIAT Review Resume.

## Trestle PWA (Field Operations)

React + TypeScript + Vite PWA with offline first architecture. Manages mission lifecycle from assignment through field completion. Features include mission list, SOP Gatekeeper checklist, flight logging, equipment display, and coordinate capture.

Development phases from the PRD:
1. Schema and Foundation (1 week)
2. Trestle PWA build per v1.1 specs with v2.0 modifications (3 to 4 weeks)
3. Upload and Processing Pipeline, Path A Real Estate end to end (2 weeks)
4. Remaining Processing Paths B and C (2 to 3 weeks)
5. Authorization and Readiness (2 weeks)

## Training Program

12 module curriculum split into two parts.

**Part I (Modules 1 through 6):** FAA Part 107 certification prep. Regulations, Airspace, Weather, Loading and Performance, Operations, Exam Prep. Estimated 4 to 5 hours total.

**Part II (Modules 7 through 12):** Faith and Harmony flight operations. Mission Planning, 2D Mapping, 3D Modeling, Precision Inspection, Post Flight Verification, Data Ingest and Automation. Estimated 2.5 to 3.5 hours total.

Module 1 (Regulations) and Module 2 (Airspace) are completed as pilot modules. Branding uses F&H purple (#5B2C6F) and gold (#C9A227).

Modules 11 and 12 are internal only. The n8n workflow details and AI integration specifics are proprietary operational moat. Do not publish.

## Key Project Files

Reference these documents for detailed specifications:

| File | Contents |
|------|----------|
| Trestle_PRD_v2_0.md | Complete product requirements for field ops platform |
| trestle-fleet-schema.sql | Fleet management database schema |
| trestle-authorization-schema.sql | Airspace authorization database schema |
| trestle-authorization-service.ts | TypeScript authorization service |
| 002_battery_mission_tracking.sql | Battery and mission tracking migrations |
| 002b_airframe_flight_history.sql | Airframe flight history tracking |
| sentinel_pipeline_orchestrator.json | n8n workflow JSON (Workflow 1) |
| sentinel_pipeline_reference.md | Pipeline node map and integration docs |
| FH_Business_Plan_Feb2026.docx | Current business plan (Work Vessels for Veterans grant version) |
| fh-training-prd.md | Training program product requirements |
| FH_Training_Demand_Map.docx | Module prioritization and content strategy |
| sentinel-landing.html | Marketing landing page |

## Nomenclature

Use these exact names. Do not substitute or abbreviate.

- "Matrice 4E" (never "Mavic 4" or "M4E" unless in a table where space is constrained)
- "Mavic 3 Enterprise" (never "M3E" unless in a table)
- "Faith and Harmony LLC" or "Faith & Harmony LLC" (the ampersand is acceptable)
- "Sentinel Aerial Inspections" (full DBA name)
- "Trestle" (the field operations command center app)
- "Emlid Reach RS3" (the RTK base station/rover, never "Reach 3" or "RS3" alone in formal documents)
- "package_type" (the enum that drives the entire system)
- "Hampton Roads" (the service area, never "Norfolk area" or "Virginia Beach area" alone)

## Coding Guidelines

See the full v2.0 guidelines in user preferences. Key points for quick reference:

- Test Driven Development. Scaffold stub, write failing test, implement.
- Use branded types for IDs. `type UserId = Brand<string, 'UserId'>`
- Use `import type { ... }` for type only imports.
- Default to `type` over `interface`.
- Conventional Commits for git messages.
- Never reference Claude or Anthropic in commit messages.
- Co locate unit tests in `*.spec.ts` files alongside source.
- Separate pure logic unit tests from database integration tests.
- Maintain a persistent rotating dev log excluded from git.
- State intent before using tools or integrations.

## Q Commands

- **QNEW** Apply all guidelines. Check memory for project context. Identify available integrations.
- **QPLAN** Analyze codebase for minimal impact plans. Output numbered action plan with gates.
- **QCODE** Implement in atomic commits. Run tests, lint, typecheck after each unit. Stop at first failing gate.
- **QCHECK** Skeptical checklist driven review. Output PASS, CONCERNS, or FAIL.
- **QGIT** Stage, commit, push with Conventional Commits. Verify all gates pass.
- **QMEM** Search past conversations and memory for context relevant to current task.
- **QINT** List available integrations and propose chains for current task.
