import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusEmailData {
  customer_email: string;
  customer_name: string;
  order_id: string;
  new_status: string;
  order_total: number;
  order_items: Array<{
    product_name: string;
    quantity: number;
    total_price: number;
  }>;
  shipping_address?: string;
  tracking_number?: string;
}

const STATUS_MESSAGES: Record<string, { subject: string; heading: string; message: string }> = {
  confirmed: {
    subject: "Your Order Has Been Confirmed",
    heading: "Order Confirmed! ✓",
    message: "Great news! Your order has been confirmed and is being prepared for processing.",
  },
  processing: {
    subject: "Your Order Is Being Processed",
    heading: "Order In Progress",
    message: "Your order is currently being processed. We'll notify you when it ships.",
  },
  shipped: {
    subject: "Your Order Has Shipped!",
    heading: "Your Order Is On Its Way! 📦",
    message: "Exciting news! Your order has been shipped and is on its way to you.",
  },
  delivered: {
    subject: "Your Order Has Been Delivered",
    heading: "Order Delivered! 🎉",
    message: "Your order has been marked as delivered. We hope you enjoy your purchase!",
  },
  cancelled: {
    subject: "Your Order Has Been Cancelled",
    heading: "Order Cancelled",
    message: "Your order has been cancelled. If you have questions, please contact us.",
  },
};

function formatOrderItems(items: OrderStatusEmailData["order_items"]): string {
  return items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.total_price).toFixed(2)}</td>
        </tr>`
    )
    .join("");
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Order status email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: OrderStatusEmailData = await req.json();
    console.log("Received order status update data:", {
      orderId: data.order_id,
      newStatus: data.new_status,
      customerEmail: data.customer_email,
    });

    const statusInfo = STATUS_MESSAGES[data.new_status];
    if (!statusInfo) {
      console.log(`No email template for status: ${data.new_status}`);
      return new Response(
        JSON.stringify({ message: "No notification needed for this status" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusInfo.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Faith & Harmony LLC
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 22px;">
                ${statusInfo.heading}
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${data.customer_name},
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${statusInfo.message}
              </p>
              
              <!-- Order Info Box -->
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                <p style="color: #1e3a5f; font-size: 16px; font-weight: 600; margin: 0; font-family: monospace;">
                  ${data.order_id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              
              ${data.new_status === "shipped" && data.shipping_address ? `
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 30px;">
                <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">
                  Shipping To:
                </p>
                <p style="color: #166534; font-size: 14px; margin: 0;">
                  ${data.shipping_address}
                </p>
                ${data.tracking_number ? `
                <p style="color: #166534; font-size: 14px; margin: 10px 0 0 0;">
                  <strong>Tracking:</strong> ${data.tracking_number}
                </p>
                ` : ""}
              </div>
              ` : ""}
              
              <!-- Order Items -->
              <h3 style="color: #1e3a5f; font-size: 16px; margin: 0 0 15px 0;">Order Summary</h3>
              <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 14px; font-weight: 600;">Item</th>
                    <th style="padding: 12px; text-align: center; color: #64748b; font-size: 14px; font-weight: 600;">Qty</th>
                    <th style="padding: 12px; text-align: right; color: #64748b; font-size: 14px; font-weight: 600;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${formatOrderItems(data.order_items)}
                </tbody>
                <tfoot>
                  <tr style="background-color: #1e3a5f;">
                    <td colspan="2" style="padding: 15px; color: #ffffff; font-weight: 600;">Total</td>
                    <td style="padding: 15px; text-align: right; color: #ffffff; font-weight: 600; font-size: 18px;">
                      $${Number(data.order_total).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                Thank you for choosing Faith & Harmony LLC
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                If you have questions about your order, please contact us.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    console.log("Sending order status email to:", data.customer_email);

    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: [data.customer_email],
      subject: statusInfo.subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-status-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
