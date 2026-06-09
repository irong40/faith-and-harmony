# TRESTLE

## Field Operations Command Center

### Product Requirements Document

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Date | February 7, 2026 |
| Status | Draft |
| Author | Faith & Harmony LLC |
| Previous Version | 1.1 (January 24, 2026) |

Faith & Harmony LLC | DBA Sentinel Aerial Inspections

Veteran Owned | Hampton Roads, Virginia

### Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 24, 2026 | Initial PRD for field operations PWA |
| 1.1 | Jan 24, 2026 | Technical review: client_storage, isolated Supabase project, LAANC checkbox, haptic feedback, Open in Maps |
| 2.0 | Feb 7, 2026 | Gap analysis integration: unified schema, package_type enum, processing pipeline tables, fleet linkage, expanded mission status, client data model, WebODM local deployment, video processing placeholder |

## 1. Executive Summary

### 1.1 Purpose

Trestle is the field operations command center for Faith & Harmony drone pilots. It manages the full lifecycle of a drone service job from client booking through deliverable handoff. This document defines the functional requirements, data architecture, and integration points for all systems that touch a job.

### 1.2 What Changed in v2.0

Version 1.1 focused on the pilot facing PWA for field operations: mission list, SOP Gatekeeper checklist, flight logging, and offline sync. That scope remains intact. Version 2.0 expands the boundary to include everything upstream and downstream of the field work. Specifically, it addresses 12 gaps identified between the business plan, the v1.1 PRD, the fleet management schema, the authorization service, and the n8n processing workflow.

The core additions are a unified database schema that connects booking through delivery, a formal package_type enum that drives both the pilot experience and the automated processing pipeline, fleet equipment linkage to missions, expanded mission status tracking, client and contact records, and schema definitions for the photo processing tables referenced by the n8n workflow.

### 1.3 Scope

| In Scope (v2.0) | Out of Scope |
|------------------|--------------|
| Unified database schema across all systems | LMS or training platform |
| package_type enum definition | Client facing portal UI |
| drone_assets and qa_results table definitions | Video editing pipeline details |
| Mission status expansion (processing, delivered) | Square payment integration logic |
| Fleet equipment linkage to missions | CRM lead scoring algorithms |
| Client/contact data model | Mobile app native build |
| WebODM local deployment architecture | Brokerage retainer billing system |
| Processing pipeline trigger definitions | Geographic expansion planning |
| Photo upload mechanism requirements | Marketing website |

## 2. System Architecture Overview

The Faith & Harmony operations platform spans five systems that must share data through a single Supabase project. Version 1.1 proposed an isolated trestle-ops Supabase project. Version 2.0 reverses that decision. All tables live in one Supabase instance, organized by schema prefix.

### 2.1 Architecture Decision: Single Supabase Project

The v1.1 PRD called for a separate trestle-ops Supabase project isolated from other Faith & Harmony data. The gap analysis revealed this creates a bridge problem. The missions table needs to reference clients, equipment, authorization data, and trigger processing workflows. Splitting these across projects forces cross project API calls and duplicated data.

Decision: One Supabase project. Tables use naming prefixes to organize by domain. RLS policies enforce access boundaries between pilot, admin, and system roles.

### 2.2 System Components

| System | Purpose | Technology |
|--------|---------|------------|
| Trestle PWA | Field operations: mission management, SOP checklists, flight logging | SvelteKit PWA, offline first |
| n8n Orchestration | Automated photo processing pipeline, delivery packaging, notifications | Cloud hosted n8n, Cloudflare Tunnel to workstation |
| Processing Rig | Lightroom editing, Photoshop labeling, WebODM photogrammetry | i9 14900K, RTX 4090, local WebODM |
| Authorization Service | Airspace analysis, TFR detection, LAANC/CAPS management | TypeScript service on Supabase Edge Functions |
| Fleet Management | Aircraft, battery, controller, and maintenance tracking | Supabase tables with automated health triggers |

### 2.3 Data Flow Summary

A job flows through these phases. Each phase maps to specific database tables and system interactions.

