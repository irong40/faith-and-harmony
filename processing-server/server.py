"""
Sentinel Processing Server.
FastAPI application exposed via Cloudflare Tunnel. Receives processing
requests from n8n workflows, runs long-running tasks in the background,
and POSTs callbacks on completion.
"""
import os
import shutil
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import config

app = FastAPI(title="Sentinel Processing Server", version="1.0.0")


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

def verify_api_key(x_sentinel_key: Annotated[str | None, Header()] = None):
    if not config.SENTINEL_API_KEY:
        raise HTTPException(500, "SENTINEL_API_KEY not configured on server")
    if x_sentinel_key != config.SENTINEL_API_KEY:
        raise HTTPException(401, "Invalid or missing X-Sentinel-Key")


AuthDep = Depends(verify_api_key)


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class AssetItem(BaseModel):
    id: str | None = None
    file_name: str
    file_path: str
    capture_date: str | None = None
    compass_direction: str | None = None


class LightroomRequest(BaseModel):
    job_id: str
    preset_name: str
    assets: list[AssetItem]
    callback_url: str


class LabelRequest(BaseModel):
    job_id: str
    address: str
    assets: list[AssetItem]
    callback_url: str


class WebODMRequest(BaseModel):
    job_id: str
    address: str
    scheduled_date: str = ""
    assets: list[AssetItem]
    processing_options: dict | None = None
    callback_url: str


class ProcessedFileItem(BaseModel):
    storage_path: str
    file_name: str


class PackageRequest(BaseModel):
    job_id: str
    job_number: str
    property_address: str
    package_code: str
    processed_files: list[ProcessedFileItem]
    include_social: bool = False
    include_raw: bool = False
    include_technical: bool = False
    scheduled_date: str | None = None
    callback_url: str = ""


# ---------------------------------------------------------------------------
# In-memory job tracking
# ---------------------------------------------------------------------------

_jobs: dict[str, dict] = {}


def _track_job(job_id: str, handler: str, status: str = "running") -> str:
    _jobs[job_id] = {
        "job_id": job_id,
        "handler": handler,
        "status": status,
        "started_at": datetime.utcnow().isoformat(),
    }
    return job_id


def _get_job(job_id: str) -> dict:
    return _jobs.get(job_id, {"job_id": job_id, "status": "not_found"})


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health", dependencies=[AuthDep])
async def health_check():
    """Return rig status, disk space, and service availability."""
    temp_dir = config.TEMP_DIR or os.path.expanduser("~")
    try:
        usage = shutil.disk_usage(temp_dir)
        disk = {
            "total_gb": round(usage.total / (1024 ** 3), 1),
            "free_gb": round(usage.free / (1024 ** 3), 1),
            "used_pct": round(usage.used / usage.total * 100, 1),
        }
    except Exception:
        disk = {"error": "unable to read disk usage"}

    from nodeodm_client import nodeodm_client
    nodeodm_ok = nodeodm_client.health_check()

    lr_watch = config.LIGHTROOM_WATCH_DIR
    lr_export = config.LIGHTROOM_EXPORT_DIR

    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "disk": disk,
        "nodeodm_available": nodeodm_ok,
        "lightroom_watch_dir": lr_watch if lr_watch and os.path.isdir(lr_watch) else None,
        "lightroom_export_dir": lr_export if lr_export and os.path.isdir(lr_export) else None,
        "active_jobs": len([j for j in _jobs.values() if j["status"] == "running"]),
    }


# ---------------------------------------------------------------------------
# Lightroom
# ---------------------------------------------------------------------------

@app.post("/api/lightroom/process", dependencies=[AuthDep])
async def lightroom_process(req: LightroomRequest, background_tasks: BackgroundTasks):
    from handlers.lightroom_handler import process_lightroom_batch

    _track_job(req.job_id, "lightroom")
    background_tasks.add_task(
        process_lightroom_batch,
        job_id=req.job_id,
        preset_name=req.preset_name,
        assets=[a.model_dump() for a in req.assets],
        callback_url=req.callback_url,
    )
    return {"job_id": req.job_id, "status": "accepted", "handler": "lightroom"}


@app.get("/api/lightroom/status/{job_id}", dependencies=[AuthDep])
async def lightroom_status(job_id: str):
    return _get_job(job_id)


# ---------------------------------------------------------------------------
# Label
# ---------------------------------------------------------------------------

@app.post("/api/label/process", dependencies=[AuthDep])
async def label_process(req: LabelRequest, background_tasks: BackgroundTasks):
    from handlers.label_handler import process_label_batch

    _track_job(req.job_id, "label")
    background_tasks.add_task(
        process_label_batch,
        job_id=req.job_id,
        address=req.address,
        assets=[a.model_dump() for a in req.assets],
        callback_url=req.callback_url,
    )
    return {"job_id": req.job_id, "status": "accepted", "handler": "label"}


@app.get("/api/label/status/{job_id}", dependencies=[AuthDep])
async def label_status(job_id: str):
    return _get_job(job_id)


# ---------------------------------------------------------------------------
# WebODM
# ---------------------------------------------------------------------------

@app.post("/api/webodm/process", dependencies=[AuthDep])
async def webodm_process(req: WebODMRequest, background_tasks: BackgroundTasks):
    from handlers.webodm_handler import process_webodm_batch

    _track_job(req.job_id, "webodm")
    background_tasks.add_task(
        process_webodm_batch,
        job_id=req.job_id,
        address=req.address,
        scheduled_date=req.scheduled_date,
        assets=[a.model_dump() for a in req.assets],
        processing_options=req.processing_options,
        callback_url=req.callback_url,
    )
    return {"job_id": req.job_id, "status": "accepted", "handler": "webodm"}


@app.get("/api/webodm/status/{job_id}", dependencies=[AuthDep])
async def webodm_status(job_id: str):
    return _get_job(job_id)


# ---------------------------------------------------------------------------
# Package
# ---------------------------------------------------------------------------

@app.post("/api/package/create", dependencies=[AuthDep])
async def package_create(req: PackageRequest, background_tasks: BackgroundTasks):
    from handlers.package_handler import create_delivery_package

    _track_job(req.job_id, "package")
    background_tasks.add_task(
        create_delivery_package,
        job_id=req.job_id,
        job_number=req.job_number,
        property_address=req.property_address,
        package_code=req.package_code,
        processed_files=[p.model_dump() for p in req.processed_files],
        include_social=req.include_social,
        include_raw=req.include_raw,
        include_technical=req.include_technical,
        scheduled_date=req.scheduled_date,
        callback_url=req.callback_url,
    )
    return {"job_id": req.job_id, "status": "accepted", "handler": "package"}


@app.get("/api/package/status/{job_id}", dependencies=[AuthDep])
async def package_status(job_id: str):
    return _get_job(job_id)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    os.makedirs(config.TEMP_DIR, exist_ok=True)
    if not config.validate():
        print("WARNING: Configuration validation failed. Some features may not work.")
    print(f"Sentinel Processing Server started. Temp dir: {config.TEMP_DIR}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
