import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Sentinel Aerial Inspections Branding
const BRAND = {
  navy: "#0f1e36",
  sky: "#3b82f6",
  accent: "#f59e0b",
  light: "#f0f4f8",
  companyName: "Sentinel Aerial Inspections",
  tagline: "Veteran-Owned Aerial Services — Hampton Roads, VA",
  email: "deliveries@sentinelaerialinspections.com",
  website: "sentinelaerialinspections.com",
  location: "Hampton Roads, Virginia",
};

interface DeliveryEmailRequest {
  job_id: string;
  deliverable_ids?: string[];
  custom_message?: string;
  download_url?: string; // Drive folder URL from pipeline / admin
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, deliverable_ids, custom_message, download_url } =
      await req.json() as DeliveryEmailRequest;

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(RESEND_API_KEY);

    // Fetch job with client and legacy customer fallback
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select(`
        *,
        clients(id, name, email, company, phone),
        customers(id, name, email, phone),
        drone_packages(name),
        processing_templates(path_code, display_name)
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer clients table (Phase 2+), fall back to legacy customers
    const recipient = job.clients ?? job.customers;
    const recipientEmail = recipient?.email;

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "No client email found for this job" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count assets for summary
    const { data: assets } = await supabase
      .from("drone_assets")
      .select("id, file_type, file_size")
      .eq("job_id", job_id)
      .limit(500);

    const photoCount = assets?.filter((a) => a.file_type?.startsWith("image/")).length ?? 0;
    const videoCount = assets?.filter((a) => a.file_type?.startsWith("video/")).length ?? 0;
    const totalSizeBytes = assets?.reduce((sum, a) => sum + (a.file_size ?? 0), 0) ?? 0;
    const totalSizeMB = Math.round(totalSizeBytes / (1024 * 1024));

    // Fetch selected deliverables
    let deliverables: { id: string; name: string; description: string | null; download_url: string | null }[] = [];
    if (deliverable_ids && deliverable_ids.length > 0) {
      const { data } = await supabase
        .from("drone_deliverables")
        .select("id, name, description, download_url")
        .eq("job_id", job_id)
        .in("id", deliverable_ids);
      deliverables = data ?? [];
    } else {
      const { data } = await supabase
        .from("drone_deliverables")
        .select("id, name, description, download_url")
        .eq("job_id", job_id);
      deliverables = data ?? [];
    }

    // Primary delivery URL: explicit param > delivery_drive_url > download_url > first deliverable
    const primaryUrl =
      download_url ||
      job.delivery_drive_url ||
      job.download_url ||
      deliverables[0]?.download_url;

    if (!primaryUrl && deliverables.length === 0) {
      return new Response(
        JSON.stringify({ error: "No delivery URL or deliverables found for this job" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteLabel =
      job.site_address ||
      `${job.property_address}${job.property_city ? `, ${job.property_city}` : ""}${job.property_state ? `, ${job.property_state}` : ""}`;

    const jobTypeLabel =
      job.processing_templates?.display_name ||
      job.drone_packages?.name ||
      "Aerial Inspection";

    const clientFirstName = (recipient?.name ?? "Client").split(" ")[0];

    const emailSubject = `Your Deliverables from Sentinel Aerial Inspections — ${jobTypeLabel} at ${siteLabel}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #eef2f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.navy} 0%, #1a3152 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
          ${BRAND.companyName}
        </h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 12px; letter-spacing: 0.5px;">
          ${BRAND.tagline}
        </p>
      </td>
    </tr>

    <!-- Title Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.sky} 0%, #2563eb 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">Your Deliverables Are Ready</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px;">${siteLabel}</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="color: #1a1a1a; line-height: 1.6; margin: 0 0 16px 0; font-size: 15px;">
          Hi ${clientFirstName},
        </p>
        <p style="color: #333; line-height: 1.6; margin: 0 0 24px 0; font-size: 15px;">
          Your <strong>${jobTypeLabel}</strong> deliverables for <strong>${siteLabel}</strong> are ready for review.
          You can access everything through the Google Drive link below.
        </p>

        ${photoCount > 0 || videoCount > 0 ? `
        <!-- Stats Row -->
        <table style="width: 100%; margin: 0 0 28px 0; border-collapse: collapse;">
          <tr>
            ${photoCount > 0 ? `
            <td style="text-align: center; padding: 16px; background-color: ${BRAND.light}; border-radius: 8px 0 0 8px; border: 1px solid #dde3ea;">
              <div style="font-size: 28px; font-weight: 700; color: ${BRAND.navy};">${photoCount}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Photos</div>
            </td>
            ` : ""}
            ${videoCount > 0 ? `
            <td style="text-align: center; padding: 16px; background-color: ${BRAND.light}; border: 1px solid #dde3ea; border-left: none;">
              <div style="font-size: 28px; font-weight: 700; color: ${BRAND.navy};">${videoCount}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Videos</div>
            </td>
            ` : ""}
            ${totalSizeMB > 0 ? `
            <td style="text-align: center; padding: 16px; background-color: ${BRAND.light}; border-radius: 0 8px 8px 0; border: 1px solid #dde3ea; border-left: none;">
              <div style="font-size: 28px; font-weight: 700; color: ${BRAND.navy};">${totalSizeMB}MB</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Total</div>
            </td>
            ` : ""}
          </tr>
        </table>
        ` : ""}

        ${custom_message ? `
        <!-- Personal Note -->
        <div style="background-color: #f0f6ff; border-left: 4px solid ${BRAND.sky}; padding: 16px; margin: 0 0 28px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #333; margin: 0; line-height: 1.6; font-size: 14px;">${custom_message}</p>
        </div>
        ` : ""}

        ${primaryUrl ? `
        <!-- Primary CTA -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${primaryUrl}"
             style="background: linear-gradient(135deg, ${BRAND.sky} 0%, #2563eb 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">
            View Your Deliverables
          </a>
          <p style="color: #888; font-size: 12px; margin: 12px 0 0 0;">
            Opens in Google Drive
          </p>
        </div>
        ` : ""}

        ${deliverables.length > 1 ? `
        <!-- Additional Deliverables -->
        <h3 style="color: ${BRAND.navy}; margin: 28px 0 12px 0; font-size: 15px; font-weight: 600;">Additional Downloads</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          ${deliverables.slice(1).map((d) => `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: ${BRAND.navy}; font-size: 14px;">${d.name}</strong>
              ${d.description ? `<br><span style="color: #666; font-size: 13px;">${d.description}</span>` : ""}
            </td>
            ${d.download_url ? `
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap;">
              <a href="${d.download_url}" style="color: ${BRAND.sky}; font-weight: 600; text-decoration: none; font-size: 14px;">
                Download
              </a>
            </td>
            ` : "<td></td>"}
          </tr>
          `).join("")}
        </table>
        ` : ""}

        <!-- Support -->
        <div style="text-align: center; margin: 32px 0 0 0; padding: 24px; background-color: #f8f9fb; border-radius: 8px;">
          <p style="color: #555; line-height: 1.6; margin: 0; font-size: 14px;">
            Questions about your deliverables? Reply to this email and we'll be happy to help.
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: ${BRAND.navy}; padding: 24px; text-align: center;">
        <p style="color: white; font-size: 14px; font-weight: 600; margin: 0;">${BRAND.companyName}</p>
        <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 6px 0 0 0;">
          ${BRAND.location}
        </p>
        <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 8px 0 0 0;">
          <a href="https://${BRAND.website}" style="color: rgba(255,255,255,0.7); text-decoration: none;">${BRAND.website}</a>
          &nbsp;|&nbsp;
          <a href="mailto:${BRAND.email}" style="color: rgba(255,255,255,0.7); text-decoration: none;">${BRAND.email}</a>
        </p>
        <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 10px 0 0 0;">
          &copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
    `.trim();

    const emailResponse = await resend.emails.send({
      from: `Sentinel Aerial Inspections <${BRAND.email}>`,
      to: [recipientEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Sentinel delivery email sent:", emailResponse);

    // Generate delivery token for client portal access
    const deliveryToken = crypto.randomUUID().replace(/-/g, "");

    // Update drone_jobs with delivery info
    await supabase
      .from("drone_jobs")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        delivery_notes: custom_message ?? null,
        delivery_token: deliveryToken,
        delivery_token_created_at: new Date().toISOString(),
        ...(download_url ? { download_url } : {}),
      })
      .eq("id", job_id);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResponse.id,
        sent_to: recipientEmail,
        stats: { photo_count: photoCount, video_count: videoCount, total_size_mb: totalSizeMB },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Delivery email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
