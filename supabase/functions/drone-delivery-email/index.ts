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
  download_url?: string; // Direct ZIP download URL from n8n
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, deliverable_ids, custom_message, download_url } = await req.json() as DeliveryEmailRequest;

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

    // Fetch assets to get counts and first photo for hero thumbnail
    const { data: assets } = await supabase
      .from("drone_assets")
      .select("id, file_path, file_type, file_size")
      .eq("job_id", job_id)
      .order("sort_order")
      .limit(100);

    const photoCount = assets?.filter(a => a.file_type?.startsWith('image/')).length || 0;
    const videoCount = assets?.filter(a => a.file_type?.startsWith('video/')).length || 0;
    const totalSizeBytes = assets?.reduce((sum, a) => sum + (a.file_size || 0), 0) || 0;
    const totalSizeMB = Math.round(totalSizeBytes / (1024 * 1024));
    const heroThumbnailUrl = assets?.[0]?.file_path || null;

    // Fetch deliverables if provided
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

    // Use provided download_url or fallback to deliverables
    const primaryDownloadUrl = download_url || job.download_url || deliverables?.[0]?.download_url;

    if (!primaryDownloadUrl && (!deliverables || deliverables.length === 0)) {
      return new Response(
        JSON.stringify({ error: "No download URL or deliverables found for this job" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pkg = job.drone_packages;
    const propertyAddress = `${job.property_address}${job.property_city ? `, ${job.property_city}` : ""}${job.property_state ? `, ${job.property_state}` : ""}`;
    const clientFirstName = customer.name.split(' ')[0];

    // Send the email with enhanced template matching the documentation
    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: [customer.email],
      subject: `Your ${pkg?.name || 'aerial'} photos are ready - ${propertyAddress}`,
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
              </td>
            </tr>

            <!-- Hero Thumbnail -->
            ${heroThumbnailUrl ? `
            <tr>
              <td style="padding: 0;">
                <img src="${heroThumbnailUrl}" alt="Your aerial photos" style="width: 100%; height: 200px; object-fit: cover;"/>
              </td>
            </tr>
            ` : ''}

            <!-- Title Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, ${BRAND.gold} 0%, #c9973e 100%); padding: 24px; text-align: center;">
                <h2 style="color: ${BRAND.purple}; margin: 0; font-size: 24px; font-weight: 700;">Your Photos Are Ready</h2>
                <p style="color: ${BRAND.purple}; margin: 8px 0 0 0; font-size: 14px; opacity: 0.8;">${propertyAddress}</p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 32px;">
                <p style="color: #333; line-height: 1.6; margin: 0 0 24px 0;">
                  Hi ${clientFirstName},
                </p>
                
                <p style="color: #333; line-height: 1.6; margin: 0 0 24px 0;">
                  Your <strong>${pkg?.name || "aerial photography"}</strong> photos for <strong>${propertyAddress}</strong> are ready for download.
                </p>

                <!-- Stats Row -->
                <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
                  <tr>
                    <td style="text-align: center; padding: 16px; background-color: ${BRAND.cream}; border-radius: 8px 0 0 8px;">
                      <div style="font-size: 28px; font-weight: 700; color: ${BRAND.purple};">${photoCount}</div>
                      <div style="font-size: 12px; color: #666; text-transform: uppercase;">Photos</div>
                    </td>
                    ${videoCount > 0 ? `
                    <td style="text-align: center; padding: 16px; background-color: ${BRAND.cream};">
                      <div style="font-size: 28px; font-weight: 700; color: ${BRAND.purple};">${videoCount}</div>
                      <div style="font-size: 12px; color: #666; text-transform: uppercase;">Videos</div>
                    </td>
                    ` : ''}
                    <td style="text-align: center; padding: 16px; background-color: ${BRAND.cream}; border-radius: 0 8px 8px 0;">
                      <div style="font-size: 28px; font-weight: 700; color: ${BRAND.purple};">${totalSizeMB}MB</div>
                      <div style="font-size: 12px; color: #666; text-transform: uppercase;">Total Size</div>
                    </td>
                  </tr>
                </table>

                ${custom_message ? `
                  <div style="background-color: #f8f4fc; border-left: 4px solid ${BRAND.gold}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="color: #333; margin: 0; line-height: 1.6;">${custom_message}</p>
                  </div>
                ` : ""}

                <!-- CTA Buttons -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${primaryDownloadUrl}" style="background: linear-gradient(135deg, ${BRAND.gold} 0%, #c9973e 100%); color: ${BRAND.purple}; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 18px;">
                    Download All Photos
                  </a>
                  <p style="color: #666; font-size: 12px; margin: 12px 0 0 0;">
                    Link expires in 7 days
                  </p>
                </div>

                ${deliverables && deliverables.length > 1 ? `
                  <!-- Additional Deliverables -->
                  <h3 style="color: ${BRAND.purple}; margin: 24px 0 16px 0; font-size: 16px;">Additional Downloads</h3>
                  <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                    ${deliverables.slice(1).map((d: any) => `
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
                          <strong style="color: ${BRAND.purple};">${d.name}</strong>
                          ${d.description ? `<br><span style="color: #666; font-size: 14px;">${d.description}</span>` : ""}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                          <a href="${d.download_url}" style="color: ${BRAND.gold}; font-weight: 600; text-decoration: none;">
                            Download
                          </a>
                        </td>
                      </tr>
                    `).join("")}
                  </table>
                ` : ''}

                <!-- Support Text -->
                <div style="text-align: center; margin: 32px 0; padding: 24px; background-color: #f9f9f9; border-radius: 8px;">
                  <p style="color: #666; line-height: 1.6; margin: 0;">
                    Questions about your photos? Reply to this email and we'll help you out.
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

    // Generate delivery token for customer portal
    const deliveryToken = crypto.randomUUID().replace(/-/g, '');
    
    // Update job status to delivered and store download_url + delivery token
    const updateData: Record<string, unknown> = {
      status: "delivered",
      delivered_at: new Date().toISOString(),
      delivery_notes: custom_message || null,
      delivery_token: deliveryToken,
      delivery_token_created_at: new Date().toISOString()
    };
    
    if (download_url) {
      updateData.download_url = download_url;
    }

    await supabase
      .from("drone_jobs")
      .update(updateData)
      .eq("id", job_id);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResponse.id,
        sent_to: customer.email,
        stats: { photo_count: photoCount, video_count: videoCount, total_size_mb: totalSizeMB }
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
