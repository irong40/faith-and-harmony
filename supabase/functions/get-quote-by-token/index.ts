import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || token.length < 10) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: quote, error } = await supabase
      .from("quotes")
      .select(`
        id,
        status,
        line_items,
        total,
        deposit_amount,
        notes,
        expires_at,
        quote_requests (
          name,
          job_type
        )
      `)
      .eq("acceptance_token", token)
      .maybeSingle();

    if (error) {
      console.error("DB error fetching quote:", error);
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

    // Normalize nested relation (Supabase returns object or array for single FK)
    const request = Array.isArray(quote.quote_requests)
      ? quote.quote_requests[0]
      : quote.quote_requests;

    // Safe payload — no token, no email echoed back
    const payload = {
      id: quote.id,
      status: quote.status,
      line_items: Array.isArray(quote.line_items) ? quote.line_items : [],
      total: Number(quote.total),
      deposit_amount: Number(quote.deposit_amount),
      notes: quote.notes ?? null,
      expires_at: quote.expires_at ?? null,
      customer_name: request?.name ?? null,
      job_type: request?.job_type ?? null,
    };

    return new Response(
      JSON.stringify({ quote: payload }),
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
