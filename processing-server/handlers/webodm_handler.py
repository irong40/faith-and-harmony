"""
WebODM photogrammetry handler.
Wraps existing nodeodm_client.py. Adds GeoTIFF-to-JPEG conversion via GDAL,
PDF report generation, and the callback pattern.
"""
import os
import shutil
import subprocess
from datetime import datetime

import httpx

from config import config
from supabase_client import supabase_client
from nodeodm_client import nodeodm_client


def _geotiff_to_jpeg(tif_path: str, output_path: str, quality: int = 90) -> str:
    """Convert GeoTIFF orthophoto to high-res JPEG via gdal_translate."""
    try:
        subprocess.run(
            [
                "gdal_translate",
                "-of", "JPEG",
                "-co", f"QUALITY={quality}",
                "-co", "WORLDFILE=YES",
                tif_path,
                output_path,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return output_path
    except FileNotFoundError:
        print("  [WebODM] gdal_translate not found, falling back to Pillow conversion")
        from PIL import Image
        img = Image.open(tif_path)
        img.save(output_path, "JPEG", quality=quality)
        return output_path


def _generate_pdf_report(
    job_id: str,
    address: str,
    date_str: str,
    orthophoto_jpeg: str | None,
    output_dir: str,
    metadata: dict | None = None,
) -> str:
    """Generate a PDF survey report with orthophoto and metadata."""
    pdf_path = os.path.join(output_dir, f"{job_id[:8]}_survey_report.pdf")
    meta = metadata or {}

    ortho_img_tag = ""
    if orthophoto_jpeg and os.path.exists(orthophoto_jpeg):
        abs_path = os.path.abspath(orthophoto_jpeg).replace("\\", "/")
        ortho_img_tag = f'<img src="file:///{abs_path}" style="max-width:100%;margin:20px 0;" />'

    html = f"""<!DOCTYPE html>
<html><head><style>
  body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
  h1 {{ color: #5B2C6F; border-bottom: 3px solid #C9A227; padding-bottom: 10px; }}
  h2 {{ color: #5B2C6F; }}
  .meta {{ background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }}
  .meta p {{ margin: 5px 0; }}
  .footer {{ margin-top: 40px; text-align: center; color: #888; font-size: 12px; }}
</style></head><body>
  <h1>Aerial Survey Report</h1>
  <div class="meta">
    <p><strong>Property:</strong> {address}</p>
    <p><strong>Survey Date:</strong> {date_str}</p>
    <p><strong>Job ID:</strong> {job_id}</p>
    <p><strong>Generated:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
  </div>
  <h2>Orthophoto</h2>
  {ortho_img_tag if ortho_img_tag else '<p>Orthophoto not available.</p>'}
  <h2>Processing Details</h2>
  <div class="meta">
    <p><strong>Resolution:</strong> {meta.get('orthophoto_resolution', 'N/A')} cm/px</p>
    <p><strong>Image Count:</strong> {meta.get('image_count', 'N/A')}</p>
    <p><strong>Point Cloud Density:</strong> {meta.get('pc_quality', 'N/A')}</p>
  </div>
  <div class="footer">
    <p>Sentinel Aerial Inspections | Faith &amp; Harmony LLC</p>
  </div>
</body></html>"""

    try:
        from weasyprint import HTML
        HTML(string=html).write_pdf(pdf_path)
    except ImportError:
        print("  [WebODM] weasyprint not available, writing HTML report instead")
        pdf_path = pdf_path.replace(".pdf", ".html")
        with open(pdf_path, "w", encoding="utf-8") as f:
            f.write(html)

    return pdf_path


def process_webodm_batch(
    job_id: str,
    address: str,
    scheduled_date: str,
    assets: list[dict],
    processing_options: dict | None,
    callback_url: str,
):
    """
    Background task: download raw images, submit to NodeODM, wait for
    completion, convert outputs, generate report, upload results, fire callback.
    """
    work_dir = os.path.join(config.TEMP_DIR, "webodm", job_id)
    download_dir = os.path.join(work_dir, "images")
    output_dir = os.path.join(work_dir, "output")
    os.makedirs(download_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    try:
        if not nodeodm_client.health_check():
            raise RuntimeError("NodeODM server is not reachable")

        print(f"  [WebODM] Resolving {len(assets)} images")
        local_paths = []
        for asset in assets:
            file_path = asset.get("file_path", "")
            file_name = asset.get("file_name", os.path.basename(file_path))

            # Local path on the rig (from desktop ingest)
            if os.path.isfile(file_path):
                local_paths.append(file_path)
            elif file_path.startswith("http"):
                local_path = os.path.join(download_dir, file_name)
                resp = httpx.get(file_path, timeout=120)
                resp.raise_for_status()
                with open(local_path, "wb") as f:
                    f.write(resp.content)
                local_paths.append(local_path)
            else:
                # Supabase storage relative path
                supabase_client.download_asset(file_path, download_dir)
                local_path = os.path.join(download_dir, os.path.basename(file_path))
                local_paths.append(local_path)

        options = processing_options or config.DEFAULT_OPTIONS
        print(f"  [WebODM] Creating NodeODM task with {len(local_paths)} images")
        task_uuid = nodeodm_client.create_task(local_paths, options)

        print(f"  [WebODM] Waiting for task {task_uuid} (3h timeout)")
        nodeodm_client.wait_for_completion(task_uuid, poll_interval=30, timeout=10800)

        print(f"  [WebODM] Downloading results")
        results = nodeodm_client.download_results(task_uuid, output_dir)

        uploaded = {}
        orthophoto_jpeg = None

        if results.get("orthophoto"):
            jpeg_path = os.path.join(output_dir, "orthophoto.jpg")
            _geotiff_to_jpeg(results["orthophoto"], jpeg_path)
            orthophoto_jpeg = jpeg_path

            tif_storage = f"processed/{job_id}/technical/orthophoto.tif"
            jpg_storage = f"processed/{job_id}/aerial/orthophoto.jpg"
            supabase_client.upload_result(results["orthophoto"], tif_storage)
            supabase_client.upload_result(jpeg_path, jpg_storage)
            uploaded["orthophoto_tif"] = tif_storage
            uploaded["orthophoto_jpg"] = jpg_storage

        if results.get("pointcloud"):
            pc_storage = f"processed/{job_id}/technical/pointcloud.ply"
            supabase_client.upload_result(results["pointcloud"], pc_storage)
            uploaded["pointcloud"] = pc_storage

        if results.get("model_obj"):
            model_storage = f"processed/{job_id}/technical/model.obj"
            supabase_client.upload_result(results["model_obj"], model_storage)
            uploaded["model_obj"] = model_storage

        if results.get("model_glb"):
            glb_storage = f"processed/{job_id}/technical/model.glb"
            supabase_client.upload_result(results["model_glb"], glb_storage)
            uploaded["model_glb"] = glb_storage

        report_path = _generate_pdf_report(
            job_id, address, scheduled_date, orthophoto_jpeg, output_dir,
            metadata={"image_count": len(assets), "pc_quality": options.get("pc-quality", "N/A")},
        )
        report_storage = f"processed/{job_id}/report/{os.path.basename(report_path)}"
        supabase_client.upload_result(report_path, report_storage)
        uploaded["report"] = report_storage

        nodeodm_client.remove_task(task_uuid)

        _fire_callback(callback_url, {
            "job_id": job_id,
            "status": "complete",
            "uploaded_paths": uploaded,
            "task_uuid": task_uuid,
        })

    except Exception as e:
        print(f"  [WebODM] Error: {e}")
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
        print(f"  [WebODM] Callback failed: {e}")
