import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is an authenticated pilot
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse station from query string
    const url = new URL(req.url);
    const station = url.searchParams.get("station")?.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!station || station.length < 3 || station.length > 5) {
      return new Response(
        JSON.stringify({ error: "Invalid station ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch METAR from aviationweather.gov (server-side, no CORS issue)
    const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${station}&format=json`;
    const metarResponse = await fetch(metarUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!metarResponse.ok) {
      throw new Error(`aviationweather.gov returned ${metarResponse.status}`);
    }

    const data = await metarResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = (err as Error).message;
    console.error("metar-proxy error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
