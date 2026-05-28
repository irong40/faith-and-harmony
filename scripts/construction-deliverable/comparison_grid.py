"""Build the 4x2 cardinal comparison grid for a site visit.

Left column = previous visit photos (N,E,S,W).
Right column = current visit photos (N,E,S,W).
If no previous visit exists, the left column shows a placeholder.
"""
from __future__ import annotations

import argparse
import io
import os
import sys
import tempfile
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont
from supabase import Client, create_client


CARDINALS = ("N", "E", "S", "W")
CELL_W = 1400
CELL_H = 900
LABEL_H = 60
HEADER_H = 80
PADDING = 20
MAX_OUTPUT_WIDTH = 3000
STORAGE_BUCKET = "deliverables"


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def load_font(size: int) -> ImageFont.ImageFont:
    for name in ("arial.ttf", "Arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def fetch_visit(sb: Client, visit_id: str) -> dict:
    res = sb.table("site_visits").select("*").eq("id", visit_id).single().execute()
    return res.data


def fetch_previous_visit(sb: Client, site_id: str, current_visit_number: int) -> Optional[dict]:
    res = (
        sb.table("site_visits")
        .select("*")
        .eq("site_id", site_id)
        .lt("visit_number", current_visit_number)
        .order("visit_number", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def fetch_cardinal_assets(sb: Client, job_id: str) -> dict[str, dict]:
    res = (
        sb.table("drone_assets")
        .select("id,storage_path,cardinal_direction_tag")
        .eq("job_id", job_id)
        .in_("cardinal_direction_tag", list(CARDINALS))
        .execute()
    )
    by_dir: dict[str, dict] = {}
    for row in res.data or []:
        tag = row["cardinal_direction_tag"]
        if tag not in by_dir:
            by_dir[tag] = row
    return by_dir


def download_image(sb: Client, storage_path: str) -> Optional[Image.Image]:
    parts = storage_path.split("/", 1)
    if len(parts) == 2 and parts[0] in ("drone-assets", "drone_assets", "raw", "raw-uploads"):
        bucket, path = parts[0], parts[1]
    else:
        bucket, path = "drone-assets", storage_path
    try:
        data = sb.storage.from_(bucket).download(path)
    except Exception as exc:
        print(f"WARN: download failed for {bucket}/{path}: {exc}", file=sys.stderr)
        return None
    return Image.open(io.BytesIO(data)).convert("RGB")


def fit_into_cell(img: Image.Image, w: int, h: int) -> Image.Image:
    img.thumbnail((w, h), Image.LANCZOS)
    canvas = Image.new("RGB", (w, h), (32, 32, 32))
    x = (w - img.width) // 2
    y = (h - img.height) // 2
    canvas.paste(img, (x, y))
    return canvas


def placeholder_cell(w: int, h: int, text: str) -> Image.Image:
    img = Image.new("RGB", (w, h), (90, 90, 90))
    draw = ImageDraw.Draw(img)
    font = load_font(36)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((w - tw) / 2, (h - th) / 2), text, fill=(230, 230, 230), font=font)
    return img


def label_bar(width: int, text: str) -> Image.Image:
    bar = Image.new("RGB", (width, LABEL_H), (20, 20, 20))
    draw = ImageDraw.Draw(bar)
    font = load_font(28)
    draw.text((16, 14), text, fill=(255, 255, 255), font=font)
    return bar


def header_bar(width: int, text: str) -> Image.Image:
    bar = Image.new("RGB", (width, HEADER_H), (255, 255, 255))
    draw = ImageDraw.Draw(bar)
    font = load_font(40)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) / 2, 18), text, fill=(20, 20, 20), font=font)
    return bar


