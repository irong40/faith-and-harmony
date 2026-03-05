---
phase: 08-watermark-pipeline
plan: 01
subsystem: database, infra
tags: [supabase, storage, migrations, signed-urls, rls]

requires:
  - phase: none
    provides: existing drone-jobs bucket and QADetailModal component
provides:
  - Public watermark-previews storage bucket for preview thumbnails
  - Private drone-jobs bucket requiring signed URL access for originals
  - preview_urls TEXT[] column on drone_jobs for watermarked preview URLs
  - QADetailModal signed URL media display pattern
affects: [08-watermark-pipeline, n8n-pipeline, balance-due-email]

tech-stack:
  added: []
  patterns: [signed URL generation via createSignedUrl for private bucket access, extractStoragePath helper for URL pattern normalization]

key-files:
  created:
    - supabase/migrations/20260305600000_watermark_previews_bucket.sql
    - supabase/migrations/20260305600100_drone_jobs_private_bucket.sql
    - supabase/migrations/20260305600200_preview_urls_column.sql
  modified:
    - src/components/drone/QADetailModal.tsx

key-decisions:
  - "1 hour signed URL expiry for admin QA modal media display"
  - "extractStoragePath handles both legacy public URLs and new private paths"

patterns-established:
  - "Signed URL pattern: use createSignedUrl(path, 3600) for private bucket media in admin UI"
  - "Storage path extraction: normalize both public and private URL formats to bucket-relative paths"

requirements-completed: [BILL-03]

duration: 2min
completed: 2026-03-05
---

# Phase 8 Plan 1: Storage Infrastructure Summary

**Public watermark-previews bucket, private drone-jobs bucket with signed URL access, and preview_urls column for balance due email thumbnails**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T19:38:48Z
- **Completed:** 2026-03-05T19:41:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created public watermark-previews bucket with 5 MB limit and image MIME type restrictions
- Reverted drone-jobs bucket to private, dropping all anonymous read policies
- Added preview_urls TEXT[] column to drone_jobs for storing watermarked preview URLs
- Updated QADetailModal to use signed URLs for media display instead of direct public URL access

## Task Commits

Each task was committed atomically:

1. **Task 1: Create storage bucket migrations** - `79fc035` (feat)
2. **Task 2: Fix QADetailModal for private drone-jobs bucket** - `1cdfc5d` (fix)

## Files Created/Modified
- `supabase/migrations/20260305600000_watermark_previews_bucket.sql` - Creates public watermark-previews bucket with SELECT policy
- `supabase/migrations/20260305600100_drone_jobs_private_bucket.sql` - Reverts drone-jobs to private, drops public read policies
- `supabase/migrations/20260305600200_preview_urls_column.sql` - Adds preview_urls TEXT[] column to drone_jobs
- `src/components/drone/QADetailModal.tsx` - Signed URL generation for media display, updated delete path extraction

## Decisions Made
- Used 1 hour (3600 seconds) expiry for signed URLs in the admin QA modal. Long enough for a review session, short enough to limit exposure.
- Created extractStoragePath helper that handles both legacy public URL patterns and future private/authenticated patterns. This ensures backward compatibility with existing file_path values stored before the bucket went private.

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None. Migrations will apply on next `supabase db push`. No external service configuration required.

## Next Phase Readiness
- Storage infrastructure is ready for the n8n watermark pipeline step
- The watermark-previews bucket accepts uploads via service role key
- The preview_urls column is ready to receive public URLs from the n8n pipeline
- Admin QA modal continues to display assets from the now-private drone-jobs bucket

---
*Phase: 08-watermark-pipeline*
*Completed: 2026-03-05*
