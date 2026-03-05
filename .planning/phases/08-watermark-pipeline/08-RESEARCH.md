# Phase 8: Watermark Pipeline - Research

**Researched:** 2026-03-05
**Domain:** Image watermarking, Supabase Storage bucket architecture, n8n pipeline integration
**Confidence:** HIGH

## Summary

Phase 8 generates watermarked preview thumbnails during the processing pipeline and stores them separately from full resolution originals. The watermarking runs on the local processing rig (i9 14900K, RTX 4080, 64GB RAM) via n8n, not in Supabase edge functions. This is a locked decision from STATE.md based on the 512 MB edge function memory limit and the fact that DJI aerial photos are 20 to 40 MP (15 to 30 MB each).

The architecture requires two storage locations with different access policies. Watermarked previews go in a public bucket (or public prefix) so balance due emails can embed them without authentication. Full resolution originals stay in the existing `drone-jobs` bucket which was made public in migration 20260125140000. That public status on `drone-jobs` is a problem that this phase must fix. Originals need signed URL access only, while previews need unauthenticated access.

**Primary recommendation:** Add a new `watermark-previews` public Supabase Storage bucket for watermarked thumbnails. Revert `drone-jobs` bucket to private (service role upload, signed URL download). Add a watermark step to the n8n pipeline (WF1) using either the n8n Edit Image node (composite operation) or an Execute Command node calling ImageMagick on the local rig. Store 2 to 3 resized, watermarked JPEGs per job in the new bucket. Record preview URLs in a new `preview_urls` column on `drone_jobs` or `processing_jobs`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-03 | Watermarked preview thumbnails are generated during the processing pipeline and stored separately from originals | n8n pipeline watermark step + separate `watermark-previews` bucket + private originals bucket with signed URLs |
</phase_requirements>

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| n8n Edit Image node | Built in (n8n 2.9.0+) | Composite watermark overlay on images | Uses GraphicsMagick under the hood. Supports composite operation with gravity and positioning. Already available in the running n8n instance. |
| ImageMagick (fallback) | v7.x | Command line watermark compositing | Installed on the processing rig. Used via n8n Execute Command node if Edit Image node has limitations. |
| Supabase Storage | Current | Separate buckets for previews vs originals | Already in use. New bucket for watermarked previews. |
| Supabase JS Client | ^2.86.0 | Upload watermarked files from n8n via REST API | n8n uses HTTP Request nodes against Supabase REST API with service key. |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| n8n HTTP Request node | Upload watermarked images to Supabase Storage | After watermark generation, upload to `watermark-previews` bucket |
| n8n Code node | Select 2 to 3 representative images from job assets | Before watermarking, pick best images by QA score or sort order |
| Supabase migration | Create `watermark-previews` bucket and fix `drone-jobs` privacy | Database migration run before pipeline changes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| n8n Edit Image node | n8n Execute Command + ImageMagick CLI | Execute Command is disabled by default in n8n 2.0+ for security. Edit Image is the built in approach. Use Execute Command only if Edit Image composite lacks needed control. |
| n8n pipeline watermarking | Supabase edge function with imagemagick_deno | Edge functions have 512 MB memory limit. Full resolution aerial photos (15 to 30 MB) would need resize before processing. The local rig has 64 GB RAM. Decision locked in STATE.md. |
| Separate `watermark-previews` bucket | Prefix in existing bucket (`watermarked/` in `drone-jobs`) | Same bucket means same access policy. Cannot make previews public while keeping originals private in the same bucket without complex RLS path matching. Separate bucket is cleaner. |
| Creating watermark PNG asset | Text overlay via ImageMagick | Text overlay requires font configuration on the rig. A pre-made PNG watermark with alpha transparency is simpler, more consistent, and brand aligned. |

## Architecture Patterns

### Storage Bucket Layout

```
Supabase Storage Buckets:
  drone-jobs (PRIVATE - fix from current public state)
    ├── {job_id}/
    │   ├── raw/           # Original uploads from field
    │   └── processed/     # Lightroom exports, labeled versions
    │
  drone-processed-assets (PUBLIC - existing, for 3D models/orthos)
    └── {job_id}/
        └── ...

  watermark-previews (PUBLIC - NEW)
    └── {job_id}/
        ├── preview_01.jpg  # Resized + watermarked
        ├── preview_02.jpg
        └── preview_03.jpg
```

