"""Orchestrate the full construction progress deliverable.

Runs comparison_grid -> video_overlay (if video present) -> change_summary ->
compliance_packet, then bundles the outputs into a ZIP and uploads to
Supabase storage with a 30-day signed URL written back to site_visits.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import traceback
import zipfile
from pathlib import Path
from typing import Optional

from supabase import Client, create_client

import comparison_grid
import change_summary
import compliance_packet
import video_overlay


STORAGE_BUCKET = "deliverables"
SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days


def get_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def fetch_visit(sb: Client, visit_id: str) -> dict:
    return sb.table("site_visits").select("*").eq("id", visit_id).single().execute().data


def fetch_site(sb: Client, site_id: str) -> dict:
    return sb.table("construction_sites").select("*").eq("id", site_id).single().execute().data


def write_flight_log(visit: dict, site: dict, out_path: Path) -> Path:
    lines = [
        "Sentinel Aerial Inspections — Flight Log Entry",
        "",
        f"Site:            {site.get('name','')}",
        f"Visit Number:    {visit.get('visit_number','')}",
        f"Visit Date:      {visit.get('visit_date','')}",
        f"Start Time:      {visit.get('flight_start_time','') or '—'}",
        f"Duration (min):  {visit.get('flight_duration_minutes','') or '—'}",
        f"Aircraft Serial: {visit.get('aircraft_serial','')}",
        f"Pilot:           {visit.get('pilot_name','')}",
    ]
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def safe_run(label: str, fn, manifest: dict[str, str]) -> Optional[Path]:
    try:
        result = fn()
        manifest[label] = "ok"
        return result
    except Exception as exc:
        print(f"ERROR in {label}: {exc}", file=sys.stderr)
        traceback.print_exc()
        manifest[label] = f"failed: {exc}"
        return None


def build(
    site_id: str,
    visit_id: str,
    video_path: Optional[Path] = None,
) -> dict:
    sb = get_client()
    site = fetch_site(sb, site_id)
    visit = fetch_visit(sb, visit_id)

    work_dir = Path(tempfile.gettempdir()) / f"deliverable_{visit_id}"
    work_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, str] = {}

    grid_path = safe_run(
        "comparison_grid",
        lambda: comparison_grid.generate(site_id, visit_id, work_dir),
        manifest,
    )

    video_out: Optional[Path] = None
    if video_path and video_path.exists():
        video_out = safe_run(
            "progress_video",
            lambda: video_overlay.process(
                video_path,
                site.get("name", ""),
                str(visit.get("visit_date", "")),
                site_id,
                visit_id,
                work_dir,
            ),
            manifest,
        )
    else:
        manifest["progress_video"] = "skipped: no video provided"

    summary_path = safe_run(
        "change_summary",
        lambda: change_summary.generate(site_id, visit_id, work_dir),
        manifest,
    )

    flight_log_path = work_dir / "flight_log.txt"
    safe_run(
        "flight_log",
        lambda: write_flight_log(visit, site, flight_log_path),
        manifest,
    )

    packet_path = safe_run(
        "compliance_packet",
        lambda: compliance_packet.generate(site_id, visit_id, work_dir),
        manifest,
    )

    manifest_path = work_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    zip_path = work_dir / "deliverable.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in (grid_path, video_out, summary_path, flight_log_path, packet_path, manifest_path):
            if path and Path(path).exists():
                zf.write(path, arcname=Path(path).name)

    remote_zip = f"{site_id}/{visit_id}/deliverable.zip"
    with zip_path.open("rb") as fh:
        sb.storage.from_(STORAGE_BUCKET).upload(
            remote_zip,
            fh.read(),
            file_options={"content-type": "application/zip", "upsert": "true"},
        )

    signed = sb.storage.from_(STORAGE_BUCKET).create_signed_url(
        remote_zip, SIGNED_URL_TTL_SECONDS,
    )
    signed_url = signed.get("signedURL") or signed.get("signed_url") or signed.get("signedUrl")

    sb.table("site_visits").update({"deliverable_url": signed_url}).eq("id", visit_id).execute()

    result = {
        "site_id": site_id,
        "visit_id": visit_id,
        "deliverable_url": signed_url,
        "manifest": manifest,
        "zip_path": str(zip_path),
    }
    print(json.dumps(result, indent=2, default=str))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site_id", required=True)
    parser.add_argument("--visit_id", required=True)
    parser.add_argument("--video", default=None, help="Optional local path to the visit video")
    args = parser.parse_args()
    build(args.site_id, args.visit_id, Path(args.video) if args.video else None)


if __name__ == "__main__":
    main()
