"""
Lightroom Auto Import handler.
Downloads images from Supabase Storage, writes XMP sidecars with the correct
preset, copies into the Lightroom watched folder, then monitors the export
folder for completed files and fires the callback URL.
"""
import os
import shutil
import time
import uuid
import threading
from datetime import datetime
from pathlib import Path

import httpx
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from config import config
from supabase_client import supabase_client

# Active jobs tracked by job_id
_active_jobs: dict[str, dict] = {}


class ExportWatcher(FileSystemEventHandler):
    """Watches Lightroom export folder for completed files."""

    def __init__(self, job_id: str, expected_count: int, callback_url: str, export_prefix: str):
        self.job_id = job_id
        self.expected_count = expected_count
        self.callback_url = callback_url
        self.export_prefix = export_prefix
        self.detected_files: list[str] = []
        self.completed = threading.Event()

    def on_created(self, event):
        if event.is_directory:
            return
        file_name = os.path.basename(event.src_path)
        if file_name.startswith(self.export_prefix):
            self.detected_files.append(event.src_path)
            print(f"  [LR] Export detected: {file_name} ({len(self.detected_files)}/{self.expected_count})")
            if len(self.detected_files) >= self.expected_count:
                self.completed.set()


def _write_xmp_sidecar(image_path: str, preset_name: str) -> str:
    """Write an XMP sidecar file that references a Lightroom preset."""
    xmp_path = os.path.splitext(image_path)[0] + ".xmp"
    xmp_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    crs:PresetName="{preset_name}"
    crs:Version="15.0"
    crs:ProcessVersion="11.0">
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>"""
    with open(xmp_path, "w", encoding="utf-8") as f:
        f.write(xmp_content)
    return xmp_path


def _download_assets(assets: list[dict], download_dir: str) -> list[str]:
    """Download images from Supabase Storage URLs to local directory."""
    local_paths = []
    for asset in assets:
        file_path = asset.get("file_path", "")
        file_name = asset.get("file_name", os.path.basename(file_path))
        local_path = os.path.join(download_dir, file_name)

        if file_path.startswith("http"):
            response = httpx.get(file_path, timeout=120)
            response.raise_for_status()
            with open(local_path, "wb") as f:
                f.write(response.content)
        else:
            supabase_client.download_asset(file_path, download_dir)
            local_path = os.path.join(download_dir, os.path.basename(file_path))

        local_paths.append(local_path)
    return local_paths


def _fire_callback(callback_url: str, payload: dict):
    """POST callback with results."""
    try:
        httpx.post(callback_url, json=payload, timeout=30)
    except Exception as e:
        print(f"  [LR] Callback failed: {e}")


def process_lightroom_batch(
    job_id: str,
    preset_name: str,
    assets: list[dict],
    callback_url: str,
):
    """
    Background task: download images, write XMP sidecars, copy to watched
    folder, monitor export folder, fire callback on completion.
    """
    export_prefix = f"sentinel_{job_id[:8]}_"
    work_dir = os.path.join(config.TEMP_DIR, "lightroom", job_id)
    os.makedirs(work_dir, exist_ok=True)

    try:
        print(f"  [LR] Downloading {len(assets)} assets for job {job_id}")
        local_paths = _download_assets(assets, work_dir)

        renamed_paths = []
        for i, path in enumerate(local_paths):
            ext = os.path.splitext(path)[1]
            new_name = f"{export_prefix}{i:04d}{ext}"
            new_path = os.path.join(os.path.dirname(path), new_name)
            os.rename(path, new_path)
            renamed_paths.append(new_path)

        print(f"  [LR] Writing XMP sidecars with preset: {preset_name}")
        for path in renamed_paths:
            _write_xmp_sidecar(path, preset_name)

        watcher = ExportWatcher(job_id, len(renamed_paths), callback_url, export_prefix)
        observer = Observer()
        observer.schedule(watcher, config.LIGHTROOM_EXPORT_DIR, recursive=False)
        observer.start()

        print(f"  [LR] Copying {len(renamed_paths)} files to watch dir: {config.LIGHTROOM_WATCH_DIR}")
        for path in renamed_paths:
            shutil.copy2(path, config.LIGHTROOM_WATCH_DIR)
            xmp = os.path.splitext(path)[0] + ".xmp"
            if os.path.exists(xmp):
                shutil.copy2(xmp, config.LIGHTROOM_WATCH_DIR)

        timeout = config.CALLBACK_TIMEOUT
        print(f"  [LR] Waiting for {len(renamed_paths)} exports (timeout: {timeout}s)")
        completed = watcher.completed.wait(timeout=timeout)

        observer.stop()
        observer.join()

        if not completed:
            _fire_callback(callback_url, {
                "job_id": job_id,
                "status": "failed",
                "error": f"Lightroom export timed out after {timeout}s. Got {len(watcher.detected_files)}/{len(renamed_paths)} files.",
            })
            return

        exported_paths = []
        for f in watcher.detected_files:
            storage_path = f"processed/{job_id}/edited/{os.path.basename(f)}"
            supabase_client.upload_result(f, storage_path)
            exported_paths.append(storage_path)

        _fire_callback(callback_url, {
            "job_id": job_id,
            "status": "complete",
            "exported_count": len(exported_paths),
            "exported_paths": exported_paths,
        })

    except Exception as e:
        print(f"  [LR] Error: {e}")
        _fire_callback(callback_url, {
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
        })
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def get_job_status(job_id: str) -> dict:
    """Return status of an active Lightroom job."""
    job = _active_jobs.get(job_id)
    if not job:
        return {"job_id": job_id, "status": "not_found"}
    return job
