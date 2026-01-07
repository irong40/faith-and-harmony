import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { view_token } = await req.json();

    if (!view_token) {
      return new Response(
        JSON.stringify({ error: "Missing view_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token and update viewed_at if not already set
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, viewed_at")
      .eq("view_token", view_token)
      .single();

    if (fetchError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only update if not already viewed
    if (!invoice.viewed_at) {
      await supabase
        .from("invoices")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", invoice.id);
      
      console.log("Invoice marked as viewed:", invoice.id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