### Pattern 1: n8n Watermark Pipeline Step

**What:** After the processing pipeline completes Lightroom export and QA gate, a new step selects 2 to 3 images, resizes them to preview dimensions (1200px max width), composites a watermark overlay, and uploads results to the `watermark-previews` bucket.

**When to use:** Every job that passes the QA gate and enters the packaging/delivery phase.

**Pipeline step insertion point:**

```
Existing WF1 steps:
  1. file_detect
  2. exif_extract
  3. coverage_check
  4. lightroom_edit
  5. qa_gate
  6. packaging
  7. delivery

Updated WF1 steps:
  1. file_detect
  2. exif_extract
  3. coverage_check
  4. lightroom_edit
  5. qa_gate
  6. watermark_preview  <-- NEW step
  7. packaging
  8. delivery
```

### Pattern 2: Image Selection for Previews

**What:** Select the best 2 to 3 images from the job's processed assets. Use `qa_score` from `drone_assets` to pick the highest scored images. If QA scores are not available (QA was skipped or all scores are equal), fall back to `sort_order` and pick the first 3.

**Selection logic (n8n Code node):**

```javascript
// Fetch processed assets for the job, ordered by qa_score descending
// Take top 3 (or fewer if job has fewer images)
const assets = $json.assets
  .filter(a => a.processing_status === 'processed' && a.file_type === 'image')
  .sort((a, b) => (b.qa_score || 0) - (a.qa_score || 0))
  .slice(0, 3);

return assets.map(a => ({
  json: {
    asset_id: a.id,
    file_path: a.processed_path || a.file_path,
    file_name: a.file_name,
    job_id: a.job_id
  }
}));
```

### Pattern 3: Watermark Overlay Design

**What:** A semi transparent PNG overlay with "SENTINEL AERIAL" text and the company logo, positioned diagonally across the center of the image. The watermark must cover enough of the image that cropping cannot remove it while recovering a usable photo.

**Watermark specifications:**
- Format: PNG with alpha transparency
- Size: Match preview dimensions (1200x800 or similar)
- Opacity: 30 to 40% (visible but does not obscure the property)
- Position: Center, rotated 30 to 45 degrees diagonally
- Coverage: Text repeated in a tile pattern across the full image, not just a corner logo
- Color: White text with slight drop shadow for visibility on both light and dark areas

**Why tiled:** A single corner watermark can be cropped out. A center watermark can be cloned over. A tiled diagonal pattern across the entire image prevents recovery of the original through cropping or cloning.

### Anti-Patterns to Avoid

- **Corner only watermark:** Can be cropped out in seconds. Use tiled diagonal pattern instead.
- **Watermarking at email send time:** Edge function memory limits make this unreliable. Generate during pipeline.
- **Storing previews in the same bucket as originals:** Impossible to have different access policies. Use separate bucket.
- **Public originals bucket:** The current `drone-jobs` bucket is public (migration 20260125140000). This must be reverted to private. Originals should only be accessible via signed URLs or service role key.
- **Full resolution watermarks:** Watermark the preview size (1200px wide), not the full resolution (5000px+). Saves storage, bandwidth, and processing time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compositing | Custom canvas code in JavaScript | n8n Edit Image node (composite) or ImageMagick CLI via Execute Command | Battle tested image processing with proper color space handling, EXIF preservation, memory management |
| Image resizing | Manual pixel manipulation | n8n Edit Image node (resize) or ImageMagick `magick convert -resize 1200x` | Handles aspect ratio, color profiles, sharpening automatically |
| Tiled watermark pattern | Manual positioning loop | ImageMagick `-tile` compositing or pre-made tiled watermark PNG | ImageMagick can tile a watermark across an image in a single command |
| Storage bucket creation | Manual Supabase dashboard setup | SQL migration | Reproducible, version controlled, works across environments |
| Signed URL generation | Custom token system | Supabase `createSignedUrl()` method | Built in, handles expiry, works with RLS |

## Common Pitfalls

### Pitfall 1: drone-jobs Bucket Is Currently Public

