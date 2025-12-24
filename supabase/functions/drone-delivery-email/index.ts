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

// Faith & Harmony Branding - consistent with all emails
const BRAND = {
  purple: "#2b0a3d",
  gold: "#dfae62",
  cream: "#eae3d9",
  companyName: "Faith & Harmony LLC",
  tagline: "Rooted in Purpose. Driven by Service.",
  email: "info@faithandharmonyllc.com",
  website: "faithandharmony.com",
  location: "Hampton Roads, Virginia",
};

interface DeliveryEmailRequest {
  job_id: string;
  deliverable_ids?: string[];
  custom_message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, deliverable_ids, custom_message } = await req.json() as DeliveryEmailRequest;

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

    // Fetch job with customer and package info
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select(`
        *,
        drone_packages (*),
        customers (*)
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customer = job.customers;
    if (!customer?.email) {
      return new Response(
        JSON.stringify({ error: "Customer email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch deliverables
    let deliverables;
    if (deliverable_ids && deliverable_ids.length > 0) {
      const { data } = await supabase
        .from("drone_deliverables")
        .select("*")
        .eq("job_id", job_id)
        .in("id", deliverable_ids);
      deliverables = data;
    } else {
      const { data } = await supabase
        .from("drone_deliverables")
        .select("*")
        .eq("job_id", job_id);
      deliverables = data;
    }

    if (!deliverables || deliverables.length === 0) {
      return new Response(
        JSON.stringify({ error: "No deliverables found for this job" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build download links HTML with branded button
    const downloadLinksHtml = deliverables.map(d => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          <strong style="color: ${BRAND.purple};">${d.name}</strong>
          ${d.description ? `<br><span style="color: #666; font-size: 14px;">${d.description}</span>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center; color: #666;">
          ${d.file_count} files
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
          <a href="${d.download_url}" style="background: linear-gradient(135deg, ${BRAND.gold} 0%, #c9973e 100%); color: ${BRAND.purple}; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Download
          </a>
        </td>
      </tr>
    `).join("");

    const pkg = job.drone_packages;
    const propertyAddress = `${job.property_address}${job.property_city ? `, ${job.property_city}` : ""}${job.property_state ? `, ${job.property_state}` : ""}`;

    // Send the email with consistent branding
    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: [customer.email],
      subject: `Your Aerial Photos Are Ready - ${job.job_number}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, ${BRAND.purple} 0%, #4a1259 100%); padding: 32px; text-align: center;">
                <h1 style="color: ${BRAND.gold}; margin: 0; font-size: 26px; font-weight: 700;">${BRAND.companyName}</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 13px; font-style: italic;">${BRAND.tagline}</p>
                <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 12px;">Aerial Photography</p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 32px;">
                <h2 style="color: ${BRAND.purple}; margin: 0 0 16px 0; font-size: 22px;">Your Photos Are Ready! 🎉</h2>
                
                <p style="color: #333; line-height: 1.6;">
                  Dear ${customer.name},
                </p>
                
                <p style="color: #333; line-height: 1.6;">
                  Great news! Your ${pkg?.name || "aerial photography"} package for <strong>${propertyAddress}</strong> is complete and ready for download.
                </p>

                ${custom_message ? `
                  <div style="background-color: #f8f4fc; border-left: 4px solid ${BRAND.gold}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="color: #333; margin: 0; line-height: 1.6;">${custom_message}</p>
                  </div>
                ` : ""}

                <!-- Job Details -->
                <div style="background-color: ${BRAND.cream}; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: ${BRAND.purple}; margin: 0 0 12px 0; font-size: 16px;">Order Details</h3>
                  <table style="width: 100%; font-size: 14px;">
                    <tr>
                      <td style="color: #666; padding: 4px 0;">Job Number:</td>
                      <td style="color: ${BRAND.purple}; font-weight: 600;">${job.job_number}</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 4px 0;">Package:</td>
                      <td style="color: ${BRAND.purple}; font-weight: 600;">${pkg?.name || "Standard"}</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 4px 0;">Property:</td>
                      <td style="color: ${BRAND.purple}; font-weight: 600;">${propertyAddress}</td>
                    </tr>
                  </table>
                </div>

                <!-- Download Links -->
                <h3 style="color: ${BRAND.purple}; margin: 24px 0 16px 0;">Download Your Files</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: ${BRAND.purple};">
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: white;">Package</th>
                      <th style="padding: 12px; text-align: center; font-size: 14px; color: white;">Files</th>
                      <th style="padding: 12px; text-align: right; font-size: 14px; color: white;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${downloadLinksHtml}
                  </tbody>
                </table>

                <p style="color: #666; font-size: 12px; margin-top: 16px;">
                  ⏰ Download links expire in 7 days. Please download your files before then.
                </p>

                <!-- CTA -->
                <div style="text-align: center; margin: 32px 0;">
                  <p style="color: #333; line-height: 1.6;">
                    We hope you love your photos! If you have any questions or need any adjustments, please don't hesitate to reach out.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: ${BRAND.purple}; padding: 30px; text-align: center;">
                <p style="color: ${BRAND.gold}; font-size: 16px; font-weight: 600; margin: 0;">${BRAND.companyName}</p>
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 8px 0 0 0;">
                  ${BRAND.location}
                </p>
                <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 12px 0 0 0;">
                  <a href="https://${BRAND.website}" style="color: ${BRAND.gold}; text-decoration: none;">${BRAND.website}</a> | 
                  <a href="mailto:${BRAND.email}" style="color: ${BRAND.gold}; text-decoration: none;">${BRAND.email}</a>
                </p>
                <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 12px 0 0 0;">
                  © ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Delivery email sent:", emailResponse);

    // Update job status to delivered
    await supabase
      .from("drone_jobs")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        delivery_notes: custom_message || null
      })
      .eq("id", job_id);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResponse.id,
        sent_to: customer.email
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
