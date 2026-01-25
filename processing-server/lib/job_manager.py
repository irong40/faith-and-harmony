def check_pending_jobs(supabase):
    """
    Checks for jobs with photogrammetry_status = 'pending' or 'queued'.
    Returns the first matching job or None.
    """
    try:
        # Check for 'queued' jobs first
        response = supabase.table("drone_jobs") \
            .select("*") \
            .eq("photogrammetry_status", "queued") \
            .limit(1) \
            .execute()
            
        if response.data and len(response.data) > 0:
            return response.data[0]

        # Check for 'pending' jobs
        response = supabase.table("drone_jobs") \
            .select("*") \
            .eq("photogrammetry_status", "pending") \
            .limit(1) \
            .execute()

        if response.data and len(response.data) > 0:
            return response.data[0]
            
        return None

    except Exception as e:
        print(f"Error checking pending jobs: {e}")
        return None

def update_job_status(supabase, job_id: str, status: str, task_id: str = None):
    """
    Updates the job status and optionally the NodeODM task ID.
    """
    try:
        data = {"photogrammetry_status": status}
        if task_id:
            data["nodeodm_task_id"] = task_id
            
        supabase.table("drone_jobs").update(data).eq("id", job_id).execute()
        print(f"Updated job {job_id} to {status}")
    except Exception as e:
        print(f"Error updating job {job_id}: {e}")
