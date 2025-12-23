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

    // Build download links HTML
    const downloadLinksHtml = deliverables.map(d => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          <strong>${d.name}</strong>
          ${d.description ? `<br><span style="color: #666; font-size: 14px;">${d.description}</span>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">
          ${d.file_count} files
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
          <a href="${d.download_url}" style="background-color: #1a1a2e; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Download
          </a>
        </td>
      </tr>
    `).join("");

    const pkg = job.drone_packages;
    const propertyAddress = `${job.property_address}${job.property_city ? `, ${job.property_city}` : ""}${job.property_state ? `, ${job.property_state}` : ""}`;

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <deliveries@faithandharmony.com>",
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
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Faith & Harmony</h1>
              <p style="color: #b8c5d6; margin: 8px 0 0 0; font-size: 14px;">Aerial Photography</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
              <h2 style="color: #1a1a2e; margin: 0 0 16px 0;">Your Photos Are Ready! 🎉</h2>
              
              <p style="color: #333; line-height: 1.6;">
                Dear ${customer.name},
              </p>
              
              <p style="color: #333; line-height: 1.6;">
                Great news! Your ${pkg?.name || "aerial photography"} package for <strong>${propertyAddress}</strong> is complete and ready for download.
              </p>

              ${custom_message ? `
                <div style="background-color: #f8f9fa; border-left: 4px solid #1a1a2e; padding: 16px; margin: 24px 0;">
                  <p style="color: #333; margin: 0; line-height: 1.6;">${custom_message}</p>
                </div>
              ` : ""}

              <!-- Job Details -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #1a1a2e; margin: 0 0 12px 0; font-size: 16px;">Order Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="color: #666; padding: 4px 0;">Job Number:</td>
                    <td style="color: #333; font-weight: 500;">${job.job_number}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 4px 0;">Package:</td>
                    <td style="color: #333; font-weight: 500;">${pkg?.name || "Standard"}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 4px 0;">Property:</td>
                    <td style="color: #333; font-weight: 500;">${propertyAddress}</td>
                  </tr>
                </table>
              </div>

              <!-- Download Links -->
              <h3 style="color: #1a1a2e; margin: 24px 0 16px 0;">Download Your Files</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666;">Package</th>
                    <th style="padding: 12px; text-align: center; font-size: 14px; color: #666;">Files</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #666;">Action</th>
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
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Faith & Harmony LLC<br>
                Hampton Roads, Virginia
              </p>
              <p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">
                <a href="https://faithandharmony.com" style="color: #1a1a2e;">faithandharmony.com</a>
              </p>
            </div>
          </div>
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
