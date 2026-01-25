"""
Supabase client wrapper for the photogrammetry worker.
Handles database operations and storage uploads/downloads.
"""
import os
import tempfile
from typing import Any
from supabase import create_client, Client

from config import config


class SupabaseClient:
    """Wrapper for Supabase operations."""
    
    def __init__(self):
        self.client: Client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY
        )
    
    def get_pending_jobs(self) -> list[dict[str, Any]]:
        """
        Fetch drone jobs with photogrammetry_status = 'pending'.
        Returns list of job records.
        """
        response = self.client.table("drone_jobs").select(
            "id, job_number, property_address, processing_options"
        ).eq(
            "photogrammetry_status", "pending"
        ).order(
            "created_at", desc=False
        ).limit(1).execute()
        
        return response.data or []
    
    def get_job_assets(self, job_id: str) -> list[dict[str, Any]]:
        """
        Fetch all image assets for a job.
        Returns list of asset records with file paths.
        """
        response = self.client.table("drone_assets").select(
            "id, file_name, file_path, file_type"
        ).eq(
            "job_id", job_id
        ).eq(
            "file_type", "image"
        ).execute()
        
        return response.data or []
    
    def update_job_status(
        self,
        job_id: str,
        status: str,
        **kwargs: Any
    ) -> None:
        """
        Update job photogrammetry status and optionally other fields.
        
        Args:
            job_id: UUID of the drone job
            status: New photogrammetry_status value
            **kwargs: Additional fields to update (nodeodm_task_id, model_file_path, etc.)
        """
        update_data = {"photogrammetry_status": status, **kwargs}
        
        self.client.table("drone_jobs").update(update_data).eq("id", job_id).execute()
        print(f"  Updated job {job_id} status to '{status}'")
    
    def download_asset(self, file_path: str, local_dir: str) -> str:
        """
        Download an asset from Supabase storage to local directory.
        
        Args:
            file_path: Storage path in drone-jobs bucket
            local_dir: Local directory to save file
            
        Returns:
            Local file path
        """
        file_name = os.path.basename(file_path)
        local_path = os.path.join(local_dir, file_name)
        
        # Download file bytes
        response = self.client.storage.from_(config.STORAGE_BUCKET).download(file_path)
        
        with open(local_path, "wb") as f:
            f.write(response)
        
        return local_path
    
    def upload_result(self, local_path: str, storage_path: str) -> str:
        """
        Upload a processed result file to Supabase storage.
        
        Args:
            local_path: Path to local file
            storage_path: Destination path in drone-jobs bucket
            
        Returns:
            Storage URL
        """
        with open(local_path, "rb") as f:
            file_bytes = f.read()
        
        # Determine content type
        if local_path.endswith(".obj"):
            content_type = "model/obj"
        elif local_path.endswith(".glb"):
            content_type = "model/gltf-binary"
        elif local_path.endswith(".ply"):
            content_type = "application/octet-stream"
        elif local_path.endswith(".tif") or local_path.endswith(".tiff"):
            content_type = "image/tiff"
        else:
            content_type = "application/octet-stream"
        
        self.client.storage.from_(config.STORAGE_BUCKET).upload(
            storage_path,
            file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        
        return storage_path
    
    def get_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        Generate a signed URL for a storage file.
        
        Args:
            file_path: Storage path in drone-jobs bucket
            expires_in: Seconds until URL expires (default 1 hour)
            
        Returns:
            Signed URL string
        """
        response = self.client.storage.from_(config.STORAGE_BUCKET).create_signed_url(
            file_path, expires_in
        )
        return response.get("signedURL", "")


# Singleton instance
supabase_client = SupabaseClient()