| Phase | System | Tables Touched | Trigger |
|-------|--------|----------------|---------|
| 0. Booking | Website/Admin/Square | clients, missions | Client request |
| 1. Mission Prep | Trestle PWA | missions, mission_authorizations, mission_equipment | Admin assigns mission |
| 2. Field Operations | Trestle PWA | missions, flight_logs, checklist data | Pilot starts mission |
| 3. Photo Upload | Upload page or folder watcher | missions, Supabase Storage | Pilot completes mission |
| 4. EXIF Extraction | Supabase Edge Function | drone_assets | Storage upload webhook |
| 5. QA Gate | n8n + Gemini Pro Vision | qa_results | EXIF extraction complete |
| 6. Package Routing | n8n Switch node | missions (status update) | QA gate pass |
| 7. Processing | Local rig (Lightroom/Photoshop/WebODM) | drone_assets (processed paths) | Package route decision |
| 8. Delivery | n8n + Resend | missions, delivery_log | Processing complete |

## 3. Package Type Definition

This is the single most important alignment decision in the system. The package_type value drives pilot shot plans, n8n routing, Lightroom preset selection, weather threshold lookup, equipment requirements, and delivery formatting. Every system must use these exact values.

### 3.1 Enum Values

| package_type | Display Name | Price | n8n Route | Weather Threshold |
|--------------|-------------|-------|-----------|-------------------|
| re_basic | Basic Package | $250 | Path A: Real Estate | residential_photo |
| re_standard | Standard Package | $400 | Path A: Real Estate | residential_photo |
| re_premium | Premium Package | $650 | Path A: Real Estate | residential_photo |
| construction | Progress Documentation | $300/visit | Path B: Construction | commercial_mapping |
| site_survey | Aerial Mapping | TBD | Path C: WebODM | commercial_mapping |
| inspection | Property Inspection | $175 | Path B variant | precision_inspection |

### 3.2 SQL Migration

This migration adds the package_type enum and converts the existing freeform text column.

```sql
CREATE TYPE package_type_enum AS ENUM ('re_basic', 're_standard', 're_premium', 'construction', 'site_survey', 'inspection');

ALTER TABLE missions ALTER COLUMN package_type TYPE package_type_enum USING package_type::package_type_enum;
```

### 3.3 Cross System Mapping

| package_type | Lightroom Preset | Photoshop Action | WebODM | Deliverable Count |
|--------------|-----------------|------------------|--------|-------------------|
| re_basic | Drone_Basic_v1 | None | No | 10 to 15 photos |
| re_standard | Drone_Standard_v1 | None | No | 20 to 30 photos + social exports |
| re_premium | Drone_Premium_v1 | Sky replacement review | No | 40+ photos + video + 3D model |
| construction | Drone_Construction_v1 | Compass/date label | No | All site photos, labeled |
| site_survey | None (raw for mapping) | None | Yes | Orthophoto, point cloud, 3D model |
| inspection | Drone_Construction_v1 | Compass/date label | No | All inspection photos, labeled |

## 4. Database Schema (New and Changed Tables)

This section defines tables that are new in v2.0 or modified from v1.1. Tables from the fleet management schema and authorization schema remain unchanged. See those documents for aircraft, batteries, controllers, accessories, maintenance_log, airspace_grids, tfr_cache, authorization_requests, mission_authorizations, and weather_thresholds.

### 4.1 clients (NEW)

The v1.1 missions table stored client_name as freeform text. For delivery emails, CRM tracking, and brokerage retainer management, we need a proper client record.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| name | VARCHAR(200) NOT NULL | Individual or company name |
| email | VARCHAR(254) | Required for delivery emails |
| phone | VARCHAR(20) | Optional |
| company | VARCHAR(200) | Brokerage or contractor name |
| client_type | VARCHAR(20) | CHECK: residential, commercial, brokerage, faith_org |
| address | TEXT | Billing or primary address |
| notes | TEXT | Internal notes |
| is_retainer | BOOLEAN DEFAULT false | Brokerage retainer subscriber |
| retainer_credits_remaining | INTEGER DEFAULT 0 | Monthly shoot credits |
| square_customer_id | VARCHAR(100) | Link to Square for payments |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### 4.2 missions (MODIFIED)

Changes from v1.1 are marked. The core structure remains the same. Additions address gaps 3, 4, 5, 7, 9, and 10 from the gap analysis.