def build_grid(
    previous_visit: Optional[dict],
    previous_assets: dict[str, dict],
    current_visit: dict,
    current_assets: dict[str, dict],
    sb: Client,
) -> Image.Image:
    col_w = CELL_W
    col_h = (CELL_H + LABEL_H) * 4
    total_w = col_w * 2 + PADDING * 3
    total_h = HEADER_H + col_h + PADDING * 2

    canvas = Image.new("RGB", (total_w, total_h), (245, 245, 245))

    prev_label = (
        f"Previous Visit ({previous_visit['visit_date']})"
        if previous_visit
        else "Baseline Visit"
    )
    cur_label = f"Current Visit ({current_visit['visit_date']})"
    canvas.paste(header_bar(col_w, prev_label), (PADDING, 0))
    canvas.paste(header_bar(col_w, cur_label), (PADDING * 2 + col_w, 0))

    for row_idx, cardinal in enumerate(CARDINALS):
        y = HEADER_H + PADDING + row_idx * (CELL_H + LABEL_H)

        # Left column (previous)
        if previous_visit and cardinal in previous_assets:
            img = download_image(sb, previous_assets[cardinal]["storage_path"])
            left = fit_into_cell(img, CELL_W, CELL_H) if img else placeholder_cell(
                CELL_W, CELL_H, f"{cardinal} — missing"
            )
            left_label = f"{cardinal} — {previous_visit['visit_date']}"
        elif previous_visit:
            left = placeholder_cell(CELL_W, CELL_H, f"{cardinal} — not captured")
            left_label = f"{cardinal} — {previous_visit['visit_date']}"
        else:
            left = placeholder_cell(CELL_W, CELL_H, "Baseline Visit — No Prior Data")
            left_label = f"{cardinal} — baseline"
        canvas.paste(left, (PADDING, y))
        canvas.paste(label_bar(CELL_W, left_label), (PADDING, y + CELL_H))

        # Right column (current)
        if cardinal in current_assets:
            img = download_image(sb, current_assets[cardinal]["storage_path"])
            right = fit_into_cell(img, CELL_W, CELL_H) if img else placeholder_cell(
                CELL_W, CELL_H, f"{cardinal} — missing"
            )
        else:
            right = placeholder_cell(CELL_W, CELL_H, f"{cardinal} — not captured")
        right_label = f"{cardinal} — {current_visit['visit_date']}"
        canvas.paste(right, (PADDING * 2 + col_w, y))
        canvas.paste(label_bar(CELL_W, right_label), (PADDING * 2 + col_w, y + CELL_H))

    if canvas.width > MAX_OUTPUT_WIDTH:
        ratio = MAX_OUTPUT_WIDTH / canvas.width
        canvas = canvas.resize(
            (MAX_OUTPUT_WIDTH, int(canvas.height * ratio)), Image.LANCZOS
        )
    return canvas


def upload(sb: Client, local_path: Path, site_id: str, visit_id: str) -> str:
    remote_path = f"{site_id}/{visit_id}/comparison_grid.jpg"
    with local_path.open("rb") as fh:
        sb.storage.from_(STORAGE_BUCKET).upload(
            remote_path,
            fh.read(),
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
    return f"{STORAGE_BUCKET}/{remote_path}"


def generate(site_id: str, visit_id: str, output_dir: Optional[Path] = None) -> Path:
    sb = get_client()
    current = fetch_visit(sb, visit_id)
    if not current:
        raise SystemExit(f"visit {visit_id} not found")
    previous = fetch_previous_visit(sb, site_id, current["visit_number"])
    current_assets = fetch_cardinal_assets(sb, current["job_id"])
    previous_assets = fetch_cardinal_assets(sb, previous["job_id"]) if previous else {}

    grid = build_grid(previous, previous_assets, current, current_assets, sb)

    out_dir = output_dir or Path(tempfile.gettempdir()) / f"deliverable_{visit_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "comparison_grid.jpg"
    grid.save(out_path, "JPEG", quality=90, optimize=True)
    upload(sb, out_path, site_id, visit_id)
    print(f"comparison_grid: {out_path}")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site_id", required=True)
    parser.add_argument("--visit_id", required=True)
    parser.add_argument("--output_dir", default=None)
    args = parser.parse_args()
    generate(
        args.site_id,
        args.visit_id,
        Path(args.output_dir) if args.output_dir else None,
    )


if __name__ == "__main__":
    main()
