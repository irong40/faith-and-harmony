import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DroneJob {
  id: string;
  job_number: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  pilot_notes: string | null;
  google_event_id: string | null;
  customers?: { name: string; email: string; phone: string | null } | null;
  drone_packages?: { name: string; code: string } | null;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: token, error } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !token) {
    console.log(`[google-calendar-sync] No token found for user ${userId}`);
    return null;
  }

  // Check if token is expired
  if (new Date(token.expires_at) < new Date()) {
    console.log(`[google-calendar-sync] Token expired, refreshing...`);

    // Refresh the token
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
      console.error(`[google-calendar-sync] Token refresh failed:`, tokenData);
      return null;
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    await supabase
      .from("google_calendar_tokens")
      .update({
        access_token: tokenData.access_token,
        expires_at: expiresAt,
      })
      .eq("user_id", userId);

    return tokenData.access_token;
  }

  return token.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { action, job_id, user_id } = body;

    console.log(`[google-calendar-sync] Action: ${action}, Job ID: ${job_id}`);

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidAccessToken(supabase, user_id);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Not connected to Google Calendar" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync" || action === "create") {
      if (!job_id) {
        return new Response(
          JSON.stringify({ error: "Missing job_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch job details
      const { data: job, error: jobError } = await supabase
        .from("drone_jobs")
        .select("*, customers(name, email, phone), drone_packages(name, code)")
        .eq("id", job_id)
        .single() as { data: DroneJob | null, error: any };

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!job.scheduled_date) {
        return new Response(
          JSON.stringify({ error: "Job has no scheduled date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build event data
      const startTime = job.scheduled_time || "09:00";
      const startDateTime = `${job.scheduled_date}T${startTime}:00`;
      
      // Assume 2 hour duration for drone shoots
      const startDate = new Date(`${job.scheduled_date}T${startTime}`);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      const endDateTime = endDate.toISOString().replace("Z", "").slice(0, 19);

      const location = [
        job.property_address,
        job.property_city,
        job.property_state,
      ].filter(Boolean).join(", ");

      const description = [
        `Job #: ${job.job_number}`,
        `Property Type: ${job.property_type}`,
        job.customers ? `Customer: ${job.customers.name}` : null,
        job.customers?.email ? `Email: ${job.customers.email}` : null,
        job.customers?.phone ? `Phone: ${job.customers.phone}` : null,
        job.drone_packages ? `Package: ${job.drone_packages.name}` : null,
        job.pilot_notes ? `\nPilot Notes:\n${job.pilot_notes}` : null,
      ].filter(Boolean).join("\n");

      const eventData = {
        summary: `🚁 Drone: ${job.property_address}`,
        description,
        location,
        start: {
          dateTime: startDateTime,
          timeZone: "America/New_York",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "America/New_York",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 60 },
            { method: "popup", minutes: 1440 }, // 1 day before
          ],
        },
      };

      let response: Response;
      let eventId = job.google_event_id;

      if (eventId) {
        // Update existing event
        console.log(`[google-calendar-sync] Updating event ${eventId}`);
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventData),
          }
        );
      } else {
        // Create new event
        console.log(`[google-calendar-sync] Creating new event`);
        response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventData),
          }
        );
      }

      const result = await response.json();

      if (!response.ok) {
        console.error(`[google-calendar-sync] Calendar API error:`, result);
        return new Response(
          JSON.stringify({ error: result.error?.message || "Calendar API error" }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save event ID to job
      if (result.id && result.id !== eventId) {
        await supabase
          .from("drone_jobs")
          .update({ google_event_id: result.id })
          .eq("id", job_id);
      }

      console.log(`[google-calendar-sync] Event synced: ${result.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          event_id: result.id,
          event_link: result.htmlLink,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!job_id) {
        return new Response(
          JSON.stringify({ error: "Missing job_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from("drone_jobs")
        .select("google_event_id")
        .eq("id", job_id)
        .single();

      if (jobError || !job?.google_event_id) {
        return new Response(
          JSON.stringify({ error: "No calendar event to delete" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${job.google_event_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const result = await response.json();
        console.error(`[google-calendar-sync] Delete error:`, result);
        return new Response(
          JSON.stringify({ error: result.error?.message || "Delete failed" }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear event ID from job
      await supabase
        .from("drone_jobs")
        .update({ google_event_id: null })
        .eq("id", job_id);

      console.log(`[google-calendar-sync] Event deleted for job ${job_id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[google-calendar-sync] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
