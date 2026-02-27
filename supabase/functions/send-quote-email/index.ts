import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  baseUrl: "https://faithandharmonyllc.com",
};

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface SendQuoteRequest {
  quote_id: string;
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
    const { quote_id }: SendQuoteRequest = await req.json();

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: "quote_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch quote with the linked quote_request for customer info
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select(`
        id,
        status,
        line_items,
        total,
        deposit_amount,
        notes,
        acceptance_token,
        expires_at,
        quote_requests (
          name,
          email,
          job_type
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

    if (quote.status !== "sent" && quote.status !== "revised") {
      return new Response(
        JSON.stringify({ error: `Cannot email a quote in '${quote.status}' status. Status must be 'sent' or 'revised'.` }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request = Array.isArray(quote.quote_requests) ? quote.quote_requests[0] : quote.quote_requests;
    if (!request?.email) {
      return new Response(
        JSON.stringify({ error: "Quote request has no customer email" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lineItems: LineItem[] = Array.isArray(quote.line_items) ? quote.line_items : [];
    const acceptanceUrl = `${BRAND.baseUrl}/quote/${quote.acceptance_token}`;
    const expiryDateStr = quote.expires_at
      ? new Date(quote.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "30 days from receipt";

    const lineItemsRows = lineItems.map((item) => {
      const lineTotal = (item.quantity * item.unit_price).toFixed(2);
      return `
        <tr>
          <td style="padding:10px 12px;color:#374151;border-bottom:1px solid #e5e7eb;">${item.description}</td>
          <td style="padding:10px 12px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
          <td style="padding:10px 12px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:right;">$${lineTotal}</td>
        </tr>`;
    }).join("");

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
            <h2 style="color:${BRAND.navy};margin:0 0 8px;font-size:20px;">Your Quote is Ready</h2>
            <p style="color:#6b7280;margin:0 0 24px;font-size:13px;">This quote expires on ${expiryDateStr}</p>
            <p style="color:#374151;margin:0 0 24px;line-height:1.6;">Hi ${request.name},</p>
            <p style="color:#374151;margin:0 0 32px;line-height:1.6;">
              Thank you for your interest in ${request.job_type ?? "our services"}. Please find your quote below. Use the button at the bottom to accept or decline.
            </p>

            <!-- Line Items Table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
              <tr style="background-color:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Description</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Total</th>
              </tr>
              ${lineItemsRows || '<tr><td colspan="4" style="padding:16px 12px;color:#9ca3af;font-style:italic;text-align:center;">No line items</td></tr>'}
              <tr style="background-color:#f8fafc;">
                <td colspan="3" style="padding:12px;text-align:right;font-weight:600;color:${BRAND.navy};">Total</td>
                <td style="padding:12px;text-align:right;font-weight:700;color:${BRAND.navy};font-size:16px;">$${Number(quote.total).toFixed(2)}</td>
              </tr>
            </table>

            <!-- Deposit Note -->
            <table width="100%" cellpadding="12" style="background-color:#fef9ec;border:1px solid #fcd34d;border-radius:6px;margin-bottom:32px;">
              <tr>
                <td>
                  <p style="margin:0;font-weight:600;color:${BRAND.navy};font-size:14px;">Deposit Required to Schedule</p>
                  <p style="margin:6px 0 0;color:#374151;font-size:14px;">
                    A deposit of <strong>$${Number(quote.deposit_amount).toFixed(2)}</strong> is due upon acceptance to reserve your date. The remaining balance is due Net 15 after delivery.
                  </p>
                </td>
              </tr>
            </table>

            ${quote.notes ? `
            <table width="100%" cellpadding="12" style="background-color:#f8fafc;border-radius:6px;margin-bottom:32px;">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-weight:600;color:${BRAND.navy};font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Notes</p>
                  <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${quote.notes}</p>
                </td>
              </tr>
            </table>` : ""}

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td align="center">
                <a href="${acceptanceUrl}"
                   style="display:inline-block;background-color:${BRAND.sky};color:#ffffff;font-weight:700;font-size:15px;padding:14px 40px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">
                  View and Respond to Quote
                </a>
              </td></tr>
            </table>

            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
              Or copy this link: <a href="${acceptanceUrl}" style="color:${BRAND.sky};">${acceptanceUrl}</a>
            </p>
          </td>
        </tr>
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
      subject: `Your Quote from Sentinel Aerial Inspections`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ error: "Failed to send quote email", detail: result.error }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Quote email sent:", result.data?.id, "to:", request.email, "quote:", quote_id);
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
