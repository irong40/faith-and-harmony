"""Burn project name + visit date overlay onto a progress video using FFmpeg."""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional

from supabase import Client, create_client


STORAGE_BUCKET = "deliverables"


def get_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def require_ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        raise SystemExit("ffmpeg not found in PATH")
    return exe


def escape_drawtext(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(":", r"\:")
        .replace("'", r"\\\'")
        .replace("%", r"\%")
    )


def overlay(
    input_path: Path,
    output_path: Path,
    project_name: str,
    visit_date: str,
) -> Path:
    ffmpeg = require_ffmpeg()
    label = escape_drawtext(f"{project_name} | Visit: {visit_date}")

    # Bottom bar: 40px tall, semi-transparent black, full width.
    # White text, 24pt-equivalent, sans-serif, left-aligned with 20px padding.
    vf = (
        "drawbox=x=0:y=ih-40:w=iw:h=40:color=black@0.6:t=fill,"
        f"drawtext=text='{label}':fontcolor=white:fontsize=24:"
        "x=20:y=h-30:font='Sans'"
    )

    cmd = [
        ffmpeg, "-y",
        "-i", str(input_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(output_path),
    ]
    print("ffmpeg:", " ".join(cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise SystemExit(f"ffmpeg failed (exit {proc.returncode})")
    return output_path


def upload(sb: Client, local_path: Path, site_id: str, visit_id: str) -> str:
    remote_path = f"{site_id}/{visit_id}/progress_video.mp4"
    with local_path.open("rb") as fh:
        sb.storage.from_(STORAGE_BUCKET).upload(
            remote_path,
            fh.read(),
            file_options={"content-type": "video/mp4", "upsert": "true"},
        )
    return f"{STORAGE_BUCKET}/{remote_path}"


def process(
    video_path: Path,
    project_name: str,
    visit_date: str,
    site_id: str,
    visit_id: str,
    output_dir: Optional[Path] = None,
) -> Path:
    if not video_path.exists():
        raise SystemExit(f"video not found: {video_path}")
    out_dir = output_dir or Path(tempfile.gettempdir()) / f"deliverable_{visit_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "progress_video.mp4"
    overlay(video_path, out_path, project_name, visit_date)
    upload(get_client(), out_path, site_id, visit_id)
    print(f"progress_video: {out_path}")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--project_name", required=True)
    parser.add_argument("--visit_date", required=True)
    parser.add_argument("--site_id", required=True)
    parser.add_argument("--visit_id", required=True)
    parser.add_argument("--output_dir", default=None)
    args = parser.parse_args()
    process(
        Path(args.video),
        args.project_name,
        args.visit_date,
        args.site_id,
        args.visit_id,
        Path(args.output_dir) if args.output_dir else None,
    )


if __name__ == "__main__":
    main()
