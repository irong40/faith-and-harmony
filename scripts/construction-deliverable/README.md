# Construction Progress Deliverable

Per-visit deliverable builder for Sentinel Aerial's construction monitoring jobs.
Runs on the same Windows machine as the existing Lightroom/Photoshop local agent.

## Components

| Script | Purpose |
|---|---|
| `comparison_grid.py` | 4×2 cardinal photo grid (previous vs current visit) |
| `video_overlay.py` | Burn project + date overlay onto the orbit video via FFmpeg |
| `change_summary.py` | AI bullet summary (Claude) comparing cardinal pairs |
| `compliance_packet.py` | Single PDF: cover + Part 107 / registration / COI / LAANC |
| `build_deliverable.py` | Orchestrator — runs all components, zips, signs URL |

## Environment variables

```
SUPABASE_URL=https://qjpujskwqaehxnqypxzu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

## System requirements

- Python 3.10+
- FFmpeg in PATH (`ffmpeg -version` must succeed)
- Windows or POSIX — all paths use `pathlib`

## Install

```
pip install -r requirements.txt
```

## Storage buckets

The scripts assume these Supabase storage buckets exist:

- `deliverables` — per-visit output (grid, video, summary, packet, zip)
- `drone-assets` — raw uploaded photos (default for `drone_assets.storage_path`)
- `compliance` — static Part 107 / registration / COI documents

If a `storage_path` value is fully qualified (`bucket/path/to/file.jpg`) the
scripts honor the embedded bucket. Otherwise the default bucket is used.

## Running standalone

```
python comparison_grid.py   --site_id <uuid> --visit_id <uuid>
python video_overlay.py     --video path\to\orbit.mp4 --project_name "Maple Heights" \
                            --visit_date 2026-05-12 --site_id <uuid> --visit_id <uuid>
python change_summary.py    --site_id <uuid> --visit_id <uuid>
python compliance_packet.py --site_id <uuid> --visit_id <uuid>
python build_deliverable.py --site_id <uuid> --visit_id <uuid> [--video path\to\orbit.mp4]
```

## Orchestrator behavior

`build_deliverable.py` runs each component inside `safe_run` so a single
failure does not abort the rest. The final ZIP always contains a
`manifest.json` recording `ok` / `failed` / `skipped` per component. The
30-day signed URL is written back to `site_visits.deliverable_url`.

## Called from n8n

The local agent exposes `POST /build-deliverable` (`scripts/local-agent/
routes/build-deliverable.js`) which shells out to `build_deliverable.py`.
n8n hits that endpoint after the existing Lightroom/Photoshop labeling
step completes — see `docs/n8n-workflow-update-spec.md`.
