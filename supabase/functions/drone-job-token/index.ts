import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ValidateRequest {
  token: string;
}

interface UploadCompleteRequest {
  token: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  mime_type: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const url = new URL(req.url);

  try {
    // Parse body once at the start to extract action and other params
    const body = await req.json().catch(() => ({}));
    const action = body.action || "validate";

    if (action === "validate") {
      // Validate token and return job info
      const { token } = body as ValidateRequest;

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: job, error } = await supabase
        .from("drone_jobs")
        .select(`
          id,
          job_number,
          property_address,
          property_city,
          property_state,
          property_type,
          upload_token_expires_at,
          drone_packages (
            name,
            shot_manifest,
            features
          )
        `)
        .eq("upload_token", token)
        .single();

      if (error || !job) {
        console.log("Token validation failed:", error);
        return new Response(
          JSON.stringify({ error: "Invalid or expired upload token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token is expired
      if (job.upload_token_expires_at && new Date(job.upload_token_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Upload token has expired" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current asset count
      const { count } = await supabase
        .from("drone_assets")
        .select("*", { count: "exact", head: true })
        .eq("job_id", job.id);

      return new Response(
        JSON.stringify({
          valid: true,
          job: {
            id: job.id,
            job_number: job.job_number,
            property_address: job.property_address,
            property_city: job.property_city,
            property_state: job.property_state,
            property_type: job.property_type,
            package: job.drone_packages,
            uploaded_count: count || 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "upload-complete") {
      // Record a completed upload
      const { token, file_name, file_path, file_size, file_type, mime_type } = body as UploadCompleteRequest;

      if (!token || !file_name || !file_path) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token
      const { data: job, error: jobError } = await supabase
        .from("drone_jobs")
        .select("id, status, upload_token_expires_at")
        .eq("upload_token", token)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Invalid upload token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (job.upload_token_expires_at && new Date(job.upload_token_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Upload token has expired" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get next sort order
      const { data: lastAsset } = await supabase
        .from("drone_assets")
        .select("sort_order")
        .eq("job_id", job.id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const sortOrder = (lastAsset?.sort_order || 0) + 1;

      // Create the asset record
      const { data: asset, error: assetError } = await supabase
        .from("drone_assets")
        .insert({
          job_id: job.id,
          file_name,
          file_path,
          file_size,
          file_type,
          mime_type,
          sort_order: sortOrder,
          qa_status: "pending"
        })
        .select()
        .single();

      if (assetError) {
        console.error("Failed to create asset:", assetError);
        return new Response(
          JSON.stringify({ error: "Failed to record upload" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update job status to uploaded if it was in captured status
      if (job.status === "captured") {
        await supabase
          .from("drone_jobs")
          .update({ status: "uploaded" })
          .eq("id", job.id);
      }

      console.log("Asset recorded:", asset.id, file_name);

      // Trigger EXIF extraction asynchronously (non-blocking) for images
      if (file_type === "photo" || file_type === "raw") {
        EdgeRuntime.waitUntil(
          supabase.functions.invoke("drone-extract-exif", {
            body: { asset_id: asset.id },
          }).catch((err: Error) => console.error("EXIF extraction trigger failed:", err))
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          asset_id: asset.id,
          file_name: asset.file_name
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "generate") {
      // Generate a new upload token for a job. ADMIN ONLY — and this branch
      // has to prove that entirely by itself.
      //
      // config.toml sets verify_jwt = false for this function, because the
      // public upload page calls `validate` and `upload-complete` with no
      // session at all. So the platform performs NO auth on any request that
      // reaches here, and `supabase` above is a SERVICE-ROLE client that
      // bypasses RLS. Testing `if (!authHeader)` proved only that the caller
      // sent some bytes: `Authorization: Bearer anything` passed, and the
      // service-role client then minted a 72-hour upload token for any job id.
      // Even verify_jwt = true would not have closed it — Supabase accepts the
      // anon key, which ships in the frontend bundle, as a valid JWT.
      //
      // getUser(jwt) hands the token to GoTrue, which verifies its signature
      // and expiry server-side and 401s otherwise — a forged or expired token
      // cannot pass. Deliberately NOT using a SUPABASE_ANON_KEY client here:
      // the legacy anon key was disabled 2026-07-15 and the migration to
      // sb_publishable_ keys is still open, so depending on it would risk
      // 401ing every admin the moment that key rotates. The apikey only gates
      // the endpoint; the Bearer token is what gets verified.
      const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
      if (!jwt || jwt === SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
      const caller = userData?.user;
      if (authError || !caller) {
        console.warn("generate: rejected invalid or expired JWT");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: caller.id,
        _role: "admin",
      });
      if (roleError || isAdmin !== true) {
        console.warn(`generate: rejected non-admin caller ${caller.id}`);
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { job_id, expires_in_hours = 72 } = body;

      if (!job_id) {
        return new Response(
          JSON.stringify({ error: "job_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a secure random token
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

      const { error: updateError } = await supabase
        .from("drone_jobs")
        .update({
          upload_token: token,
          upload_token_expires_at: expiresAt.toISOString()
        })
        .eq("id", job_id);

      if (updateError) {
        console.error("Failed to generate token:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to generate upload token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          token,
          expires_at: expiresAt.toISOString(),
          upload_url: `${url.origin.replace('/functions/v1/drone-job-token', '')}/drone-upload/${token}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Token handler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
