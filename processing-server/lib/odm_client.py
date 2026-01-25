import requests
import time
import os
import json
import zipfile
import io

class ODMClient:
    def __init__(self, host: str = "http://localhost:3000"):
        self.host = host

    def create_task(self, image_paths: list[str], options: dict = None) -> str:
        """
        Creates a processed task in NodeODM.
        :param image_paths: List of local paths to images.
        :param options: Processing options dict (e.g. {'dsm': True})
        :return: Task UUID
        """
        url = f"{self.host}/task/new"
        
        # Convert options dict to NodeODM name/value list format
        # e.g. {'dsm': True} -> [{'name': 'dsm', 'value': 'true'}]
        # Note: NodeODM options often expect string values or booleans.
        nodeodm_options = []
        if options:
            for k, v in options.items():
                if isinstance(v, bool):
                    val = "true" if v else "false" # NodeODM matches string "true" usually, or literal true. Safe is literal if JSON.
                    # Actually API docs say "value": value1. 
                    # If I use json.dumps, literal boolean is fine.
                    val = v 
                else:
                    val = v
                nodeodm_options.append({"name": k, "value": val})
        
        # Prepare multipart upload
        files = []
        for path in image_paths:
            filename = os.path.basename(path)
            # 'images' is the key expected by NodeODM
            files.append(('images', (filename, open(path, 'rb'), 'image/jpeg')))
            
        if nodeodm_options:
             files.append(('options', (None, json.dumps(nodeodm_options))))

        try:
            print(f"Uploading {len(image_paths)} images to NodeODM at {url}...")
            # print(f"Options: {json.dumps(nodeodm_options)}")
            response = requests.post(url, files=files)
            
            # Close file handles
            for _, (___, f, ____) in files:
                if hasattr(f, 'close'):
                    f.close()
                    
            if response.status_code == 200:
                task_id = response.json().get('uuid')
                print(f"NodeODM Task Created: {task_id}")
                return task_id
            else:
                raise Exception(f"NodeODM Error {response.status_code}: {response.text}")

        except Exception as e:
            # Ensure files are closed in case of error
            for _, (__ , f, ___) in files:
                 if hasattr(f, 'close'):
                    f.close()
            raise e

    def get_task_status(self, task_id: str) -> dict:
        """
        Returns {'status': 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED', 'progress': 0-100}
        """
        url = f"{self.host}/task/{task_id}/info"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        raise Exception(f"Failed to get info for task {task_id}: {response.text}")

    def download_assets(self, task_id: str, output_dir: str):
        """
        Downloads all.zip and extracts to output_dir
        """
        url = f"{self.host}/task/{task_id}/download/all.zip"
        print(f"Downloading results from {url}...")
        
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            # Unzip directly
            z = zipfile.ZipFile(io.BytesIO(r.content))
            z.extractall(output_dir)
            print(f"Extracted results to {output_dir}")

