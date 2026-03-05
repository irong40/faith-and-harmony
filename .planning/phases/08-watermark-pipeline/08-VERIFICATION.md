---
phase: 08-watermark-pipeline
verified: 2026-03-05T20:15:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 8: Watermark Pipeline Verification Report

**Phase Goal:** The processing pipeline generates watermarked preview thumbnails stored separately from originals, ready to be included in balance due emails
**Verified:** 2026-03-05T20:15:00Z
**Status:** passed
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Watermarked preview thumbnails bucket exists and is publicly readable | VERIFIED | Migration `20260305600000` creates `watermark-previews` bucket with `public=true` and a SELECT policy for anonymous read |
| 2 | Original drone-jobs bucket is private and requires signed URL access | VERIFIED | Migration `20260305600100` sets `public = false` on `drone-jobs` and drops both `drone_jobs_public_read` and `Public read access` policies |
| 3 | drone_jobs table has a preview_urls column to store watermarked preview URLs | VERIFIED | Migration `20260305600200` adds `preview_urls TEXT[] DEFAULT '{}'` with descriptive column comment |
| 4 | Admin UI still displays asset previews after drone-jobs bucket becomes private | VERIFIED | `QADetailModal.tsx` uses `createSignedUrl(storagePath, 3600)` in a useEffect. The `extractStoragePath` helper handles both legacy public URLs and private paths. `mediaUrl` falls back correctly. Zero references to `storage/v1/object/public/drone-jobs` remain in `src/` |
| 5 | After job processing completes, 2 to 3 watermarked preview thumbnails exist in the watermark-previews bucket | VERIFIED | n8n WF1 "Resize and Watermark" Code node selects up to 3 candidates, downloads from private bucket via signed URL, resizes to 1200px, strips EXIF, composites watermark tile at 35% dissolve, and uploads to `watermark-previews/{job_id}/preview_XX.jpg` with `x-upsert: true` |
| 6 | Watermarked preview URLs are accessible without authentication | VERIFIED | Uploaded to `watermark-previews` public bucket. Public URL pattern: `{SUPABASE_URL}/storage/v1/object/public/watermark-previews/{job_id}/preview_XX.jpg` |
| 7 | Preview URLs are stored in the drone_jobs.preview_urls column | VERIFIED | "Save Preview URLs" HTTP Request node PATCHes `drone_jobs?id=eq.{job_id}` with `{ preview_urls: [...] }` |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260305600000_watermark_previews_bucket.sql` | Public watermark-previews bucket | VERIFIED | 18 lines. Creates bucket with 5MB limit, image MIME types, and SELECT policy |
| `supabase/migrations/20260305600100_drone_jobs_private_bucket.sql` | Reverts drone-jobs to private | VERIFIED | 17 lines. Sets `public = false`, drops two public read policies |
| `supabase/migrations/20260305600200_preview_urls_column.sql` | preview_urls column on drone_jobs | VERIFIED | 9 lines. Adds TEXT[] column with default and comment |
| `src/components/drone/QADetailModal.tsx` | Signed URL media display | VERIFIED | 491 lines. Uses `createSignedUrl`, `extractStoragePath` helper handles legacy and private paths |
| `assets/watermark-tile.png` | Tiled diagonal watermark overlay | VERIFIED | 115,077 bytes, valid PNG header (89 50) |
| `scripts/generate-watermark.cjs` | Watermark generation script | VERIFIED | Present for reproducibility |
| `n8n-workflows/wf1-sentinel-pipeline-orchestrator.json` | Pipeline with watermark_preview step | VERIFIED | Contains watermark nodes between qa_gate (Step 5) and delivery. All 6 nodes wired: Step 6 Start, Select Preview Images, Has Preview Candidates?, Resize and Watermark, Save Preview URLs, Step 6 Complete |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Migration 20260305600100 (private bucket) | QADetailModal.tsx | createSignedUrl | WIRED | Line 79: `createSignedUrl(storagePath, 3600)` generates signed URLs for private bucket. `extractStoragePath` normalizes both URL formats |
| n8n WF1 Resize and Watermark node | watermark-previews bucket | HTTP POST upload | WIRED | Uploads to `{SUPABASE_URL}/storage/v1/object/watermark-previews/{storagePath}` with service key auth and upsert header |
| n8n WF1 Save Preview URLs node | drone_jobs.preview_urls | HTTP PATCH | WIRED | PATCHes `drone_jobs?id=eq.{job_id}` with `{ preview_urls: [...] }` via service key |
| assets/watermark-tile.png | n8n Execute Command | Rig deployment path | WIRED | Code node references `/opt/sentinel/assets/watermark-tile.png`. Requires manual deployment to rig (documented in plan) |
| QA Passed? node | Step 6 Start - Watermark Preview | Pipeline connection | WIRED | `connections["QA Passed?"]` output 0 routes to watermark step. Output 1 routes to review pending |
| Step 6 Complete | Trigger Delivery Workflow | Pipeline continuation | WIRED | Both the watermark path and the skip path (no candidates) converge at Step 6 Complete, which connects to delivery |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BILL-03 | 08-01, 08-02 | Watermarked preview thumbnails are generated during the processing pipeline and stored separately from originals | SATISFIED | Public `watermark-previews` bucket for previews, private `drone-jobs` bucket for originals. n8n pipeline generates watermarked previews with tiled overlay, uploads to separate bucket, writes URLs to `preview_urls` column |

No orphaned requirements found. REQUIREMENTS.md maps only BILL-03 to Phase 8, matching the plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| QADetailModal.tsx | 111 | `qa_override_by: "admin"` with comment "In production, use actual user ID" | Info | Pre-existing pattern, not introduced by this phase. Does not block phase goal |

No TODO, FIXME, PLACEHOLDER, or stub patterns found in the phase artifacts.

### Human Verification Required

### 1. Watermark Visual Quality

**Test:** Open `assets/watermark-tile.png` in an image viewer. Verify the diagonal tiled "SENTINEL AERIAL" text covers the full 1200x800 canvas with no large gaps.
**Expected:** White semi-transparent text at 35% opacity on transparent background, with drop shadows. Diagonal pattern prevents cropping recovery.
**Why human:** Visual quality assessment of text coverage, readability, and aesthetic suitability.

### 2. Admin QA Modal After Private Bucket

**Test:** Open admin UI, navigate to a job with drone assets, open QA detail modal.
**Expected:** Images display correctly using signed URLs. No 403 errors. Delete function works.
**Why human:** Requires running app and Supabase instance with migrations applied.

### 3. n8n Pipeline Import and Execution

**Test:** Import updated `wf1-sentinel-pipeline-orchestrator.json` into n8n. Trigger a test pipeline run on a job with processed images.
**Expected:** 2 to 3 watermarked JPEGs appear in `watermark-previews/{job_id}/`. URLs are publicly accessible. `drone_jobs.preview_urls` is populated.
**Why human:** Requires n8n instance, processing rig with ImageMagick, and watermark tile deployed to `/opt/sentinel/assets/watermark-tile.png`.

### 4. Watermark Tile Deployment

**Test:** Copy `assets/watermark-tile.png` to `/opt/sentinel/assets/watermark-tile.png` on the processing rig.
**Expected:** File exists at the path referenced by the n8n Execute Command node.
**Why human:** Runtime deployment step on external infrastructure.

### Gaps Summary

No gaps found. All automated verification checks passed. Phase 8 goal is achieved at the code and configuration level. The watermark pipeline infrastructure is complete and ready for Phase 9 (Billing Lifecycle) to embed preview URLs in balance due emails.

Three manual deployment steps remain before the pipeline runs in production:
1. Apply Supabase migrations (`supabase db push`)
2. Deploy watermark tile to processing rig
3. Import updated WF1 workflow into n8n

These are expected operational steps, not code gaps.

---

_Verified: 2026-03-05T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
