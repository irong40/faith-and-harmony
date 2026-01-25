"""
NodeODM API client for photogrammetry processing.
Handles task submission, status polling, and result downloading.
"""
import os
import time
import zipfile
import requests
from typing import Any

from config import config


class NodeODMClient:
    """Client for interacting with NodeODM API."""
    
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or config.NODEODM_URL).rstrip("/")
    
    def health_check(self) -> bool:
        """Check if NodeODM server is reachable."""
        try:
            response = requests.get(f"{self.base_url}/info", timeout=5)
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def create_task(
        self,
        image_paths: list[str],
        options: dict[str, Any] | None = None
    ) -> str:
        """
        Create a new processing task with uploaded images.
        
        Args:
            image_paths: List of local file paths to drone images
            options: NodeODM processing options (dsm, orthophoto, etc.)
            
        Returns:
            Task UUID from NodeODM
        """
        # Prepare files for upload
        files = []
        for path in image_paths:
            file_name = os.path.basename(path)
            files.append(("images", (file_name, open(path, "rb"), "image/jpeg")))
        
        # Prepare options
        processing_options = options or config.DEFAULT_OPTIONS
        options_list = [{"name": k, "value": v} for k, v in processing_options.items()]
        
        try:
            response = requests.post(
                f"{self.base_url}/task/new",
                files=files,
                data={"options": str(options_list)},
                timeout=300  # 5 min timeout for upload
            )
            response.raise_for_status()
            
            result = response.json()
            task_uuid = result.get("uuid")
            print(f"  Created NodeODM task: {task_uuid}")
            return task_uuid
            
        finally:
            # Close file handles
            for _, file_tuple in files:
                file_tuple[1].close()
    
    def get_task_status(self, task_uuid: str) -> dict[str, Any]:
        """
        Get current status of a task.
        
        Args:
            task_uuid: UUID of the NodeODM task
            
        Returns:
            Task info dict with status, progress, etc.
        """
        response = requests.get(f"{self.base_url}/task/{task_uuid}/info", timeout=30)
        response.raise_for_status()
        return response.json()
    
    def wait_for_completion(
        self,
        task_uuid: str,
        poll_interval: int = 30,
        timeout: int = 7200  # 2 hours default
    ) -> dict[str, Any]:
        """
        Poll task until completion or failure.
        
        Args:
            task_uuid: UUID of the NodeODM task
            poll_interval: Seconds between status checks
            timeout: Max seconds to wait
            
        Returns:
            Final task info dict
            
        Raises:
            TimeoutError: If task doesn't complete within timeout
            RuntimeError: If task fails
        """
        start_time = time.time()
        
        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                raise TimeoutError(f"Task {task_uuid} timed out after {timeout}s")
            
            status = self.get_task_status(task_uuid)
            task_status = status.get("status", {})
            code = task_status.get("code", 0)
            
            # Status codes: 10=queued, 20=running, 30=failed, 40=completed, 50=canceled
            if code == 40:  # Completed
                print(f"  Task completed successfully")
                return status
            elif code == 30:  # Failed
                error = task_status.get("errorMessage", "Unknown error")
                raise RuntimeError(f"Task failed: {error}")
            elif code == 50:  # Canceled
                raise RuntimeError("Task was canceled")
            
            progress = status.get("progress", 0)
            print(f"  Progress: {progress:.1f}% (elapsed: {elapsed:.0f}s)")
            time.sleep(poll_interval)
    
    def download_results(self, task_uuid: str, output_dir: str) -> dict[str, str]:
        """
        Download processing results from completed task.
        
        Args:
            task_uuid: UUID of the completed NodeODM task
            output_dir: Directory to save results
            
        Returns:
            Dict mapping result type to local file path
        """
        results: dict[str, str] = {}
        
        # Download the all.zip which contains everything
        zip_url = f"{self.base_url}/task/{task_uuid}/download/all.zip"
        zip_path = os.path.join(output_dir, "all.zip")
        
        print(f"  Downloading results archive...")
        response = requests.get(zip_url, stream=True, timeout=600)
        response.raise_for_status()
        
        with open(zip_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Extract the zip
        extract_dir = os.path.join(output_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)
        
        # Find key output files
        for root, _, files in os.walk(extract_dir):
            for file in files:
                file_path = os.path.join(root, file)
                
                if file == "textured_model.obj" or file.endswith("_mesh.obj"):
                    results["model_obj"] = file_path
                elif file == "textured_model.glb" or file.endswith(".glb"):
                    results["model_glb"] = file_path
                elif file == "odm_orthophoto.tif":
                    results["orthophoto"] = file_path
                elif file.endswith(".ply") and "pointcloud" in file.lower():
                    results["pointcloud"] = file_path
        
        print(f"  Found {len(results)} result files")
        return results
    
    def cancel_task(self, task_uuid: str) -> bool:
        """Cancel a running task."""
        try:
            response = requests.post(
                f"{self.base_url}/task/{task_uuid}/cancel",
                timeout=30
            )
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def remove_task(self, task_uuid: str) -> bool:
        """Remove a task and its data from NodeODM."""
        try:
            response = requests.post(
                f"{self.base_url}/task/{task_uuid}/remove",
                timeout=30
            )
            return response.status_code == 200
        except requests.RequestException:
            return False


# Singleton instance
nodeodm_client = NodeODMClient()
