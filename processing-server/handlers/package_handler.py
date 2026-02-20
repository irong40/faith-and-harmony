"""
ZIP delivery packaging handler.
Downloads all processed files from Supabase Storage, organizes into the
delivery folder structure based on package type, creates a ZIP archive,
uploads it, and returns a signed download URL.
"""
import os
import shutil
import zipfile
from pathlib import Path

import httpx

from config import config
from supabase_client import supabase_client


FOLDER_STRUCTURES = {
    "real_estate": {
        "dirs": ["Photos"],
        "social_dir": "Social",
        "raw_dir": "Raw",
    },
    "construction": {
        "dirs": ["Labeled", "Unlabeled"],
    },
    "mapping": {
        "dirs": ["Aerial_Photos", "Report", "Technical_Data"],
    },
}

PACKAGE_TYPE_MAP = {
    "PHOTO_495": "real_estate",
    "PHOTO_VIDEO_795": "real_estate",
    "PREMIUM_1250": "real_estate",
    "PROGRESS_800": "construction",
    "INSPECTION": "construction",
    "SITE_SURVEY": "mapping",
    "MAPPING": "mapping",
}


def _classify_file(file_path: str, package_type: str) -> str:
    """Determine which subfolder a processed file belongs in."""
    lower = file_path.lower()

    if package_type == "real_estate":
        if "/social/" in lower or "_social" in lower:
            return "Social"
        if "/raw/" in lower:
            return "Raw"
        return "Photos"

    if package_type == "construction":
        if "/labeled/" in lower or "labeled_" in lower:
            return "Labeled"
        return "Unlabeled"

    if package_type == "mapping":
        if lower.endswith((".tif", ".tiff", ".ply", ".obj", ".glb", ".laz", ".las")):
            return "Technical_Data"
        if lower.endswith(".pdf") or lower.endswith(".html"):
            return "Report"
        return "Aerial_Photos"

    return ""


def _sanitize_folder_name(name: str) -> str:
    """Remove characters that are invalid in folder names."""
    invalid = '<>:"/\\|?*'
    for ch in invalid:
        name = name.replace(ch, "")
    return name.strip()


def create_delivery_package(
    job_id: str,
    job_number: str,
    property_address: str,
    package_code: str,
    processed_files: list[dict],
    include_social: bool = False,
    include_raw: bool = False,
    include_technical: bool = False,
    scheduled_date: str | None = None,
    callback_url: str = "",
):
    """
    Background task: download processed files, organize into folder structure,
    create ZIP, upload to storage, fire callback with signed URL.

    Each processed_file dict: { storage_path: str, file_name: str }
    """
    package_type = PACKAGE_TYPE_MAP.get(package_code, "real_estate")
    work_dir = os.path.join(config.TEMP_DIR, "packaging", job_id)
    os.makedirs(work_dir, exist_ok=True)

    safe_address = _sanitize_folder_name(property_address)
    if package_type == "construction" and scheduled_date:
        root_name = f"{job_number}_{safe_address}_{scheduled_date}"
    else:
        root_name = f"{job_number}_{safe_address}"

    delivery_root = os.path.join(work_dir, root_name)
    os.makedirs(delivery_root, exist_ok=True)

    structure = FOLDER_STRUCTURES.get(package_type, FOLDER_STRUCTURES["real_estate"])
    for d in structure.get("dirs", []):
        os.makedirs(os.path.join(delivery_root, d), exist_ok=True)

    if include_social and "social_dir" in structure:
        os.makedirs(os.path.join(delivery_root, structure["social_dir"]), exist_ok=True)
    if include_raw and "raw_dir" in structure:
        os.makedirs(os.path.join(delivery_root, structure["raw_dir"]), exist_ok=True)

    try:
        print(f"  [Package] Downloading {len(processed_files)} files")
        for pf in processed_files:
            storage_path = pf.get("storage_path", "")
            file_name = pf.get("file_name", os.path.basename(storage_path))

            subfolder = _classify_file(storage_path, package_type)

            if subfolder == "Social" and not include_social:
                continue
            if subfolder == "Raw" and not include_raw:
                continue
            if subfolder == "Technical_Data" and not include_technical:
                continue

            dest_dir = os.path.join(delivery_root, subfolder) if subfolder else delivery_root
            os.makedirs(dest_dir, exist_ok=True)
            local_path = os.path.join(dest_dir, file_name)

            try:
                data = supabase_client.client.storage.from_(config.STORAGE_BUCKET).download(storage_path)
                with open(local_path, "wb") as f:
                    f.write(data)
            except Exception as e:
                print(f"  [Package] Failed to download {storage_path}: {e}")
                continue

        zip_name = f"{root_name}_deliverables.zip"
        zip_path = os.path.join(work_dir, zip_name)

        print(f"  [Package] Creating ZIP: {zip_name}")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for folder_root, _, files in os.walk(delivery_root):
                for file in files:
                    file_full = os.path.join(folder_root, file)
                    arcname = os.path.relpath(file_full, work_dir)
                    zf.write(file_full, arcname)

        storage_zip_path = f"delivery/{job_id}/{zip_name}"
        print(f"  [Package] Uploading ZIP to {storage_zip_path}")
        supabase_client.upload_result(zip_path, storage_zip_path)

        signed_url = supabase_client.get_signed_url(storage_zip_path, expires_in=604800)

        if callback_url:
            _fire_callback(callback_url, {
                "job_id": job_id,
                "status": "complete",
                "zip_storage_path": storage_zip_path,
                "download_url": signed_url,
                "zip_name": zip_name,
            })

        return {
            "status": "complete",
            "zip_storage_path": storage_zip_path,
            "download_url": signed_url,
        }

    except Exception as e:
        print(f"  [Package] Error: {e}")
        if callback_url:
            _fire_callback(callback_url, {
                "job_id": job_id,
                "status": "failed",
                "error": str(e),
            })
        return {"status": "failed", "error": str(e)}
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _fire_callback(callback_url: str, payload: dict):
    try:
        httpx.post(callback_url, json=payload, timeout=30)
    except Exception as e:
        print(f"  [Package] Callback failed: {e}")