| Column | Type | Change | Notes |
|--------|------|--------|-------|
| id | UUID PK | Unchanged | |
| pilot_id | UUID FK profiles(id) | Unchanged | Assigned pilot |
| client_id | UUID FK clients(id) | NEW (replaces client_name) | Links to client record |
| client_name | VARCHAR(200) | DEPRECATED | Kept for migration, nullable |
| address | TEXT NOT NULL | Unchanged | Job site address |
| latitude | DECIMAL(10,7) | NEW | For airspace lookup |
| longitude | DECIMAL(11,7) | NEW | For airspace lookup |
| package_type | package_type_enum | CHANGED from TEXT | Drives all routing |
| status | VARCHAR(20) | EXPANDED | See 4.2.1 for new values |
| scheduled_date | TIMESTAMPTZ | Unchanged | |
| aircraft_id | UUID FK aircraft(id) | NEW | Links to fleet |
| notes | TEXT | Unchanged | |
| job_price | DECIMAL(10,2) | NEW | Actual price charged |
| is_rush | BOOLEAN DEFAULT false | NEW | Rush delivery flag |
| created_at | TIMESTAMPTZ | Unchanged | |
| updated_at | TIMESTAMPTZ | Unchanged | |
| completed_at | TIMESTAMPTZ | NEW | When field work finished |
| delivered_at | TIMESTAMPTZ | NEW | When client received files |

### 4.2.1 Mission Status Values (EXPANDED)

Version 1.1 defined four statuses. The processing pipeline requires additional states to track where a job sits after field work completes.

| Status | v1.1? | Meaning | Set By |
|--------|-------|---------|--------|
| scheduled | Yes | Mission created, not started | Admin on creation |
| in_progress | Yes | Checklist started, pilot on site | Trestle PWA |
| complete | Yes | Field work done, photos on SD card | Trestle PWA |
| uploading | NEW | Photos being transferred to storage | Upload mechanism |
| processing | NEW | n8n pipeline running (edit/label/mapping) | n8n workflow |
| review | NEW | Premium sky replacement or QA hold | n8n workflow |
| delivered | NEW | Client received deliverables | n8n delivery step |
| canceled | Yes | Mission canceled by admin | Admin |
| failed | NEW | Processing failed, needs manual intervention | n8n error handler |

### 4.3 drone_assets (NEW)

Referenced in the workflow validation doc (Phase 3, Phase 4) but never defined. This table stores individual photo records with EXIF metadata and QA results.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| mission_id | UUID FK missions(id) NOT NULL | Parent job |
| storage_path | TEXT NOT NULL | Supabase Storage path (drone-jobs/{job_id}/raw/{filename}) |
| filename | VARCHAR(255) NOT NULL | Original filename from SD card |
| file_size_bytes | BIGINT | Raw file size |
| media_type | VARCHAR(10) | CHECK: photo, video |
| capture_time | TIMESTAMPTZ | From EXIF DateTimeOriginal |
| latitude | DECIMAL(10,7) | From EXIF GPSLatitude |
| longitude | DECIMAL(11,7) | From EXIF GPSLongitude |
| altitude_m | DECIMAL(8,2) | From EXIF GPSAltitude |
| compass_direction | DECIMAL(5,2) | From EXIF GPSImgDirection (used by construction labeling) |
| camera_make | VARCHAR(50) | From EXIF Make |
| camera_model | VARCHAR(100) | From EXIF Model |
| focal_length_mm | DECIMAL(6,2) | From EXIF FocalLength |
| shutter_speed | VARCHAR(20) | From EXIF ExposureTime (e.g., 1/1000) |
| iso | INTEGER | From EXIF ISOSpeedRatings |
| aperture | DECIMAL(4,2) | From EXIF FNumber |
| image_width | INTEGER | Pixel width |
| image_height | INTEGER | Pixel height |
| photo_tag | VARCHAR(20) | CHECK: documentation, mapping (for hybrid jobs, Gap 7) |
| processed_path | TEXT | Path to edited version after processing |
| exif_extracted | BOOLEAN DEFAULT false | Set true after EXIF edge function runs |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### 4.4 qa_results (NEW)

