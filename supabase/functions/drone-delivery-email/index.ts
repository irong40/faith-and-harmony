import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

import {
  corsHeaders,
  handleDeliveryRequest,
  makeAuthorizer,
  type ResendLike,
  type SupabaseLike,
} from "./delivery.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Extra server-to-server keys allowed to trigger a delivery, comma-separated.
const DELIVERY_TRUSTED_KEYS = (Deno.env.get("DELIVERY_TRUSTED_KEYS") ?? "")
  .split(",").map((k) => k.trim()).filter(Boolean);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabase = admin as unknown as SupabaseLike;
  const resend = new Resend(RESEND_API_KEY) as unknown as ResendLike;
  const authorize = makeAuthorizer({
    trustedKeys: [SUPABASE_SERVICE_ROLE_KEY, ...DELIVERY_TRUSTED_KEYS],
    getUser: (jwt) => admin.auth.getUser(jwt),
    isAdmin: (userId) => admin.rpc("has_role", { _user_id: userId, _role: "admin" }),
  });

  return await handleDeliveryRequest(req, { supabase, resend, authorize });
});
