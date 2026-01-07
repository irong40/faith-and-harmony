import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invoice with customer data
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        customers (name, email, company_name)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    const customerEmail = invoice.customers?.email;
    const customerName = invoice.customers?.name || "Valued Customer";

    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://faithandharmony.com";
    const invoiceUrl = `${baseUrl}/invoice/${invoice.view_token}`;

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    };

    const lineItems = (invoice.line_items as LineItem[]) || [];
    const lineItemsHtml = lineItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.amount)}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background-color: #7c3aed; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Faith & Harmony, LLC</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0;">Invoice ${invoice.invoice_number}</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Hello ${customerName},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Please find your invoice details below. Payment is due by <strong>${formatDate(invoice.due_date)}</strong>.
            </p>
            
            <!-- Invoice Summary -->
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600;">Description</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 12px; font-weight: 600;">Subtotal</td>
                    <td style="padding: 12px; text-align: right;">${formatCurrency(invoice.subtotal)}</td>
                  </tr>
                  ${
                    invoice.discount > 0
                      ? `
                  <tr>
                    <td style="padding: 12px; color: #059669;">Discount</td>
                    <td style="padding: 12px; text-align: right; color: #059669;">-${formatCurrency(invoice.discount)}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr style="background-color: #7c3aed;">
                    <td style="padding: 16px; font-weight: bold; color: white; font-size: 18px;">Total Due</td>
                    <td style="padding: 16px; text-align: right; font-weight: bold; color: white; font-size: 18px;">${formatCurrency(invoice.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            ${
              invoice.payment_terms
                ? `
            <div style="margin: 24px 0;">
              <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 14px;">Payment Terms</h3>
              <p style="color: #4b5563; margin: 0; line-height: 1.6;">${invoice.payment_terms}</p>
            </div>
            `
                : ""
            }
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${invoiceUrl}" style="display: inline-block; background-color: #7c3aed; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Invoice & Pay Online</a>
            </div>
            
            <!-- Payment Options -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
              <h3 style="color: #1f2937; margin: 0 0 16px 0;">Payment Options</h3>
              <p style="color: #4b5563; margin: 0 0 8px 0;"><strong>PayPal:</strong> paypal.me/faithharmonyllc</p>
              <p style="color: #4b5563; margin: 0 0 8px 0;"><strong>Cash App:</strong> $FaithHarmonyLLC</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
                Please include <strong>${invoice.invoice_number}</strong> as the payment reference.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Faith & Harmony, LLC<br>
              Virginia Beach, VA<br>
              info@faithandharmonyllc.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <invoices@faithandharmonyllc.com>",
      to: [customerEmail],
      subject: `Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.total)} Due`,
      html: emailHtml,
    });

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error sending invoice email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
