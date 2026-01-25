# Photogrammetry Processing Server

This Python worker polls Supabase for pending drone photogrammetry jobs and processes them via NodeODM.

## Prerequisites

1. **Python 3.10+** installed
2. **NodeODM** running locally or on a server:

   ```bash
   # Docker (easiest)
   docker run -p 3000:3000 opendronemap/nodeodm
   ```

## Setup

1. **Install dependencies:**

   ```bash
   cd processing-server
   pip install -r requirements.txt
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Required environment variables:**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)
   - `NODEODM_URL` - NodeODM server URL (default: <http://localhost:3000>)

## Usage

**Continuous polling:**

```bash
python worker.py
```

**Process one job and exit:**

```bash
python worker.py --once
```

## How It Works

1. Worker polls `drone_jobs` table for `photogrammetry_status = 'pending'`
2. Downloads raw drone images from Supabase storage
3. Submits images to NodeODM for photogrammetry processing
4. Polls NodeODM until processing completes (~30min-2hrs depending on image count)
5. Downloads results (3D model, orthophoto, point cloud)
6. Uploads results to Supabase storage: `processed/{job_id}/3d-model/`
7. Updates job status to 'completed' with file paths

## Triggering a Job

Set `photogrammetry_status = 'pending'` on any drone job with uploaded images:

```sql
UPDATE drone_jobs 
SET photogrammetry_status = 'pending'
WHERE id = 'your-job-uuid';
```

## Processing Options

Override default NodeODM options via the `processing_options` column:

```json
{
  "dsm": true,
  "orthophoto-resolution": 5,
  "mesh-octree-depth": 12,
  "pc-quality": "high"
}
```

See [NodeODM Documentation](https://docs.opendronemap.org/arguments/) for all options.
