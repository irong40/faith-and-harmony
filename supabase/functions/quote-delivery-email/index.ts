import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand resolved from DB at runtime — see below

interface QuoteDeliveryRequest {
  quote_id: string;
  drive_url: string;
  custom_message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: QuoteDeliveryRequest = await req.json();
    const { quote_id, drive_url, custom_message } = body;

    if (!quote_id || !drive_url) {
      return new Response(
        JSON.stringify({ error: "quote_id and drive_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch quote with customer info from quote_requests
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select(`
        id,
        total,
        deposit_amount,
        quote_requests (
          name,
          email,
          job_type,
          brands (
            slug,
            company_name,
            tagline,
            color_primary,
            color_accent,
            color_cta,
            color_light,
            from_email,
            reply_to
          )
        )
      `)
      .eq("id", quote_id)
      .single();

    if (quoteErr || !quote) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request = Array.isArray(quote.quote_requests)
      ? quote.quote_requests[0]
      : quote.quote_requests;

    if (!request?.email) {
      return new Response(
        JSON.stringify({ error: "No customer email found for this quote" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve brand from nested join with SAI fallbacks
    const brandRow = request?.brands
      ? (Array.isArray(request.brands) ? request.brands[0] : request.brands)
      : null;
    const BRAND = {
      navy: brandRow?.color_primary ?? "#1C1C1C",
      sky: brandRow?.color_cta ?? "#FF6B35",
      accent: brandRow?.color_accent ?? "#FF6B35",
      light: brandRow?.color_light ?? "#F5F5F0",
      companyName: brandRow?.company_name ?? "Sentinel Aerial Inspections",
      tagline: brandRow?.tagline ?? "Professional Drone Services — Hampton Roads",
      fromEmail: brandRow?.from_email ?? "quotes@sentinelaerialinspections.com",
      replyTo: brandRow?.reply_to ?? "info@faithandharmonyllc.com",
    };

    const clientFirstName = (request.name ?? "Customer").split(" ")[0];
    const jobTypeLabel = request.job_type ?? "Aerial Inspection";
    const balanceDue = Number(quote.total) - Number(quote.deposit_amount);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:${BRAND.light};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.light};padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background-color:${BRAND.navy};padding:36px 40px;text-align:center;">
            <h1 style="color:${BRAND.accent};margin:0;font-size:24px;font-weight:700;letter-spacing:1px;">${BRAND.companyName}</h1>
            <p style="color:#ffffff;margin:8px 0 0;font-size:13px;opacity:0.85;">${BRAND.tagline}</p>
          </td>
        </tr>

        <!-- Title Banner -->
        <tr>
          <td style="background-color:${BRAND.sky};padding:20px 40px;text-align:center;">
            <h2 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">Your Deliverables Are Ready</h2>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${jobTypeLabel}</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#374151;margin:0 0 12px;line-height:1.6;">Hi ${clientFirstName},</p>
            <p style="color:#374151;margin:0 0 24px;line-height:1.6;">
              Your <strong>${jobTypeLabel}</strong> deliverables are ready. You can access all files through the Google Drive link below.
            </p>

            ${custom_message ? `
            <div style="background-color:#f0f6ff;border-left:4px solid ${BRAND.sky};padding:16px;margin:0 0 28px;border-radius:0 8px 8px 0;">
              <p style="color:#374151;margin:0;line-height:1.6;font-size:14px;">${custom_message}</p>
            </div>` : ""}

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td align="center">
                <a href="${drive_url}"
                   style="display:inline-block;background-color:${BRAND.sky};color:#ffffff;font-weight:700;font-size:15px;padding:14px 40px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">
                  View Deliverables in Google Drive
                </a>
              </td></tr>
            </table>

            <!-- Balance Due -->
            <table width="100%" cellpadding="12" style="background-color:#fef9ec;border:1px solid #fcd34d;border-radius:6px;margin-bottom:24px;">
              <tr>
                <td>
                  <p style="margin:0;font-weight:600;color:${BRAND.navy};font-size:14px;">Balance Due (Net 15)</p>
                  <p style="margin:6px 0 0;color:#374151;font-size:14px;">
                    Your remaining balance of <strong>$${balanceDue.toFixed(2)}</strong> is due within 15 days of this delivery.
                    You will receive a separate invoice shortly.
                  </p>
                </td>
              </tr>
            </table>

            <p style="color:#374151;margin:0;line-height:1.6;font-size:14px;">
              Questions about your files? Reply to this email and we will help.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">${BRAND.companyName} &mdash; Hampton Roads, VA</p>
            <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">Quote ID: ${quote_id.slice(0, 8).toUpperCase()}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resend = new Resend(RESEND_API_KEY);
    const result = await resend.emails.send({
      from: `${BRAND.companyName} <${BRAND.fromEmail}>`,
      to: [request.email],
      reply_to: BRAND.replyTo,
      subject: `Your Deliverables from ${BRAND.companyName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ error: "Failed to send delivery email", detail: result.error }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Quote delivery email sent:", result.data?.id, "to:", request.email, "quote:", quote_id);
    return new Response(
      JSON.stringify({ success: true, email_id: result.data?.id, sent_to: request.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
