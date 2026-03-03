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
  mission_id: string;
  processing_template_id: string;
}

/**
 * Generate idempotency key: SHA-256 hash of mission_id + template_id + YYYY-MM-DD.
 * Prevents double-triggering on the same day (P4 safeguard).
 */
async function generateIdempotencyKey(
  missionId: string,
  templateId: string,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const raw = `${missionId}:${templateId}:${today}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface StepDefinition {
  name: string;
  label?: string;
  script?: string | null;
  manual?: boolean;
}

/**
 * Build the initial steps array from a processing_template.
 * Prefers step_definitions (rich objects) over default_steps (string array).
 */
function buildStepsFromTemplate(
  stepDefinitions: StepDefinition[] | null,
  defaultSteps: string[],
): Array<Record<string, unknown>> {
  // Prefer step_definitions when available
  if (Array.isArray(stepDefinitions) && stepDefinitions.length > 0) {
    return stepDefinitions.map((def) => ({
      name: def.name,
      label: def.label ?? def.name,
      script: def.script ?? null,
      manual: def.manual ?? false,
      status: "pending",
      started_at: null,
      completed_at: null,
      error: null,
      output: null,
    }));
  }

  // Fallback to default_steps (string array) for backward compat
  return defaultSteps.map((stepName) => ({
    name: stepName,
    script: null,
    status: "pending",
    started_at: null,
    completed_at: null,
    error: null,
    output: null,
  }));
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
    const { mission_id, processing_template_id } = body;

    if (!mission_id || !processing_template_id) {
      return new Response(
        JSON.stringify({ error: "mission_id and processing_template_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate the mission exists
    const { data: mission, error: missionError } = await supabase
      .from("drone_jobs")
      .select("id, job_number, status")
      .eq("id", mission_id)
      .single();

    if (missionError || !mission) {
      return new Response(
        JSON.stringify({ error: "Mission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate idempotency key (P4 double-trigger prevention)
    const idempotencyKey = await generateIdempotencyKey(mission_id, processing_template_id);

    // Check for existing active job with same idempotency key
    const { data: existingJob } = await supabase
      .from("processing_jobs")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .in("status", ["pending", "running"])
      .maybeSingle();

    if (existingJob) {
      return new Response(
        JSON.stringify({
          error: "A pipeline job for this mission is already active today",
          processing_job_id: existingJob.id,
          existing_status: existingJob.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch the processing template with its steps
    const { data: template, error: templateError } = await supabase
      .from("processing_templates")
      .select("id, display_name, path_code, default_steps, step_definitions")
      .eq("id", processing_template_id)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Processing template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build steps array from template — prefer step_definitions, fallback to default_steps
    const stepDefinitions = Array.isArray(template.step_definitions)
      ? template.step_definitions as StepDefinition[]
      : null;
    const defaultSteps = Array.isArray(template.default_steps)
      ? template.default_steps as string[]
      : [];

    const steps = buildStepsFromTemplate(stepDefinitions, defaultSteps);
    const firstStep = steps[0] ?? null;

    // Create the processing_jobs record
    const { data: newJob, error: insertError } = await supabase
      .from("processing_jobs")
      .insert({
        mission_id,
        processing_template_id,
        status: "pending",
        current_step: firstStep ? firstStep.name as string : null,
        steps,
        triggered_by: user.id,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (insertError || !newJob) {
      console.error("Failed to create processing job:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create processing job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget to n8n webhook (P4 — respond immediately pattern)
    // n8n must have "Respond Immediately" enabled on its webhook node
    if (N8N_WEBHOOK_URL) {
      const webhookPayload = {
        processing_job_id: newJob.id,
        mission_id,
        job_number: mission.job_number,
        processing_template_id,
        path_code: template.path_code,
        steps,
        triggered_by: user.id,
        triggered_at: new Date().toISOString(),
      };

      // Intentional fire-and-forget — do not await
      fetch(`${N8N_WEBHOOK_URL}/pipeline-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch((err: Error) => {
        console.error("Failed to call n8n pipeline-start webhook:", err.message);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processing_job_id: newJob.id,
        step_count: steps.length,
        first_step: firstStep?.name ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("pipeline-trigger error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