**What goes wrong:** The `drone-jobs` bucket was made public in migration `20260125140000_drone_jobs_public_bucket.sql`. This means ALL files in this bucket, including full resolution originals, are accessible to anyone with the URL. A client who receives watermarked preview URLs could potentially guess or discover the original file URLs and download them without paying.

**Why it happens:** The bucket was made public for QA analysis and admin UI preview during earlier phases. The watermarking requirement (originals behind a paywall) was not yet implemented.

**How to avoid:** Create a migration that reverts `drone-jobs` to private (`public = false`). Remove or update the public read policy. Add a new policy allowing signed URL access. The admin UI and QA functions already use the service role key, which bypasses RLS. The n8n pipeline also uses the service role key. The only thing that breaks is direct public URL access to raw images, which is exactly what we want to prevent.

**Warning signs:** Anyone can access `{SUPABASE_URL}/storage/v1/object/public/drone-jobs/{job_id}/{file}` without authentication.

### Pitfall 2: Watermark Not Covering Enough of the Image

**What goes wrong:** A small watermark in the center or corner of the image can be removed by cropping. The client gets a usable photo without paying the balance.

**Why it happens:** Developers optimize for aesthetics (small, unobtrusive watermark) when the goal is content protection.

**How to avoid:** Use a tiled diagonal watermark pattern that covers the entire image. The pattern should repeat "SENTINEL AERIAL" or similar text across the full frame at 30 to 40% opacity. This makes cropping ineffective because every portion of the image contains the watermark.

### Pitfall 3: EXIF Data Leaking GPS Coordinates in Preview

**What goes wrong:** Watermarked preview thumbnails retain EXIF metadata from the original, including GPS coordinates of the property. This leaks location data to anyone viewing the preview.

**Why it happens:** ImageMagick preserves EXIF by default during composite operations.

**How to avoid:** Strip EXIF metadata from preview thumbnails during the resize step. ImageMagick command: `magick input.jpg -resize 1200x -strip output.jpg`. The `-strip` flag removes all EXIF, IPTC, and ICC profiles.

### Pitfall 4: n8n Edit Image Node Missing or Disabled

**What goes wrong:** The n8n Edit Image node requires GraphicsMagick to be installed on the system. If GraphicsMagick is not available in the n8n Docker container or installation, the node throws an "internal error" at runtime.

**Why it happens:** n8n's Edit Image node wraps the `gm` npm package which calls GraphicsMagick or ImageMagick as a subprocess. Self-hosted n8n installations may not include GraphicsMagick by default.

**How to avoid:** Verify GraphicsMagick or ImageMagick is available in the n8n environment before building the workflow. If not available, install it in the Docker container or use the Execute Command node with ImageMagick directly (which is installed on the local rig). Test the composite operation with a sample image before integrating into the full pipeline.

### Pitfall 5: Race Condition Between Watermark Step and Balance Email

**What goes wrong:** Phase 9 (Billing Lifecycle) will send a balance due email with watermarked preview URLs. If the balance email triggers before the watermark step completes, the email contains broken image links.

**How to avoid:** The watermark step must complete and write preview URLs to the database before any balance email logic can reference them. Store preview URLs in the database (on `drone_jobs` or a new `job_previews` table) so the balance email function can verify they exist before sending. Phase 9 should gate the balance email on preview URL availability.

## Code Examples

### Supabase Migration: Create watermark-previews Bucket

```sql
-- Create public bucket for watermarked preview thumbnails
-- Previews are accessible without authentication (embedded in balance due emails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'watermark-previews',
  'watermark-previews',
  true,
  5242880, -- 5 MB max per preview
  ARRAY['image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Anyone can view previews (public bucket)
CREATE POLICY "Public read watermark previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'watermark-previews');

-- Service role uploads previews (n8n uses service key)
-- No additional policy needed; service_role bypasses RLS
```

### Supabase Migration: Revert drone-jobs to Private

```sql
-- Revert drone-jobs bucket to private
-- Originals must not be publicly accessible before balance payment
UPDATE storage.buckets
SET public = false
WHERE id = 'drone-jobs';

-- Remove the public read policy
DROP POLICY IF EXISTS "drone_jobs_public_read" ON storage.objects;

-- Keep authenticated upload/update/delete policies
-- Admin UI and QA functions use service role key (bypasses RLS)
-- Signed URLs provide time-limited access when needed
```

