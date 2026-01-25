import os

def upload_results(supabase, job_id: str, result_dir: str) -> dict:
    """
    Uploads processed files (ortho, model) to Supabase Storage.
    Returns a dict of public URLs.
    """
    bucket = "drone-processed-assets"
    urls = {}
    
    files_to_check = [
        ("odm_orthophoto/odm_orthophoto.tif", "orthophoto.tif"),
        ("odm_texturing/odm_textured_model_geo.obj", "model.obj"),
        ("odm_texturing/odm_textured_model_geo.mtl", "model.mtl"),
    ]
    
    for relative_path, dest_name in files_to_check:
        full_path = os.path.join(result_dir, relative_path)
        if not os.path.exists(full_path):
            full_path = os.path.join(result_dir, os.path.basename(relative_path))
        
        if os.path.exists(full_path):
            remote_path = f"{job_id}/{dest_name}"
            print(f"Uploading {dest_name} to {remote_path}...")
            
            try:
                with open(full_path, 'rb') as f:
                    supabase.storage.from_(bucket).upload(
                        path=remote_path,
                        file=f,
                        file_options={"upsert": "true"}
                    )
                
                public_url = supabase.storage.from_(bucket).get_public_url(remote_path)
                urls[dest_name] = public_url
                print(f"Uploaded: {public_url}")
                
            except Exception as e:
                print(f"Failed to upload {dest_name}: {e}")
                
    return urls