Stores per image quality analysis results from the Gemini Pro Vision QA gate. Each drone_asset gets one qa_results row after analysis.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| asset_id | UUID FK drone_assets(id) NOT NULL UNIQUE | One QA result per asset |
| mission_id | UUID FK missions(id) NOT NULL | Denormalized for query performance |
| blur_score | INTEGER | 0 to 100. Below 85 = flagged |
| exposure_score | DECIMAL(4,2) | Stops from optimal. Above 1.0 = flagged |
| horizon_offset_degrees | DECIMAL(4,2) | Above 2.0 = flagged |
| framing_score | INTEGER | 0 to 100. AI assessed composition |
| is_duplicate | BOOLEAN DEFAULT false | Near duplicate detected |
| overall_pass | BOOLEAN | True if all thresholds met |
| flags | TEXT[] | Array of specific issues: blur, overexposed, underexposed, tilted, duplicate |
| ai_notes | TEXT | Raw AI analysis text for review |
| analyzed_at | TIMESTAMPTZ | When QA ran |
| analyzed_by | VARCHAR(50) | Model used: gemini_pro_vision, gpt4_vision |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### 4.5 delivery_log (NEW)

Tracks what was delivered to the client and when. Supports re delivery and delivery confirmation.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| mission_id | UUID FK missions(id) NOT NULL | Parent job |
| client_id | UUID FK clients(id) | Recipient |
| delivery_method | VARCHAR(20) | CHECK: email, portal, drive_link |
| download_url | TEXT | Signed URL for ZIP download |
| url_expires_at | TIMESTAMPTZ | 7 day default expiry |
| email_sent_at | TIMESTAMPTZ | When Resend fired |
| email_opened_at | TIMESTAMPTZ | Resend webhook tracking |
| downloaded_at | TIMESTAMPTZ | When client clicked download |
| file_count | INTEGER | Number of files in package |
| total_size_bytes | BIGINT | ZIP archive size |
| resend_message_id | VARCHAR(100) | For tracking |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### 4.6 mission_equipment (LINKAGE FIX)

This table exists in the fleet management schema but had no foreign key back to the v1.1 missions table. With the unified schema, the FK now resolves correctly.

The fleet schema mission_equipment table already defines mission_id UUID, equipment_type, equipment_id, and assigned_role. No structural change needed. The fix is that missions and mission_equipment now live in the same Supabase project, so the FK reference works.

### 4.7 flight_logs Integration

The v1.1 flight_logs table captures checklist compliance data (JSONB audit trail). The fleet schema log_flight() function updates aircraft hours and battery cycles. These need to fire together.

When a pilot taps Log Flight in Trestle, two things happen. First, a row inserts into flight_logs with the checklist JSONB data. Second, a database trigger calls log_flight() with the mission aircraft_id and assigned battery IDs from mission_equipment to update fleet stats. This replaces the gap where checklist logging and equipment stat updates were disconnected.

```sql
CREATE OR REPLACE FUNCTION sync_flight_to_fleet() RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_flight(
    NEW.aircraft_id,
    (SELECT array_agg(equipment_id) FROM mission_equipment WHERE mission_id = NEW.mission_id AND equipment_type = 'battery'),
    NEW.duration_minutes
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flight_log_fleet_sync
  AFTER INSERT ON flight_logs
  FOR EACH ROW EXECUTE FUNCTION sync_flight_to_fleet();
```

## 5. Trestle PWA (Retained from v1.1)

The pilot facing PWA requirements from v1.1 remain unchanged. This section summarizes them for completeness. The full v1.1 specifications for UI/UX, offline architecture, local storage, and security still apply.

### 5.1 Core Features

Mission list with status badges. Gatekeeper checklist that blocks flight until all items confirmed. Flight logging with duration and notes. Offline first architecture with conflict flagging. Admin only pilot management.

### 5.2 Changes from v1.1

| Feature | v1.1 | v2.0 |
|---------|------|------|
| Mission status badges | 4 states | 9 states (see 4.2.1) |
| Client display | client_name text field | client.name from FK lookup |
| Equipment display | Not shown | Aircraft nickname and battery assignment from mission_equipment |
| Package type | Freeform text | Enum driven badge with color coding |
| Checklist to fleet sync | Not connected | Triggers log_flight() on completion |
| Coordinates | Not captured | Latitude/longitude stored on mission for airspace lookup |

### 5.3 Gatekeeper Checklist

The checklist items from v1.1 remain. The authorization service check_mission_readiness function can now pre populate weather and airspace items based on mission coordinates and the weather_thresholds for the assigned package_type. The pilot still confirms each item manually, but the system can flag warnings before the pilot arrives on site.

## 6. Processing Pipeline Integration

This section defines how Trestle hands off to n8n and how n8n interacts with the local processing rig. The workflow validation doc (Trestle WebODM Workflow Validation.md) contains the detailed step by step flow. This section captures the requirements and integration contracts.

