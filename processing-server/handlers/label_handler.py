"""
Construction photo labeling handler.
Opens each processed image, renders a styled label bar at the bottom with
property address, formatted date, and compass bearing.
"""
import os
import shutil
from datetime import datetime

import httpx
from PIL import Image, ImageDraw, ImageFont

from config import config
from supabase_client import supabase_client

# F&H brand colors
BRAND_PURPLE = (91, 44, 111)   # #5B2C6F
BRAND_GOLD = (201, 162, 39)    # #C9A227

LABEL_HEIGHT_RATIO = 0.06
MIN_LABEL_HEIGHT = 60
MAX_LABEL_HEIGHT = 120


def _get_font(size: int) -> ImageFont.FreeTypeFont:
    """Load configured font or fall back to default."""
    font_path = config.LABEL_FONT_PATH
    if font_path and os.path.exists(font_path):
        return ImageFont.truetype(font_path, size)
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _format_date(date_str: str | None) -> str:
    """Format capture date for label display."""
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%B %d, %Y")
    except (ValueError, TypeError):
        return date_str


def _render_label(
    image: Image.Image,
    address: str,
    capture_date: str | None,
    compass_direction: str | None,
) -> Image.Image:
    """Render a branded label bar at the bottom of the image."""
    width, height = image.size
    label_h = max(MIN_LABEL_HEIGHT, min(MAX_LABEL_HEIGHT, int(height * LABEL_HEIGHT_RATIO)))

    new_height = height + label_h
    labeled = Image.new("RGB", (width, new_height), BRAND_PURPLE)
    labeled.paste(image, (0, 0))

    draw = ImageDraw.Draw(labeled)
    draw.rectangle([(0, height), (width, new_height)], fill=BRAND_PURPLE)

    font_size = max(14, label_h // 3)
    font = _get_font(font_size)

    parts = [address]
    formatted_date = _format_date(capture_date)
    if formatted_date:
        parts.append(formatted_date)
    if compass_direction:
        parts.append(compass_direction)

    label_text = "  |  ".join(parts)

    bbox = draw.textbbox((0, 0), label_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (width - text_w) // 2
    text_y = height + (label_h - text_h) // 2

    draw.text((text_x, text_y), label_text, fill=BRAND_GOLD, font=font)

    return labeled


def process_label_batch(
    job_id: str,
    address: str,
    assets: list[dict],
    callback_url: str,
):
    """
    Background task: download images, render labels, upload labeled versions,
    fire callback on completion.

    Each asset dict should have: file_path, file_name, capture_date, compass_direction
    """
    work_dir = os.path.join(config.TEMP_DIR, "labels", job_id)
    os.makedirs(work_dir, exist_ok=True)
    labeled_paths = []

    try:
        for asset in assets:
            file_path = asset.get("file_path", "")
            file_name = asset.get("file_name", os.path.basename(file_path))
            capture_date = asset.get("capture_date")
            compass_direction = asset.get("compass_direction")

            local_path = os.path.join(work_dir, file_name)
            if file_path.startswith("http"):
                resp = httpx.get(file_path, timeout=120)
                resp.raise_for_status()
                with open(local_path, "wb") as f:
                    f.write(resp.content)
            else:
                supabase_client.download_asset(file_path, work_dir)
                local_path = os.path.join(work_dir, os.path.basename(file_path))

            image = Image.open(local_path)
            labeled = _render_label(image, address, capture_date, compass_direction)

            labeled_name = f"labeled_{file_name}"
            labeled_local = os.path.join(work_dir, labeled_name)
            labeled.save(labeled_local, "JPEG", quality=95)

            storage_path = f"processed/{job_id}/labeled/{labeled_name}"
            supabase_client.upload_result(labeled_local, storage_path)
            labeled_paths.append(storage_path)

            print(f"  [Label] Labeled: {file_name}")

        _fire_callback(callback_url, {
            "job_id": job_id,
            "status": "complete",
            "labeled_count": len(labeled_paths),
            "labeled_paths": labeled_paths,
        })

    except Exception as e:
        print(f"  [Label] Error: {e}")
        _fire_callback(callback_url, {
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
        })
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _fire_callback(callback_url: str, payload: dict):
    try:
        httpx.post(callback_url, json=payload, timeout=30)
    except Exception as e:
        print(f"  [Label] Callback failed: {e}")
