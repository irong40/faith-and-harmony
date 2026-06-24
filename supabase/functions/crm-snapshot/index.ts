// CRM snapshot edge function.
//
// Returns the whole business state as JSON (via the crm_state_snapshot() RPC,
// which holds service-role read access). Guarded by a shared secret so the
// service-role key never leaves Supabase — same pattern as governance-upload.
//
// Auth: x-snapshot-secret header must equal env CRM_SNAPSHOT_SECRET.
// Method: GET or POST.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-snapshot-secret",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("CRM_SNAPSHOT_SECRET");
  if (!expected) return json({ error: "CRM_SNAPSHOT_SECRET not configured" }, 500);
  if (req.headers.get("x-snapshot-secret") !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("crm_state_snapshot");
    if (error) return json({ error: error.message }, 500);
    return json(data);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