### 6.1 Photo Upload Mechanism

Gap 2 from the analysis. Photos need to get from the SD card to Supabase Storage. The v1.0 upload mechanism is a simple web page, not a native feature of Trestle PWA.

#### 6.1.1 Upload Page Requirements

Standalone web page (not part of Trestle PWA). Pilot selects mission from dropdown of status = complete missions. Drag and drop or file picker for batch photo upload. Upload target: Supabase Storage at drone-jobs/{mission_id}/raw/{filename}. Progress indicator per file and overall. On completion: update mission status to uploading.

#### 6.1.2 Photo Tagging for Hybrid Jobs

For construction retainer clients who need both progress photos and orthophoto mapping (Gap 7), the upload page presents a toggle per batch. The pilot separates grid flight photos from oblique/detail photos during upload. Each photo gets a photo_tag value (documentation or mapping) written to drone_assets. The n8n routing node checks for mixed tags and splits into parallel sub tasks when both types exist.

### 6.2 Processing Trigger

When all photos for a mission finish uploading, a Supabase database function checks upload completeness and fires a webhook to n8n. The trigger can also be manual: an admin clicks Process in Trestle admin view, which calls the same webhook.

The n8n webhook receives mission_id and package_type. It fetches the full mission record, client record, and drone_assets list from Supabase, then routes to the appropriate processing path.

### 6.3 WebODM Local Deployment

The workflow validation doc originally specified WebODM on a GCP VM. Architecture decision from this conversation: WebODM runs locally on the i9/RTX 4090 processing rig. This eliminates VM lifecycle management (Gap 4 resolved), reduces bandwidth overhead (Gap 6 resolved), and keeps all processing on hardware you own.

n8n reaches the local WebODM instance through the existing Cloudflare Tunnel. The tunnel already provides access for Lightroom and Photoshop automation, so WebODM adds no new infrastructure dependency.

#### 6.3.1 WebODM API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/projects | POST | Create project for the mission |
| /api/projects/{id}/tasks | POST | Upload images and start processing |
| /api/projects/{id}/tasks/{id} | GET | Poll task status |
| /api/projects/{id}/tasks/{id}/download/all.zip | GET | Download results |

### 6.4 Delivery Packaging

After processing completes on any path, n8n uploads results to Supabase Storage at processed/{mission_id}/, creates a ZIP archive, generates a 7 day signed download URL, sends a branded email via Resend with the download link, inserts a row in delivery_log, and updates mission status to delivered.

### 6.5 WebODM Deliverable Formatting (Gap 5)

WebODM produces GeoTIFF orthophotos, LAZ point clouds, OBJ 3D models, and elevation maps. Most clients cannot use these formats directly. The delivery package for site_survey jobs converts the GeoTIFF orthophoto to a high resolution JPEG. It generates a PDF report with the orthophoto image, site address, capture date, and scale bar. The full technical files (GeoTIFF, LAZ, OBJ) go into a subfolder within the ZIP labeled Technical Data. The client sees the JPEG and PDF at the top level.

## 7. Authorization Service Integration

The authorization service (trestle-authorization-service.ts) provides airspace analysis, TFR detection, and mission readiness checks. Version 2.0 connects it to the expanded mission data.

### 7.1 Missing Types File (Gap 8)

The TypeScript service imports from trestle-authorization-types which is not in the project files. All branded types (MissionId, PilotId, AirspaceGridId), interfaces, and type definitions need to be created. This is a prerequisite for the authorization service to compile.

Required types: AirspaceGridId, TfrId, AuthorizationRequestId, MissionAuthorizationId, MissionId, PilotId, WeatherThresholdId, GeoPoint, and all interfaces for database row mappings.

### 7.2 Automated Pre Flight Checks

With latitude/longitude now stored on the mission record, the check_mission_readiness function can run automatically when a pilot opens a mission in Trestle. The Gatekeeper checklist items for weather and airspace can pre populate with GO, CONDITIONAL, or NO GO based on current conditions. The pilot still confirms each item, but the system provides decision support instead of requiring the pilot to check external tools.

### 7.3 Weather Threshold Mapping

The weather_thresholds table uses four profile names. These map to package_type values through the following lookup.

| package_type | Weather Threshold Profile |
|--------------|--------------------------|
| re_basic | residential_photo |
| re_standard | residential_photo |
| re_premium | residential_photo |
| construction | commercial_mapping |
| site_survey | commercial_mapping |
| inspection | precision_inspection |

