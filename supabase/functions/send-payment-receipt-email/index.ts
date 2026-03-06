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

interface ReceiptEmailRequest {
  job_id: string;
  payment_id: string;
}

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, payment_id } = (await req.json()) as ReceiptEmailRequest;

    if (!job_id || !payment_id) {
      return new Response(
        JSON.stringify({ error: "job_id and payment_id are required" }),
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

    // Look up the payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, amount, payment_type, paid_at, customer_email, square_invoice_url")
      .eq("id", payment_id)
      .maybeSingle();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the drone_job and related quote for job details
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select("id, quote_id")
      .eq("id", job_id)
      .maybeSingle();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the quote for project totals and client name
    let clientName = "Valued Client";
    let jobType = "Aerial Services";
    let totalAmount = 0;
    let depositAmount = 0;

    if (job.quote_id) {
      const { data: quote } = await supabase
        .from("quotes")
        .select("id, total, deposit_amount, quote_requests(name, job_type)")
        .eq("id", job.quote_id)
        .maybeSingle();

      if (quote) {
        totalAmount = quote.total ?? 0;
        depositAmount = quote.deposit_amount ?? 0;

        // quote_requests may be object or array depending on join
        const qr = Array.isArray(quote.quote_requests)
          ? quote.quote_requests[0]
          : quote.quote_requests;
        if (qr) {
          clientName = qr.name || clientName;
          jobType = qr.job_type || jobType;
        }
      }
    }

    const clientFirstName = clientName.split(" ")[0];
    const paymentAmount = payment.amount ?? 0;
    const paidAtFormatted = payment.paid_at ? formatDate(payment.paid_at) : "Today";
    const balancePaid = paymentAmount;

    const emailSubject = "Payment Received - Sentinel Aerial Inspections";

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
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">Payment Received</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px;">Thank you for your payment</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="color: #1a1a1a; line-height: 1.6; margin: 0 0 16px 0; font-size: 15px;">
          Hi ${clientFirstName},
        </p>
        <p style="color: #333; line-height: 1.6; margin: 0 0 24px 0; font-size: 15px;">
          We have received your balance payment. Thank you for choosing Sentinel Aerial Inspections for your ${jobType} project.
        </p>

        <!-- Payment Details -->
        <h3 style="color: ${BRAND.navy}; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Payment Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 12px 16px; background-color: ${BRAND.light}; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: ${BRAND.navy}; font-size: 14px;">Amount Paid</td>
            <td style="padding: 12px 16px; background-color: ${BRAND.light}; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; font-weight: 700; color: #059669;">${formatCurrency(balancePaid)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #555;">Payment Date</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; color: #333;">${paidAtFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #555;">Payment Type</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; color: #333;">Balance</td>
          </tr>
        </table>

        <!-- Job Summary -->
        ${totalAmount > 0 ? `
        <h3 style="color: ${BRAND.navy}; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Job Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 12px 16px; background-color: ${BRAND.light}; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: ${BRAND.navy}; font-weight: 600;">Service</td>
            <td style="padding: 12px 16px; background-color: ${BRAND.light}; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px;">${jobType}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #555;">Total Project Cost</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; color: #333;">${formatCurrency(totalAmount)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #555;">Deposit Paid</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; color: #333;">${formatCurrency(depositAmount)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 14px; color: #555;">Balance Paid</td>
            <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 700; color: #059669;">${formatCurrency(balancePaid)}</td>
          </tr>
        </table>
        ` : ""}

        <!-- Deliverables Message -->
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 0 0 28px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #166534; margin: 0; line-height: 1.6; font-size: 14px; font-weight: 600;">
            Your deliverables are being prepared.
          </p>
          <p style="color: #166534; margin: 8px 0 0 0; line-height: 1.6; font-size: 14px;">
            You will receive a separate email with download links once your files are ready for review.
          </p>
        </div>

        <!-- Support -->
        <div style="text-align: center; margin: 32px 0 0 0; padding: 24px; background-color: #f8f9fb; border-radius: 8px;">
          <p style="color: #555; line-height: 1.6; margin: 0; font-size: 14px;">
            Questions about your project? Reply to this email and we will be happy to help.
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
      to: [payment.customer_email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Payment receipt email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        email_sent_to: payment.customer_email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Receipt email error:", error);
    const status = error instanceof Error && error.message.includes("Resend") ? 502 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
