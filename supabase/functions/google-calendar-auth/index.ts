import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { action, code, redirect_uri, user_id } = body;

    console.log(`[google-calendar-auth] Action: ${action}`);

    if (action === "get-auth-url") {
      // Generate OAuth URL for user to authorize
      const scopes = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ].join(" ");

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirect_uri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      console.log(`[google-calendar-auth] Generated auth URL`);

      return new Response(
        JSON.stringify({ auth_url: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "exchange-code") {
      // Exchange authorization code for tokens
      if (!code || !redirect_uri || !user_id) {
        return new Response(
          JSON.stringify({ error: "Missing code, redirect_uri, or user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[google-calendar-auth] Exchanging code for tokens`);

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error(`[google-calendar-auth] Token exchange error:`, tokenData);
        return new Response(
          JSON.stringify({ error: tokenData.error_description || tokenData.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Upsert token into database
      const { error: dbError } = await supabase
        .from("google_calendar_tokens")
        .upsert({
          user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
        }, { onConflict: "user_id" });

      if (dbError) {
        console.error(`[google-calendar-auth] DB error:`, dbError);
        return new Response(
          JSON.stringify({ error: "Failed to save tokens" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[google-calendar-auth] Tokens saved for user ${user_id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-connection") {
      // Check if user has a valid token
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "Missing user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: token, error } = await supabase
        .from("google_calendar_tokens")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      if (error) {
        console.error(`[google-calendar-auth] Check connection error:`, error);
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const connected = !!token;
      const expired = token ? new Date(token.expires_at) < new Date() : false;

      console.log(`[google-calendar-auth] Connection check: connected=${connected}, expired=${expired}`);

      return new Response(
        JSON.stringify({ connected, expired, calendar_id: token?.calendar_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "Missing user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", user_id);

      if (error) {
        console.error(`[google-calendar-auth] Disconnect error:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to disconnect" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[google-calendar-auth] Disconnected user ${user_id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refresh-token") {
      // Refresh an expired access token
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "Missing user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: token, error: fetchError } = await supabase
        .from("google_calendar_tokens")
        .select("refresh_token")
        .eq("user_id", user_id)
        .single();

      if (fetchError || !token?.refresh_token) {
        return new Response(
          JSON.stringify({ error: "No refresh token available" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: token.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error(`[google-calendar-auth] Refresh error:`, tokenData);
        return new Response(
          JSON.stringify({ error: tokenData.error_description || tokenData.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await supabase
        .from("google_calendar_tokens")
        .update({
          access_token: tokenData.access_token,
          expires_at: expiresAt,
        })
        .eq("user_id", user_id);

      console.log(`[google-calendar-auth] Token refreshed for user ${user_id}`);

      return new Response(
        JSON.stringify({ success: true, access_token: tokenData.access_token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[google-calendar-auth] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
