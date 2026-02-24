import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL");

interface RequestBody {
  processing_job_id: string;
  step_name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as RequestBody;
    const { processing_job_id, step_name } = body;

    if (!processing_job_id || !step_name) {
      return new Response(
        JSON.stringify({ error: "processing_job_id and step_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch the processing job
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .select("*")
      .eq("id", processing_job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Processing job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (job.status !== "awaiting_manual_edit") {
      return new Response(
        JSON.stringify({
          error: `Job is in '${job.status}' status, expected 'awaiting_manual_edit'`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update the specific step in the steps JSONB array
    const steps = Array.isArray(job.steps) ? job.steps : [];
    const stepIndex = steps.findIndex(
      (s: Record<string, unknown>) => s.name === step_name,
    );

    if (stepIndex === -1) {
      return new Response(
        JSON.stringify({ error: `Step '${step_name}' not found in job` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updatedSteps = [...steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      status: "complete",
      completed_at: new Date().toISOString(),
    };

    // Determine next step (first step after current that is 'pending')
    const nextStep = updatedSteps
      .slice(stepIndex + 1)
      .find((s: Record<string, unknown>) => s.status === "pending");

    const newStatus = nextStep ? "running" : "complete";
    const newCurrentStep = nextStep
      ? (nextStep as Record<string, unknown>).name as string
      : null;

    // Update the job record
    const { error: updateError } = await supabase
      .from("processing_jobs")
      .update({
        steps: updatedSteps,
        status: newStatus,
        current_step: newCurrentStep,
        completed_at: newStatus === "complete" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", processing_job_id);

    if (updateError) {
      console.error("Failed to update processing job:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update job status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget to n8n to continue pipeline (P4 — no timeout waiting)
    if (N8N_WEBHOOK_URL && nextStep) {
      const webhookPayload = {
        processing_job_id,
        mission_id: job.mission_id,
        resume_from_step: newCurrentStep,
        resumed_by: user.id,
        resumed_at: new Date().toISOString(),
      };

      // Intentional fire-and-forget: do not await
      fetch(`${N8N_WEBHOOK_URL}/pipeline-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch((err: Error) => {
        console.error("Failed to call n8n pipeline-resume webhook:", err.message);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_status: newStatus,
        next_step: newCurrentStep,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("pipeline-manual-edit-complete error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