## 8. Video Processing (Placeholder)

The business plan lists Adobe Media Encoder integration with preset exports for all platforms. The Standard and Premium packages include video coverage and social media exports. No schema, workflow, or technical spec addresses video processing today.

This section is a placeholder. When video processing moves into active development, it will need its own n8n routing path, storage strategy (video files are significantly larger than photos), and export preset definitions for Instagram Reels, YouTube Shorts, TikTok, and standard 16:9 formats.

For now, video deliverables are handled manually outside the automated pipeline.

## 9. Gap Resolution Tracker

The following table tracks all 12 gaps identified in the February 7, 2026 analysis session, their resolution status, and where in this document or the codebase they are addressed.

| Gap | Description | Status | Resolution |
|-----|-------------|--------|------------|
| 1 | Two Supabase projects, no bridge | RESOLVED | Section 2.1: Single Supabase project decision |
| 2 | No drone_assets or qa_results tables | RESOLVED | Section 4.3, 4.4: Full schema definitions |
| 3 | package_type has no enum | RESOLVED | Section 3: Formal enum with cross system mapping |
| 4 | Missions not linked to fleet | RESOLVED | Section 4.2: aircraft_id FK, Section 4.6: mission_equipment linkage |
| 5 | No delivered status | RESOLVED | Section 4.2.1: Nine status values including processing and delivered |
| 6 | PRD checklist disconnected from authorization service | RESOLVED | Section 7.2: Automated pre flight checks |
| 7 | No photo upload bridges Trestle to pipeline | RESOLVED | Section 6.1: Upload page requirements |
| 8 | Authorization types file missing | NOTED | Section 7.1: Types file must be created as prerequisite |
| 9 | flight_logs and log_flight() disconnected | RESOLVED | Section 4.7: Database trigger syncs both |
| 10 | No client/contact table | RESOLVED | Section 4.1: clients table with email, retainer tracking |
| 11 | Video processing unaddressed | NOTED | Section 8: Placeholder for future development |
| 12 | WebODM still references GCP | RESOLVED | Section 6.3: Local deployment on processing rig |

## 10. Development Phases

### 10.1 Phase 1: Schema and Foundation

Run database migrations for package_type enum, clients table, drone_assets, qa_results, delivery_log, and mission table modifications. Create the trestle-authorization-types.ts file. Deploy the flight_log_fleet_sync trigger. Estimated effort: 1 week.

### 10.2 Phase 2: Trestle PWA (from v1.1)

Build the pilot facing PWA per v1.1 specifications with v2.0 modifications (expanded status badges, equipment display, package_type badge, coordinate capture). Estimated effort: 3 to 4 weeks.

### 10.3 Phase 3: Upload and Processing Pipeline

Build the photo upload page. Connect Supabase storage webhook to n8n. Implement Path A (Real Estate) end to end as the first processing route. Validate with a test job from upload through delivery email. Estimated effort: 2 weeks.

### 10.4 Phase 4: Remaining Processing Paths

Implement Path B (Construction) with Photoshop labeling. Implement Path C (Mapping) with local WebODM. Build hybrid job splitting for construction retainer clients. Estimated effort: 2 to 3 weeks.

### 10.5 Phase 5: Authorization and Readiness

Deploy the authorization service types and compile the service. Connect pre flight readiness checks to Trestle Gatekeeper. Implement TFR refresh automation. Estimated effort: 2 weeks.

## 11. Open Questions

| ID | Question | Status | Impact |
|----|----------|--------|--------|
| OQ1 | Should Square handle booking and payment in a single flow, or should booking and payment be separate steps? | OPEN | Gap 1 booking system design |
| OQ2 | What pricing for site_survey (aerial mapping) package? | OPEN | Package pricing, business plan update |
| OQ3 | Should the upload page live inside Trestle PWA or as a separate app? | OPEN | Architecture and deployment |
| OQ4 | Video processing priority: when does it move from placeholder to active development? | OPEN | Section 8 expansion timing |
| OQ5 | Should the authorization types file use Zod schemas or plain TypeScript interfaces? | OPEN | Developer preference, runtime validation |
| OQ6 | Mini 4 Pro operations: should mini_operations weather threshold map to any package_type or remain equipment specific? | OPEN | Weather threshold coverage |

## 12. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Operations Review | | | |

*End of Document*
