---
phase: 08-watermark-pipeline
plan: 02
subsystem: infra
tags: [n8n, imagemagick, watermark, supabase-storage, pipeline]

requires:
  - phase: 08-01
    provides: "watermark-previews public bucket, drone-jobs private bucket, preview_urls column"
provides:
  - "Tiled diagonal watermark PNG asset for compositing over preview images"
  - "n8n WF1 watermark_preview step that selects top QA images, resizes, watermarks, uploads, and saves URLs"
affects: [09-billing-lifecycle, delivery]

tech-stack:
  added: [canvas (npm, already present from Phase 7)]
  patterns: [n8n Execute Command with ImageMagick for image processing on local rig]

key-files:
  created:
    - assets/watermark-tile.png
    - scripts/generate-watermark.cjs
  modified:
    - n8n-workflows/wf1-sentinel-pipeline-orchestrator.json

key-decisions:
  - "Used canvas npm package (from Phase 7) to generate watermark tile programmatically"
  - "ImageMagick via n8n Execute Command node for resize and composite on local rig"
  - "Watermark tile deployed to /opt/sentinel/assets/watermark-tile.png on processing rig"

patterns-established:
  - "Watermark compositing via dissolve at 35% opacity for visible but non-destructive overlay"
  - "Pipeline step insertion pattern between qa_gate and packaging in WF1"

requirements-completed: [BILL-03]

duration: 15min
completed: 2026-03-05
---

# Phase 8 Plan 02: Watermark Pipeline Summary

**Tiled diagonal watermark PNG asset and n8n WF1 watermark_preview step that selects top QA images, resizes to 1200px, composites watermark overlay, strips EXIF, uploads to public bucket, and writes preview URLs to drone_jobs**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-05T19:45:00Z
- **Completed:** 2026-03-05T20:00:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Generated a 1200x800 tiled diagonal watermark PNG with "SENTINEL AERIAL" text covering the full canvas at 35% opacity with drop shadows for visibility on light backgrounds
- Added 5 new n8n nodes to WF1 pipeline (Select Preview Images, Download Original, Resize and Watermark, Upload Preview, Save Preview URLs) inserted between qa_gate and packaging
- Pipeline handles 0 to 3 preview images gracefully and continues to packaging regardless of watermark outcome

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate watermark tile PNG asset** - `60d05cc` (feat)
2. **Task 2: Add watermark_preview step to n8n WF1 pipeline** - `31adbc5` (feat)
3. **Task 3: Verify watermark pipeline end to end** - checkpoint approved (no commit needed)

## Files Created/Modified
- `assets/watermark-tile.png` - 1200x800 tiled diagonal watermark overlay with transparent background
- `scripts/generate-watermark.cjs` - Node.js script to regenerate watermark tile using canvas package
- `n8n-workflows/wf1-sentinel-pipeline-orchestrator.json` - Updated pipeline with watermark_preview step between qa_gate and packaging

## Decisions Made
- Used the canvas npm package (already a dependency from Phase 7 PWA icon generation) to create the watermark tile programmatically rather than a static design tool
- ImageMagick Execute Command node chosen over n8n Edit Image node for reliable resize and composite operations on the local processing rig
- Watermark tile path hardcoded to /opt/sentinel/assets/watermark-tile.png on the rig (user must deploy the file there)

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The following manual steps are needed before the watermark pipeline runs in production:

1. Deploy `assets/watermark-tile.png` to `/opt/sentinel/assets/watermark-tile.png` on the processing rig
2. Import the updated `wf1-sentinel-pipeline-orchestrator.json` into n8n
3. Apply any pending Supabase migrations from Plan 08-01 if not already done

## Next Phase Readiness
- Watermarked preview URLs will be available in drone_jobs.preview_urls for Phase 9 (Billing Lifecycle) balance due emails
- The watermark-previews bucket is public so clients can view previews without authentication
- Original images remain protected in the private drone-jobs bucket

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 08-watermark-pipeline*
*Completed: 2026-03-05*
