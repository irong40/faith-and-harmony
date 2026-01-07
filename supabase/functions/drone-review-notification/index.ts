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

// Faith & Harmony Branding
const BRAND = {
  purple: "#2b0a3d",
  gold: "#dfae62",
  cream: "#eae3d9",
  companyName: "Faith & Harmony LLC",
  adminEmail: "info@faithandharmonyllc.com",
};

interface ReviewNotificationRequest {
  job_id: string;
  candidate_asset_ids?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, candidate_asset_ids } = await req.json() as ReviewNotificationRequest;

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

    // Fetch job with package info
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select(`
        *,
        drone_packages (name, code)
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch candidate assets (photos flagged for sky replacement review)
    let candidates;
    if (candidate_asset_ids && candidate_asset_ids.length > 0) {
      const { data } = await supabase
        .from("drone_assets")
        .select("id, file_name, file_path")
        .in("id", candidate_asset_ids);
      candidates = data;
    } else {
      // If no specific candidates, get all assets for the job
      const { data } = await supabase
        .from("drone_assets")
        .select("id, file_name, file_path")
        .eq("job_id", job_id)
        .limit(10);
      candidates = data;
    }

    const candidateCount = candidates?.length || 0;
    const pkg = job.drone_packages;
    
    // Build review URL - links to admin drone job detail page
    const reviewUrl = `${SUPABASE_URL.replace('.supabase.co', '')}/admin/drone-jobs/${job_id}`;

    // Build candidate thumbnails HTML (show first 4)
    const candidateThumbnailsHtml = (candidates || []).slice(0, 4).map((c: any, index: number) => `
      <td style="width: 25%; padding: 4px; ${index % 2 === 0 ? '' : ''}">
        <div style="background-color: #f5f5f5; border-radius: 8px; overflow: hidden;">
          <img src="${c.file_path}" alt="${c.file_name}" style="width: 100%; height: 80px; object-fit: cover;"/>
          <p style="margin: 4px; font-size: 10px; color: #666; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${c.file_name}
          </p>
        </div>
      </td>
    `).join("");

    // Send the notification email to admin
    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <info@faithandharmonyllc.com>",
      to: [BRAND.adminEmail],
      subject: `⏸️ Review needed: Sky replacement for ${job.job_number}`,
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
              <td style="background: linear-gradient(135deg, ${BRAND.purple} 0%, #4a1259 100%); padding: 24px; text-align: center;">
                <h1 style="color: ${BRAND.gold}; margin: 0; font-size: 22px;">⏸️ Review Required</h1>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 24px;">
                <p style="color: #333; line-height: 1.6; margin: 0 0 16px 0;">
                  Premium package processing paused for <strong>${job.property_address}</strong>.
                </p>
                
                <p style="color: #333; line-height: 1.6; margin: 0 0 24px 0;">
                  <strong>${candidateCount} photos</strong> flagged for potential sky replacement review.
                </p>

                <!-- Job Details -->
                <div style="background-color: ${BRAND.cream}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                  <table style="width: 100%; font-size: 14px;">
                    <tr>
                      <td style="color: #666; padding: 4px 0;">Job Number:</td>
                      <td style="color: ${BRAND.purple}; font-weight: 600;">${job.job_number}</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 4px 0;">Package:</td>
                      <td style="color: ${BRAND.purple}; font-weight: 600;">${pkg?.name || "Premium"}</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 4px 0;">QA Score:</td>
                      <td style="color: ${BRAND.purple}; font-weight: 600;">${job.qa_score || 'N/A'}</td>
                    </tr>
                  </table>
                </div>

                ${candidateCount > 0 ? `
                  <!-- Candidate Thumbnails -->
                  <h3 style="color: ${BRAND.purple}; margin: 0 0 12px 0; font-size: 14px;">Sky Replacement Candidates</h3>
                  <table style="width: 100%; margin-bottom: 24px;">
                    <tr>
                      ${candidateThumbnailsHtml}
                    </tr>
                  </table>
                ` : ''}

                <!-- CTA Button -->
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${reviewUrl}" style="background: linear-gradient(135deg, ${BRAND.gold} 0%, #c9973e 100%); color: ${BRAND.purple}; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                    Review in App
                  </a>
                </div>

                <p style="color: #666; font-size: 13px; line-height: 1.6; margin-top: 24px;">
                  Processing will resume automatically once you approve or skip sky replacement for each photo.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: ${BRAND.purple}; padding: 20px; text-align: center;">
                <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
                  ${BRAND.companyName} • Drone Operations
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Review notification sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResponse.id,
        sent_to: BRAND.adminEmail,
        candidate_count: candidateCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Review notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