### Supabase Migration: Add preview_urls Column

```sql
-- Store watermarked preview URLs on drone_jobs for easy lookup
ALTER TABLE public.drone_jobs
  ADD COLUMN IF NOT EXISTS preview_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.drone_jobs.preview_urls
  IS 'Public URLs of watermarked preview thumbnails in watermark-previews bucket. Populated by n8n pipeline watermark step.';
```

### n8n Code Node: Select Best Images for Preview

```javascript
// Input: job assets from Supabase query
// Output: top 3 images by QA score for watermarking
const jobId = $json.job_id;
const assets = $json.assets || [];

const candidates = assets
  .filter(a => (a.processing_status === 'processed' || a.processing_status === 'exported')
    && a.file_type === 'image')
  .sort((a, b) => (b.qa_score || 0) - (a.qa_score || 0))
  .slice(0, 3);

if (candidates.length === 0) {
  throw new Error(`No processed images found for job ${jobId}`);
}

return candidates.map(a => ({
  json: {
    asset_id: a.id,
    source_path: a.processed_path || a.file_path,
    file_name: a.file_name,
    job_id: jobId
  }
}));
```

### ImageMagick Commands (Execute Command fallback)

```bash
# Resize to preview dimensions, strip EXIF, apply tiled watermark
# Step 1: Create the preview base (resize + strip metadata)
magick "input.jpg" -resize 1200x -strip "preview_base.jpg"

# Step 2: Composite tiled watermark overlay
magick "preview_base.jpg" "watermark_tile.png" ^
  -gravity center -compose dissolve -define compose:args=35 ^
  -composite "preview_final.jpg"

# Or in a single command with tiled watermark:
magick "input.jpg" -resize 1200x -strip ^
  ( "watermark_tile.png" -write mpr:TILE +delete ) ^
  -fill "mpr:TILE" -draw "color 0,0 reset" ^
  -compose dissolve -define compose:args=35 ^
  -composite "preview_final.jpg"
```

### n8n HTTP Request: Upload to Supabase Storage

```
Method: POST
URL: {{ $env.SUPABASE_URL }}/storage/v1/object/watermark-previews/{{ $json.job_id }}/preview_{{ $json.index }}.jpg
Headers:
  - apikey: {{ $env.SUPABASE_SERVICE_KEY }}
  - Authorization: Bearer {{ $env.SUPABASE_SERVICE_KEY }}
  - Content-Type: image/jpeg
Body: Binary data (the watermarked image)
```

### Public URL Pattern for Previews

```
{{ $env.SUPABASE_URL }}/storage/v1/object/public/watermark-previews/{{ job_id }}/preview_01.jpg
{{ $env.SUPABASE_URL }}/storage/v1/object/public/watermark-previews/{{ job_id }}/preview_02.jpg
{{ $env.SUPABASE_URL }}/storage/v1/object/public/watermark-previews/{{ job_id }}/preview_03.jpg
```

### Signed URL Pattern for Originals

