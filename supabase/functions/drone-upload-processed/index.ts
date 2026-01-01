import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROCESSING_API_KEY = Deno.env.get("PROCESSING_API_KEY");

interface ProcessedFile {
  original_asset_id?: string;
  file_name: string;
  file_data: string; // Base64 encoded
  file_type: "labeled" | "web" | "print" | "archive" | "raw";
  mime_type: string;
}

interface UploadRequest {
  job_id: string;
  files: ProcessedFile[];
  mark_complete?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key if configured
    if (PROCESSING_API_KEY) {
      const apiKey = req.headers.get("x-api-key");
      if (apiKey !== PROCESSING_API_KEY) {
        console.error("Invalid API key provided");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body: UploadRequest = await req.json();
    const { job_id, files, mark_complete } = body;

    if (!job_id || !files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "job_id and files array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing upload for job ${job_id}: ${files.length} files`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify job exists
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select("id, job_number, status")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadResults: Array<{
      file_name: string;
      storage_path: string;
      asset_id?: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process each file
    for (const file of files) {
      try {
        // Decode base64 file data
        const fileBytes = decode(file.file_data);
        
        // Construct storage path: processed/{job_id}/{file_type}/{file_name}
        const storagePath = `processed/${job_id}/${file.file_type}/${file.file_name}`;

        console.log(`Uploading ${file.file_name} to ${storagePath}`);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("drone-jobs")
          .upload(storagePath, fileBytes, {
            contentType: file.mime_type,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload failed for ${file.file_name}:`, uploadError);
          uploadResults.push({
            file_name: file.file_name,
            storage_path: storagePath,
            success: false,
            error: uploadError.message,
          });
          continue;
        }

        // If linked to an original asset, update the asset record
        if (file.original_asset_id) {
          const { error: updateError } = await supabase
            .from("drone_assets")
            .update({
              processed_path: storagePath,
              processing_status: "processed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", file.original_asset_id);

          if (updateError) {
            console.warn(`Failed to update asset ${file.original_asset_id}:`, updateError);
          }
        }

        uploadResults.push({
          file_name: file.file_name,
          storage_path: storagePath,
          asset_id: file.original_asset_id,
          success: true,
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.file_name}:`, fileError);
        uploadResults.push({
          file_name: file.file_name,
          storage_path: "",
          success: false,
          error: fileError instanceof Error ? fileError.message : "Unknown error",
        });
      }
    }

    // Count successes
    const successCount = uploadResults.filter(r => r.success).length;
    const failCount = uploadResults.filter(r => !r.success).length;

    console.log(`Upload complete: ${successCount} succeeded, ${failCount} failed`);

    // Update job status if requested
    if (mark_complete && successCount > 0) {
      const { error: statusError } = await supabase
        .from("drone_jobs")
        .update({
          status: "delivered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);

      if (statusError) {
        console.error("Failed to update job status:", statusError);
      } else {
        console.log(`Job ${job.job_number} marked as delivered`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        job_number: job.job_number,
        uploaded: successCount,
        failed: failCount,
        results: uploadResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Upload processed error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
