import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { view_token, payment_method, amount, reference } = await req.json();

    // Validate required fields
    if (!view_token) {
      console.error("Missing view_token in request");
      return new Response(
        JSON.stringify({ error: "Invalid request: missing token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payment_method) {
      console.error("Missing payment_method in request");
      return new Response(
        JSON.stringify({ error: "Invalid request: missing payment method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for secure updates
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Validate the token matches an actual invoice
    console.log("Validating view_token:", view_token);
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        total,
        customer_id,
        customers (
          id,
          name,
          email
        )
      `)
      .eq("view_token", view_token)
      .single();

    if (fetchError || !invoice) {
      console.error("Invoice not found for token:", view_token, fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired invoice link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found invoice:", invoice.invoice_number);

    // Build the payment claim object
    const paymentClaim = {
      method: payment_method,
      amount: amount || invoice.total,
      reference: reference || null,
      claimed_at: new Date().toISOString(),
    };

    // Update the invoice with the payment claim
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ customer_payment_claim: paymentClaim })
      .eq("id", invoice.id);

    if (updateError) {
      console.error("Failed to update invoice:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to record payment claim" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payment claim recorded for invoice:", invoice.invoice_number);

    // Send admin notification email
    const adminEmail = "admin@faithandharmony.org";
    const customer = invoice.customers as { name: string; email: string } | null;
    const customerName = customer?.name || "Unknown Customer";
    const customerEmail = customer?.email || "No email";

    const adminUrl = `https://faithandharmony.org/admin/invoices`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💳 Payment Claim Received</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin-top: 0;">A customer has indicated they've made a payment:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Invoice:</td>
                <td style="padding: 8px 0; font-weight: 600;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
                <td style="padding: 8px 0;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Customer Email:</td>
                <td style="padding: 8px 0;">${customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Payment Method:</td>
                <td style="padding: 8px 0; font-weight: 600;">${payment_method}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount Claimed:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #059669;">$${(paymentClaim.amount || 0).toFixed(2)}</td>
              </tr>
              ${reference ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Reference:</td>
                <td style="padding: 8px 0; font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${reference}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Claimed At:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⚠️ Action Required:</strong> Please verify this payment in your ${payment_method} account before updating the invoice status.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="${adminUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Invoice in Admin</a>
          </div>
        </div>
        
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          Faith & Harmony LLC • Automated Notification
        </p>
      </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: "Faith & Harmony <notifications@faithandharmony.org>",
        to: [adminEmail],
        subject: `💳 Payment Claim: ${invoice.invoice_number} - ${customerName}`,
        html: emailHtml,
      });
      console.log("Admin notification email sent");
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error("Failed to send admin notification email:", emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment claim recorded successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in invoice-payment-claim:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
