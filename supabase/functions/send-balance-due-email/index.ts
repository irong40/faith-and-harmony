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
  tagline: "Veteran-Owned Aerial Services \u2014 Hampton Roads, VA",
  email: "deliveries@sentinelaerialinspections.com",
  website: "sentinelaerialinspections.com",
  location: "Hampton Roads, Virginia",
};

interface BalanceDueEmailRequest {
  job_id: string;
  payment_id: string;
  square_invoice_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, payment_id, square_invoice_url } =
      (await req.json()) as BalanceDueEmailRequest;

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

    // Fetch job with preview_urls
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select("id, preview_urls, quote_id")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!job.quote_id) {
      return new Response(
        JSON.stringify({ error: "Job has no associated quote" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch quote with customer info for name, email, job_type, and amounts
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, total, deposit_amount, quote_requests(name, email, job_type)")
      .eq("id", job.quote_id)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestInfo = Array.isArray(quote.quote_requests)
      ? quote.quote_requests[0]
      : quote.quote_requests;

    if (!requestInfo?.email) {
      return new Response(
        JSON.stringify({ error: "Customer email not found on quote request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientName = requestInfo.name ?? "Client";
    const clientFirstName = clientName.split(" ")[0];
    const clientEmail = requestInfo.email;
    const jobType = requestInfo.job_type ?? "Aerial Services";
    const balanceAmount = Number(quote.total) - Number(quote.deposit_amount);
    const balanceFormatted = "$" + balanceAmount.toFixed(2);

    // Build preview thumbnails HTML (up to 3 watermarked previews)
    const previews = (job.preview_urls || []).slice(0, 3);
    const previewHtml = previews.length > 0
      ? '<div style="text-align: center; margin: 24px 0;">' +
        previews
          .map(
            (url: string) =>
              '<img src="' + url + '" alt="Preview" style="width: 180px; border-radius: 8px; margin: 4px; display: inline-block;" />'
          )
          .join("") +
        "</div>"
      : "";

    const paymentUrl = square_invoice_url || "#";

    const emailSubject = "Balance Due for Your " + jobType + " Deliverables";

    const emailHtml = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '  <title>' + emailSubject + '</title>',
      '</head>',
      '<body style="font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #eef2f7;">',
      '  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">',
      '',
      '    <!-- Header -->',
      '    <tr>',
      '      <td style="background: linear-gradient(135deg, ' + BRAND.navy + ' 0%, #1a3152 100%); padding: 32px; text-align: center;">',
      '        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">',
      '          ' + BRAND.companyName,
      '        </h1>',
      '        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 12px; letter-spacing: 0.5px;">',
      '          ' + BRAND.tagline,
      '        </p>',
      '      </td>',
      '    </tr>',
      '',
      '    <!-- Title Banner -->',
      '    <tr>',
      '      <td style="background: linear-gradient(135deg, ' + BRAND.sky + ' 0%, #2563eb 100%); padding: 20px; text-align: center;">',
      '        <h2 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">Your Aerial Deliverables Are Ready</h2>',
      '        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px;">Balance payment required to access full resolution files</p>',
      '      </td>',
      '    </tr>',
      '',
      '    <!-- Content -->',
      '    <tr>',
      '      <td style="padding: 32px;">',
      '        <p style="color: #1a1a1a; line-height: 1.6; margin: 0 0 16px 0; font-size: 15px;">',
      '          Hi ' + clientFirstName + ',',
      '        </p>',
      '        <p style="color: #333; line-height: 1.6; margin: 0 0 24px 0; font-size: 15px;">',
      '          Your <strong>' + jobType + '</strong> deliverables have been processed and are ready for release.',
      '          Below are watermarked previews of your aerial content. Full resolution files will be delivered after payment.',
      '        </p>',
      '',
      '        ' + previewHtml,
      '',
      '        <!-- Balance Amount -->',
      '        <div style="background-color: ' + BRAND.light + '; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">',
      '          <p style="color: #666; font-size: 13px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Balance Due</p>',
      '          <p style="color: ' + BRAND.navy + '; font-size: 32px; font-weight: 700; margin: 0;">' + balanceFormatted + '</p>',
      '          <p style="color: #888; font-size: 12px; margin: 8px 0 0 0;">Net 15 payment terms</p>',
      '        </div>',
      '',
      '        <!-- Pay Now CTA -->',
      '        <div style="text-align: center; margin: 28px 0;">',
      '          <a href="' + paymentUrl + '"',
      '             style="background: linear-gradient(135deg, ' + BRAND.accent + ' 0%, #d97706 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 18px; letter-spacing: 0.3px;">',
      '            Pay Now',
      '          </a>',
      '          <p style="color: #888; font-size: 12px; margin: 12px 0 0 0;">',
      '            Secure payment powered by Square',
      '          </p>',
      '        </div>',
      '',
      '        <!-- Support -->',
      '        <div style="text-align: center; margin: 32px 0 0 0; padding: 24px; background-color: #f8f9fb; border-radius: 8px;">',
      '          <p style="color: #555; line-height: 1.6; margin: 0; font-size: 14px;">',
      '            Questions about your invoice? Reply to this email and we will be happy to help.',
      '          </p>',
      '        </div>',
      '      </td>',
      '    </tr>',
      '',
      '    <!-- Footer -->',
      '    <tr>',
      '      <td style="background-color: ' + BRAND.navy + '; padding: 24px; text-align: center;">',
      '        <p style="color: white; font-size: 14px; font-weight: 600; margin: 0;">' + BRAND.companyName + '</p>',
      '        <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 6px 0 0 0;">',
      '          ' + BRAND.location,
      '        </p>',
      '        <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 8px 0 0 0;">',
      '          <a href="https://' + BRAND.website + '" style="color: rgba(255,255,255,0.7); text-decoration: none;">' + BRAND.website + '</a>',
      '          &nbsp;|&nbsp;',
      '          <a href="mailto:' + BRAND.email + '" style="color: rgba(255,255,255,0.7); text-decoration: none;">' + BRAND.email + '</a>',
      '        </p>',
      '      </td>',
      '    </tr>',
      '',
      '  </table>',
      '</body>',
      '</html>',
    ].join("\n");

    const emailResponse = await resend.emails.send({
      from: "Sentinel Aerial Inspections <" + BRAND.email + ">",
      to: [clientEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Balance due email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        email_sent_to: clientEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Balance due email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
