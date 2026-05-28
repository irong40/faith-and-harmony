/**
 * vapi-gate — Inbound call spam gatekeeper for Paula (SAI line)
 *
 * Vapi calls this serverUrl before starting any assistant on inbound calls.
 * We check the caller's number against spam_blocklist. Blocked callers get
 * an error response (call ends, 0 Vapi minutes consumed). Clean callers get
 * routed to Paula's assistant ID.
 *
 * Vapi event shape (assistant-request):
 *   { message: { type: "assistant-request", call: { customer: { number: "+1..." } } } }
 *
 * Response shapes:
 *   { assistantId: "..." }           — route to Paula
 *   { error: "..." }                 — Vapi ends the call
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAULA_ASSISTANT_ID = "703d9226-e5ef-439f-a60e-c05b995ad6da";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const msgType = body?.message?.type;

    // Only act on assistant-request; pass through everything else
    if (msgType !== "assistant-request") {
      return new Response(
        JSON.stringify({ assistantId: PAULA_ASSISTANT_ID }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const callerNumber: string | undefined = body?.message?.call?.customer?.number;

    if (!callerNumber) {
      // No caller number — let Paula handle it (could be internal test)
      return new Response(
        JSON.stringify({ assistantId: PAULA_ASSISTANT_ID }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check blocklist
    const { data: blocked } = await supabase
      .from("spam_blocklist")
      .select("id, reason, call_count")
      .eq("phone", callerNumber)
      .maybeSingle();

    if (blocked) {
      // Increment call count silently (fire-and-forget)
      supabase
        .from("spam_blocklist")
        .update({ call_count: blocked.call_count + 1 })
        .eq("phone", callerNumber)
        .then(() => {});

      console.log(`[vapi-gate] BLOCKED ${callerNumber} — ${blocked.reason ?? "no reason"}`);

      return new Response(
        JSON.stringify({ error: "This number is not authorized to reach this assistant." }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Clean caller — route to Paula
    console.log(`[vapi-gate] ALLOWED ${callerNumber}`);
    return new Response(
      JSON.stringify({ assistantId: PAULA_ASSISTANT_ID }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    // On any error, fail open — don't block legitimate callers
    console.error("[vapi-gate] error:", err);
    return new Response(
      JSON.stringify({ assistantId: PAULA_ASSISTANT_ID }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
