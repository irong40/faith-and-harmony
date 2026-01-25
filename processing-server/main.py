import os
import sys
import time
import shutil
from dotenv import load_dotenv
from lib.supabase_client import get_supabase_client
from lib.job_manager import check_pending_jobs, update_job_status
from lib.downloader import download_assets
from lib.uploader import upload_results
from lib.odm_client import ODMClient

# Load environment variables
load_dotenv()

def main():
    print("Starting Drone Processing Worker...")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        sys.exit(1)

    print(f"Connecting to Supabase at {supabase_url}...")
    supabase = get_supabase_client(supabase_url, supabase_key)
    
    # Initialize ODM Client
    odm = ODMClient(host=os.getenv("NODEODM_HOST", "http://localhost:3000"))

    print("Worker running. Waiting for jobs...")
    
    while True:
        try:
            job = check_pending_jobs(supabase)
            if job:
                job_id = job['id']
                print(f"Found job: {job_id} (Status: {job.get('photogrammetry_status')})")
                
                # Mark as processing
                update_job_status(supabase, job_id, "processing")
                
                temp_dir = os.path.join("files", "temp", job_id)
                output_dir = os.path.join("files", "output", job_id)
                
                try:
                    # 1. Download Assets
                    print("Downloading assets...")
                    image_paths = download_assets(supabase, job_id, temp_dir)
                    
                    if not image_paths:
                        print("No images found for job. Failing.")
                        update_job_status(supabase, job_id, "failed")
                        continue

                    # 2. Start NodeODM Task
                    print("Starting NodeODM task...")
                    options = job.get('processing_options') or {'dsm': True, 'orthophoto-resolution': 5}
                    
                    task_id = odm.create_task(image_paths, options)
                    update_job_status(supabase, job_id, "processing", task_id)
                    
                    # 3. Poll Status
                    while True:
                        status_info = odm.get_task_status(task_id)
                        status = status_info.get('status', {}).get('code', 0)
                        progress = status_info.get('progress', 0)
                        
                        # Status codes: 10=QUEUED, 20=RUNNING, 30=FAILED, 40=COMPLETED, 50=CANCELED
                        status_name = {10: 'QUEUED', 20: 'RUNNING', 30: 'FAILED', 40: 'COMPLETED', 50: 'CANCELED'}.get(status, 'UNKNOWN')
                        print(f"Task {task_id}: {status_name} ({progress}%)")
                        
                        if status == 40:  # COMPLETED
                            break
                        elif status in [30, 50]:  # FAILED or CANCELED
                            raise Exception(f"NodeODM Task failed: {status_name}")
                            
                        time.sleep(5)
                        
                    # 4. Download Results from NodeODM
                    print("Downloading results from NodeODM...")
                    os.makedirs(output_dir, exist_ok=True)
                    odm.download_assets(task_id, output_dir) 
                    
                except Exception as e:
                    print(f"Processing failed: {e}")
                    update_job_status(supabase, job_id, "failed")
                    time.sleep(5)
                    continue

                # 5. Upload Results
                print("Uploading results...")
                urls = upload_results(supabase, job_id, output_dir)
                
                # 6. Update job with URLs and mark complete
                update_job_status(supabase, job_id, "completed")
                
                # Cleanup
                print("Cleaning up...")
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                if os.path.exists(output_dir):
                    shutil.rmtree(output_dir)
                    
            else:
                pass  # No jobs found
                
            time.sleep(10)
        except KeyboardInterrupt:
            print("Worker stopped.")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    main()