```typescript
// In edge function (e.g., drone-delivery-email after balance paid)
const { data: signedUrl } = await supabase.storage
  .from('drone-jobs')
  .createSignedUrl(`${jobId}/processed/${fileName}`, 86400); // 24 hour expiry
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Watermark in edge function (imagemagick_deno) | Watermark on local rig via n8n pipeline | Decision made during v2.0 planning (2026-03-05) | Avoids 512 MB memory limit. Uses existing processing rig compute. |
| All files in public `drone-jobs` bucket | Originals private, previews in separate public bucket | This phase | Prevents unauthorized access to full resolution files before payment |
| n8n Edit Image via GraphicsMagick | Same (verify availability first) | n8n 2.0+ | Execute Command node disabled by default for security in n8n 2.0+. Edit Image node is the preferred approach. |

## Open Questions

1. **Is GraphicsMagick installed in the n8n environment?**
   - What we know: n8n is self-hosted, runs via Docker or npm. The Edit Image node requires GraphicsMagick or ImageMagick as a system dependency.
   - What is unclear: Whether the current n8n installation includes GraphicsMagick.
   - Recommendation: Test the Edit Image node with a simple composite operation before building the full workflow. If it fails, install GraphicsMagick in the container or use Execute Command with ImageMagick (which is installed on the rig for Lightroom/Photoshop workflows).

2. **Does reverting drone-jobs to private break the admin UI or QA functions?**
   - What we know: The admin UI displays image previews from `drone-jobs` bucket. QA functions (drone-qa-analyze) fetch images for Gemini analysis. Both use the service role key, which bypasses RLS and bucket privacy settings.
   - What is unclear: Whether any client-side code constructs public URLs for `drone-jobs` images directly (these would break if the bucket becomes private).
   - Recommendation: Search the React codebase for any direct public URL construction like `/storage/v1/object/public/drone-jobs/`. Replace with signed URL calls from the Supabase client if found.

3. **Watermark asset creation**
   - What we know: The watermark should be a tiled diagonal pattern with "SENTINEL AERIAL" text at 30 to 40% opacity.
   - What is unclear: Whether this PNG needs to be created programmatically or manually in Photoshop.
   - Recommendation: Create a single tiled watermark PNG in Photoshop (1200x800 with diagonal text pattern, transparent background). Store it in the project repository under `assets/watermark.png`. The n8n pipeline references this file during the composite step.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) + manual n8n workflow test |
| Config file | vite.config.ts (vitest configured) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-03a | Watermark previews exist in separate bucket after pipeline runs | integration/manual | Manual: trigger n8n pipeline, verify files in `watermark-previews` bucket | Wave 0 |
| BILL-03b | Preview URLs accessible without authentication | integration | `curl -s -o /dev/null -w "%{http_code}" {SUPABASE_URL}/storage/v1/object/public/watermark-previews/{job_id}/preview_01.jpg` returns 200 | Wave 0 |
| BILL-03c | Original URLs require signed access | integration | `curl -s -o /dev/null -w "%{http_code}" {SUPABASE_URL}/storage/v1/object/public/drone-jobs/{job_id}/{file}` returns 400 (private bucket) | Wave 0 |
| BILL-03d | Watermark visible and cannot be cropped out | manual-only | Visual inspection of generated preview. Justification: watermark coverage is a visual quality judgment, not automatable. | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual n8n pipeline test + visual watermark inspection

### Wave 0 Gaps

- [ ] Migration test: verify `watermark-previews` bucket creation succeeds
- [ ] Migration test: verify `drone-jobs` bucket reverts to private without breaking service role access
- [ ] Integration test script: curl commands to verify public/private access patterns after migrations

## Sources

### Primary (HIGH confidence)

- Existing codebase analysis: storage bucket migrations, n8n workflow JSON, edge function patterns, drone_assets schema
- `20260125140000_drone_jobs_public_bucket.sql` (current public bucket state)
- `20260101165106_a1e0f84b-54a8-492c-b0b6-c58ce61850f9.sql` (original drone-jobs bucket creation)
- `20260125120000_drone_processed_bucket.sql` (drone-processed-assets bucket pattern)
- `supabase/functions/drone-upload-processed/index.ts` (upload pattern for processed files)
- `n8n-workflows/wf1-sentinel-pipeline-orchestrator.json` (existing pipeline step structure)
- STATE.md decision: "Watermark generation on local rig via n8n pipeline, not edge functions"
- STATE.md decision: "Separate storage buckets for watermarked previews vs originals"

### Secondary (MEDIUM confidence)

- [n8n Edit Image node docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.editimage/) confirming composite operation support
- [Supabase Storage Buckets docs](https://supabase.com/docs/guides/storage/buckets/fundamentals) confirming public vs private bucket behavior
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) confirming RLS and signed URL patterns
- [ImageMagick composite/watermark patterns](https://www.the-art-of-web.com/system/imagemagick-watermark/) confirming tiled watermark approach

### Tertiary (LOW confidence)

- n8n Edit Image node availability in current n8n version (needs runtime verification)
- GraphicsMagick installation status in n8n environment (needs runtime verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. n8n pipeline approach is a locked decision. Supabase Storage patterns are well documented.
- Architecture: HIGH. Separate bucket pattern is proven in the existing codebase (3 buckets already exist).
- Pitfalls: HIGH. Public bucket issue is verified in migration code. Watermark coverage is documented in PITFALLS.md.

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain, no fast-moving dependencies)
