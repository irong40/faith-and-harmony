"""
Photogrammetry Worker - Main polling loop.

This script continuously polls Supabase for pending photogrammetry jobs,
processes them via NodeODM, and uploads results back to Supabase.

Usage:
    python worker.py         # Run continuous polling loop
    python worker.py --once  # Process one job and exit
"""
import os
import sys
import time
import shutil
import tempfile
import argparse
from datetime import datetime, timezone

from config import config
from supabase_client import supabase_client
from nodeodm_client import nodeodm_client


def process_job(job: dict) -> bool:
    """
    Process a single photogrammetry job.
    
    Args:
        job: Job record from Supabase with id, job_number, etc.
        
    Returns:
        True if successful, False if failed
    """
    job_id = job["id"]
    job_number = job.get("job_number", job_id[:8])
    processing_options = job.get("processing_options") or {}
    
    print(f"\n{'='*60}")
    print(f"Processing job: {job_number}")
    print(f"{'='*60}")
    
    # Create temp directory for this job
    temp_dir = tempfile.mkdtemp(
        prefix=f"photogrammetry_{job_number}_",
        dir=config.TEMP_DIR or None
    )
    
    try:
        # Step 1: Mark as queued
        supabase_client.update_job_status(
            job_id,
            "queued",
            processing_started_at=datetime.now(timezone.utc).isoformat()
        )
        
        # Step 2: Get job assets (images)
        print("  Fetching image assets...")
        assets = supabase_client.get_job_assets(job_id)
        
        if not assets:
            raise ValueError("No image assets found for this job")
        
        print(f"  Found {len(assets)} images")
        
        # Step 3: Download images
        print("  Downloading images...")
        image_paths = []
        for asset in assets:
            local_path = supabase_client.download_asset(
                asset["file_path"],
                temp_dir
            )
            image_paths.append(local_path)
            print(f"    Downloaded: {asset['file_name']}")
        
        # Step 4: Check NodeODM health
        if not nodeodm_client.health_check():
            raise ConnectionError(f"NodeODM server not reachable at {config.NODEODM_URL}")
        
        # Step 5: Create NodeODM task
        print("  Submitting to NodeODM...")
        task_uuid = nodeodm_client.create_task(
            image_paths,
            options=processing_options or None
        )
        
        # Update job with task ID
        supabase_client.update_job_status(
            job_id,
            "processing",
            nodeodm_task_id=task_uuid
        )
        
        # Step 6: Wait for completion
        print("  Waiting for processing to complete...")
        nodeodm_client.wait_for_completion(
            task_uuid,
            poll_interval=30,
            timeout=7200  # 2 hours
        )
        
        # Step 7: Download results
        print("  Downloading results...")
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        
        results = nodeodm_client.download_results(task_uuid, output_dir)
        
        if not results:
            raise ValueError("No result files found after processing")
        
        # Step 8: Upload results to Supabase
        print("  Uploading results to Supabase...")
        storage_base = f"processed/{job_id}/3d-model"
        uploaded_paths = {}
        
        for result_type, local_path in results.items():
            file_name = os.path.basename(local_path)
            storage_path = f"{storage_base}/{file_name}"
            
            supabase_client.upload_result(local_path, storage_path)
            uploaded_paths[result_type] = storage_path
            print(f"    Uploaded: {file_name}")
        
        # Step 9: Update job as completed
        update_fields = {
            "processing_completed_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if "model_obj" in uploaded_paths:
            update_fields["model_file_path"] = uploaded_paths["model_obj"]
        elif "model_glb" in uploaded_paths:
            update_fields["model_file_path"] = uploaded_paths["model_glb"]
        
        if "orthophoto" in uploaded_paths:
            update_fields["orthophoto_path"] = uploaded_paths["orthophoto"]
        
        if "pointcloud" in uploaded_paths:
            update_fields["pointcloud_path"] = uploaded_paths["pointcloud"]
        
        supabase_client.update_job_status(job_id, "completed", **update_fields)
        
        # Step 10: Clean up NodeODM task
        nodeodm_client.remove_task(task_uuid)
        
        print(f"\n✓ Job {job_number} completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n✗ Job {job_number} failed: {e}")
        
        # Update job status to failed
        supabase_client.update_job_status(
            job_id,
            "failed",
            processing_error=str(e),
            processing_completed_at=datetime.now(timezone.utc).isoformat()
        )
        return False
        
    finally:
        # Clean up temp directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


def poll_once() -> bool:
    """
    Poll for and process a single pending job.
    
    Returns:
        True if a job was found and processed (regardless of success).
        False if no pending jobs.
    """
    jobs = supabase_client.get_pending_jobs()
    
    if not jobs:
        return False
    
    job = jobs[0]
    process_job(job)
    return True


def run_polling_loop() -> None:
    """
    Run continuous polling loop.
    Polls for pending jobs every POLL_INTERVAL_SECONDS.
    """
    print(f"\n{'='*60}")
    print("Photogrammetry Worker Started")
    print(f"{'='*60}")
    print(f"Supabase URL: {config.SUPABASE_URL}")
    print(f"NodeODM URL: {config.NODEODM_URL}")
    print(f"Poll Interval: {config.POLL_INTERVAL_SECONDS}s")
    print(f"{'='*60}\n")
    
    # Validate NodeODM connection
    if not nodeodm_client.health_check():
        print(f"WARNING: NodeODM not reachable at {config.NODEODM_URL}")
        print("Worker will continue but jobs will fail until NodeODM is available.\n")
    else:
        print("NodeODM connection OK\n")
    
    while True:
        try:
            found = poll_once()
            
            if not found:
                print(".", end="", flush=True)
            
        except KeyboardInterrupt:
            print("\n\nShutting down...")
            break
        except Exception as e:
            print(f"\nError in polling loop: {e}")
        
        time.sleep(config.POLL_INTERVAL_SECONDS)


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Photogrammetry processing worker"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Process one job and exit"
    )
    args = parser.parse_args()
    
    # Validate config
    if not config.validate():
        sys.exit(1)
    
    if args.once:
        found = poll_once()
        if not found:
            print("No pending jobs found.")
    else:
        run_polling_loop()


if __name__ == "__main__":
    main()
