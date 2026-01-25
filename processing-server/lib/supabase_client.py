import os
import requests
import json

class SupabaseTable:
    def __init__(self, url: str, key: str, table_name: str):
        self.url = f"{url}/rest/v1/{table_name}"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def select(self, columns: str = "*"):
        self._query_params = {"select": columns}
        return self

    def eq(self, column: str, value: str):
        self._query_params[f"{column}"] = f"eq.{value}"
        return self

    def limit(self, limit: int):
        self._query_params["limit"] = str(limit)
        return self

    def execute(self):
        try:
            response = requests.get(self.url, headers=self.headers, params=self._query_params)
            response.raise_for_status()
            return type('Response', (object,), {"data": response.json()})()
        except Exception as e:
            print(f"DB Select Error: {e}")
            return type('Response', (object,), {"data": []})()

    def update(self, data: dict):
        self._update_data = data
        return self

    # This update structure needs to chain into execute or eq...
    # Standard supabase-py: table().update(data).eq(id).execute()
    # My simple version needs to store state.

class SimpleSupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
        }

    def table(self, name: str):
        return TableBuilder(self.url, self.key, name)

    @property
    def storage(self):
        return StorageBuilder(self.url, self.key)

class TableBuilder:
    def __init__(self, url: str, key: str, name: str):
        self.base_url = f"{url}/rest/v1/{name}"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        self.params = {}
        self.method = "GET"
        self.data_payload = None

    def select(self, columns="*"):
        self.method = "GET"
        self.params["select"] = columns
        return self

    def update(self, data: dict):
        self.method = "PATCH"
        self.data_payload = data
        return self

    def eq(self, column: str, value: str):
        self.params[f"{column}"] = f"eq.{value}"
        return self

    def limit(self, count: int):
        self.params["limit"] = str(count)
        return self

    def execute(self):
        url = self.base_url
        if self.method == "GET":
            r = requests.get(url, headers=self.headers, params=self.params)
        elif self.method == "PATCH":
            r = requests.patch(url, headers=self.headers, params=self.params, json=self.data_payload)
        else:
            raise ValueError("Unsupported method")
        
        # Raise for status but catch to allow worker to continue
        r.raise_for_status()
        return type('Response', (object,), {"data": r.json()})()

class StorageBuilder:
    def __init__(self, url: str, key: str):
        self.url = f"{url}/storage/v1"
        self.key = key
    
    def from_(self, bucket_id: str):
        return StorageBucket(self.url, self.key, bucket_id)

class StorageBucket:
    def __init__(self, url: str, key: str, bucket_id: str):
        self.url = url
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
        }
        self.bucket_id = bucket_id

    def upload(self, path: str, file, file_options: dict = None):
        # POST /object/{bucket}/{path}
        # https://supabase.github.io/storage-api/#/object/post_object__bucket___path_
        
        url = f"{self.url}/object/{self.bucket_id}/{path}"
        
        # requests will assume file-like object is at beginning
        # content-type is usually handled by requests lib for multipart
        
        # 'file_options': {'upsert': 'true'} -> Headers: x-upsert: true
        headers = self.headers.copy()
        if file_options and file_options.get("upsert") == "true":
            headers["x-upsert"] = "true"
        
        # We need to send raw bytes or file object
        # requests.post(url, data=file_content, headers=...)
        # But supabase-py logic is usually files={'file': ...}?
        # Actually Storage API expects raw body for binary uploads usually, OR multipart.
        # Supabase Storage supports both. Let's try raw binary if we can, or multipart.
        # simpler: requests.post(url, files={'file': file}) ?
        
        # Let's read the file object if it's open
        # The calling code passes `file=f` which is `open(..., 'rb')`
        
        # Using requests to upload file content directly as body (binary)
        # requires setting Content-Type correctly if known, or letting Supabase guess.
        # Common pattern:
        r = requests.post(url, headers=headers, data=file)
        r.raise_for_status()
        return r.json()

    def get_public_url(self, path: str):
        # GET /object/public/{bucket}/{path}
        return f"{self.url}/object/public/{self.bucket_id}/{path}"

    def list(self, path: str = None):
        # POST /object/list/{bucket}
        url = f"{self.url}/object/list/{self.bucket_id}"
        json_body = {"prefix": path or "", "limit": 100, "offset": 0, "sortBy": {"column": "name", "order": "asc"}}
        r = requests.post(url, headers=self.headers, json=json_body)
        r.raise_for_status()
        return r.json()

    def create_signed_url(self, path: str, expires_in: int):
        # POST /object/sign/{bucket}/{path}
        url = f"{self.url}/object/sign/{self.bucket_id}/{path}"
        json_body = {"expiresIn": expires_in}
        r = requests.post(url, headers=self.headers, json=json_body)
        r.raise_for_status()
        return r.json() # returns {'signedURL': '...'}

def get_supabase_client(url: str, key: str):
    return SimpleSupabaseClient(url, key)
