/**
 * n8n Relay Edge Function
 *
 * Architecture:
 *   Browser/Trestle -> Supabase Edge Function (this) -> n8n via Cloudflare Tunnel
 *
 * Why this exists:
 *   n8n is self-hosted on a Windows machine. Its Cloudflare Tunnel URL is a secret
 *   that must not be exposed to the client browser. This edge function acts as a
 *   server-side relay, keeping the tunnel URL server-side only.
 *
 * n8n Setup (one-time):
 *   1. Install cloudflared on the processing rig
 *   2. Run: cloudflared tunnel create sentinel-n8n
 *   3. Configure tunnel to expose n8n port (5678) at a stable URL
 *   4. Set Supabase secret: N8N_WEBHOOK_URL=https://your-tunnel.trycloudflare.com
 *   5. On n8n webhook nodes, enable "Respond Immediately" to avoid edge function timeouts
 *
 * Usage:
 *   POST /functions/v1/n8n-relay
 *   Body: { path: string, payload: object }
 *   - path: the n8n webhook path (e.g., "pipeline-start", "pipeline-resume")
 *   - payload: the data to forward to n8n
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL");

interface RelayRequest {
  path: string;
  payload: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication — only admins can relay to n8n
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

    if (!N8N_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({
          error: "n8n not configured. Set the N8N_WEBHOOK_URL secret in Supabase.",
          setup: "supabase secrets set N8N_WEBHOOK_URL=https://your-tunnel.trycloudflare.com",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { path, payload } = await req.json() as RelayRequest;

    if (!path) {
      return new Response(
        JSON.stringify({ error: "path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const targetUrl = `${N8N_WEBHOOK_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, relayed_by: user.id }),
      signal: AbortSignal.timeout(15_000), // 15 second timeout
    });

    const responseText = await response.text();
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { raw: responseText };
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        body: responseBody,
      }),
      {
        status: response.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = message.includes("timed out") || message.includes("AbortError");

    console.error("n8n-relay error:", message);
    return new Response(
      JSON.stringify({
        error: isTimeout
          ? "n8n did not respond within 15 seconds. Verify the Cloudflare Tunnel is running."
          : message,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
