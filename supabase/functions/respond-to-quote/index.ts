import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type QuoteAction = "accept" | "decline";

interface RespondRequest {
  token: string;
  action: QuoteAction;
  decline_reason?: string;
}

// Statuses that prevent the customer from taking further action
const TERMINAL_STATUSES = ["accepted", "declined", "expired", "draft"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body: RespondRequest = await req.json();
    const { token, action, decline_reason } = body;

    // Input validation
    if (!token || token.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== "accept" && action !== "decline") {
      return new Response(
        JSON.stringify({ error: "action must be 'accept' or 'decline'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the quote by token — include request_id for job creation
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, status, request_id")
      .eq("acceptance_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("DB error fetching quote:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve quote" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!quote) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guard: only 'sent' and 'revised' quotes are actionable
    if (TERMINAL_STATUSES.includes(quote.status)) {
      return new Response(
        JSON.stringify({
          error: `This quote cannot be modified. Current status: ${quote.status}.`,
          status: quote.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update payload
    const now = new Date().toISOString();
    const updatePayload =
      action === "accept"
        ? { status: "accepted" as const, accepted_at: now }
        : {
            status: "declined" as const,
            declined_at: now,
            decline_reason: decline_reason?.trim() || null,
          };

    const { error: updateError } = await supabase
      .from("quotes")
      .update(updatePayload)
      .eq("id", quote.id);

    if (updateError) {
      console.error("DB error updating quote:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update quote" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // On acceptance: create drone_job + trigger deposit invoice (fire-and-forget)
    if (action === "accept") {
      // Create drone_job from quote via DB function
      const { data: jobResult, error: jobError } = await supabase
        .rpc("create_drone_job_from_quote", { p_quote_id: quote.id });

      if (jobError) {
        console.error("Failed to create drone_job from quote:", jobError);
      } else {
        console.log(`Drone job created: ${jobResult}`);
      }

      // Trigger deposit invoice creation
      const depositUrl = `${SUPABASE_URL}/functions/v1/create-deposit-invoice`;
      fetch(depositUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quote_id: quote.id }),
      }).catch((err) => {
        console.error("Failed to trigger deposit invoice creation:", err);
      });
    }

    console.log(`Quote ${quote.id} ${action}ed via token`);
    return new Response(
      JSON.stringify({ success: true, action, new_status: updatePayload.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
