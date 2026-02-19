"""
Debug script to test drone-qa-analyze Edge Function directly
and get detailed error information.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qjpujskwqaehxnqypxzu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set in .env")
    exit(1)

# First, get an asset to test with
print("Fetching a test asset from drone_assets...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/drone_assets?limit=1&select=id,file_name,file_path",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
)

if response.status_code != 200:
    print(f"Failed to fetch assets: {response.status_code}")
    print(response.text)
    exit(1)

assets = response.json()
if not assets:
    print("No assets found in drone_assets table")
    exit(1)

asset = assets[0]
print(f"\nTest asset:")
print(f"  ID: {asset['id']}")
print(f"  Name: {asset['file_name']}")
print(f"  Path: {asset['file_path']}")

# Test if the file_path URL is accessible
print(f"\nTesting if image URL is publicly accessible...")
try:
    img_response = requests.head(asset['file_path'], timeout=10)
    print(f"  Status: {img_response.status_code}")
    if img_response.status_code == 200:
        print("  ✓ Image is accessible!")
    else:
        print(f"  ✗ Image NOT accessible! Status {img_response.status_code}")
        print(f"  This is why QA analysis fails - the Edge Function can't fetch the image.")
        print(f"\n  FIX: Run this SQL in Supabase Dashboard:")
        print(f"  UPDATE storage.buckets SET public = true WHERE id = 'drone-jobs';")
except Exception as e:
    print(f"  ✗ Error accessing image: {e}")

# Now call the Edge Function
print(f"\nCalling drone-qa-analyze Edge Function...")
fn_response = requests.post(
    f"{SUPABASE_URL}/functions/v1/drone-qa-analyze",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    },
    json={"asset_id": asset['id']}
)

print(f"\nEdge Function Response:")
print(f"  Status: {fn_response.status_code}")
print(f"  Headers: {dict(fn_response.headers)}")
print(f"  Body: {fn_response.text}")
