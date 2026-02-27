import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND = {
  navy: "#0f1e36",
  sky: "#3b82f6",
  accent: "#f59e0b",
  light: "#f0f4f8",
  companyName: "Sentinel Aerial Inspections",
  tagline: "Veteran-Owned Aerial Services — Hampton Roads, VA",
  fromEmail: "quotes@sentinelaerialinspections.com",
  replyTo: "inquiries@sentinelaerialinspections.com",
};

interface ConfirmationRequest {
  request_id: string;
  name: string;
  email: string;
  job_type?: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: ConfirmationRequest = await req.json();
    const { request_id, name, email, job_type, description } = body;

    if (!request_id || !name || !email) {
      return new Response(
        JSON.stringify({ error: "request_id, name, and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f0f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${BRAND.navy};padding:36px 40px;text-align:center;">
            <h1 style="color:${BRAND.accent};margin:0;font-size:24px;font-weight:700;letter-spacing:1px;">${BRAND.companyName}</h1>
            <p style="color:#ffffff;margin:8px 0 0;font-size:13px;opacity:0.85;">${BRAND.tagline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:${BRAND.navy};margin:0 0 16px;font-size:20px;">Request Received</h2>
            <p style="color:#374151;margin:0 0 12px;line-height:1.6;">Hi ${name},</p>
            <p style="color:#374151;margin:0 0 24px;line-height:1.6;">
              We received your quote request and will review it shortly. You can expect a response within one business day.
            </p>
            ${job_type ? `
            <table width="100%" cellpadding="12" style="background-color:#f8fafc;border-radius:6px;margin-bottom:24px;">
              <tr><td style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Service Requested</td></tr>
              <tr><td style="color:${BRAND.navy};font-size:15px;padding-top:4px;">${job_type}</td></tr>
            </table>` : ""}
            ${description ? `
            <table width="100%" cellpadding="12" style="background-color:#f8fafc;border-radius:6px;margin-bottom:24px;">
              <tr><td style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your Details</td></tr>
              <tr><td style="color:#374151;font-size:14px;padding-top:4px;line-height:1.6;">${description}</td></tr>
            </table>` : ""}
            <p style="color:#374151;margin:0 0 8px;line-height:1.6;">Questions? Reply to this email or call us directly.</p>
            <p style="color:#374151;margin:0;line-height:1.6;">Thank you for considering Sentinel Aerial Inspections.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">${BRAND.companyName} &mdash; Hampton Roads, VA</p>
            <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">Reference: ${request_id.slice(0, 8).toUpperCase()}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const result = await resend.emails.send({
      from: `${BRAND.companyName} <${BRAND.fromEmail}>`,
      to: [email],
      reply_to: BRAND.replyTo,
      subject: "Quote Request Received — Sentinel Aerial Inspections",
      html: emailHtml,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ error: "Failed to send confirmation email", detail: result.error }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Confirmation email sent:", result.data?.id, "to:", email);
    return new Response(
      JSON.stringify({ success: true, email_id: result.data?.id }),
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
