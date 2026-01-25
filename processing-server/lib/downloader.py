import os
import requests

def download_assets(supabase, job_id: str, download_dir: str):
    """
    Downloads all original assets for a job to the specified directory.
    """
    os.makedirs(download_dir, exist_ok=True)
    
    print(f"Fetching asset list for job {job_id}...")
    response = supabase.table("drone_assets") \
        .select("*") \
        .eq("job_id", job_id) \
        .execute()
        
    assets = response.data
    if not assets:
        print(f"No assets found for job {job_id}")
        return []

    downloaded_paths = []
    
    for asset in assets:
        url = asset.get("file_path")
        if not url:
            continue
            
        final_url = url
        # Check if it's a relative path (not starting with http)
        if not url.startswith("http"):
            # Assuming bucket is 'drone-jobs' based on system design
            try:
                bucket = "drone-jobs"
                res = supabase.storage.from_(bucket).create_signed_url(url, 3600)
                if 'signedURL' in res:
                    qs = res['signedURL']
                    if qs.startswith("http"):
                        final_url = qs
                    else:
                        final_url = f"{supabase.url}{qs}"
            except Exception as e:
                print(f"Failed to sign URL for {url}: {e}")
                continue

        filename = asset.get("file_name") or os.path.basename(url)
        local_path = os.path.join(download_dir, filename)
        
        # Skip if already exists
        if os.path.exists(local_path):
            downloaded_paths.append(local_path)
            continue
            
        print(f"Downloading {filename}...")
        try:
            with requests.get(final_url, stream=True) as r:
                r.raise_for_status()
                with open(local_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            downloaded_paths.append(local_path)
            
        except Exception as e:
            print(f"Failed to download {url}: {e}")
            
    return downloaded_paths
