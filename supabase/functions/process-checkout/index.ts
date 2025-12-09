import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_id: string;
  product_name: string;
  product_color?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CheckoutData {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  items: OrderItem[];
  subtotal: number;
  notes?: string;
}

function formatOrderItems(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            ${item.product_name}${item.product_color ? ` - ${item.product_color}` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.total_price).toFixed(2)}</td>
        </tr>`
    )
    .join("");
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Checkout order function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data: CheckoutData = await req.json();
    console.log("Received checkout data:", {
      customerEmail: data.customer.email,
      itemCount: data.items.length,
      subtotal: data.subtotal,
    });

    // 1. Find or create customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", data.customer.email)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log("Found existing customer:", customerId);

      // Update customer info
      await supabase
        .from("customers")
        .update({
          name: data.customer.name,
          phone: data.customer.phone,
          address: data.customer.address,
          city: data.customer.city,
          state: data.customer.state,
          zip: data.customer.zip,
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone,
          address: data.customer.address,
          city: data.customer.city,
          state: data.customer.state,
          zip: data.customer.zip,
        })
        .select("id")
        .single();

      if (customerError) {
        console.error("Error creating customer:", customerError);
        throw new Error("Failed to create customer");
      }
      customerId = newCustomer.id;
      console.log("Created new customer:", customerId);
    }

    // 2. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        subtotal: data.subtotal,
        shipping: 0,
        total: data.subtotal,
        shipping_address: data.customer.address,
        shipping_city: data.customer.city,
        shipping_state: data.customer.state,
        shipping_zip: data.customer.zip,
        notes: data.notes || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }
    console.log("Created order:", order.id);

    // 3. Create order items
    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_color: item.product_color || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      throw new Error("Failed to create order items");
    }
    console.log("Created order items");

    // 4. Send confirmation email to customer
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
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
                Thank You for Your Order! 🎉
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${data.customer.name},
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We've received your order and are excited to get it ready for you! We'll be in touch shortly with payment details.
              </p>
              
              <!-- Order Info Box -->
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                <p style="color: #1e3a5f; font-size: 16px; font-weight: 600; margin: 0; font-family: monospace;">
                  ${order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              
              <!-- Shipping Address -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 30px;">
                <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">
                  Shipping To:
                </p>
                <p style="color: #166534; font-size: 14px; margin: 0;">
                  ${data.customer.address}<br>
                  ${data.customer.city}, ${data.customer.state} ${data.customer.zip}
                </p>
              </div>
              
              <!-- Order Items -->
              <h3 style="color: #1e3a5f; font-size: 16px; margin: 0 0 15px 0;">Order Summary</h3>
              <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 14px; font-weight: 600;">Item</th>
                    <th style="padding: 12px; text-align: center; color: #64748b; font-size: 14px; font-weight: 600;">Qty</th>
                    <th style="padding: 12px; text-align: right; color: #64748b; font-size: 14px; font-weight: 600;">Price</th>
                    <th style="padding: 12px; text-align: right; color: #64748b; font-size: 14px; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${formatOrderItems(data.items)}
                </tbody>
                <tfoot>
                  <tr style="background-color: #1e3a5f;">
                    <td colspan="3" style="padding: 15px; color: #ffffff; font-weight: 600;">Subtotal</td>
                    <td style="padding: 15px; text-align: right; color: #ffffff; font-weight: 600; font-size: 18px;">
                      $${Number(data.subtotal).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              <p style="color: #64748b; font-size: 14px; margin: 20px 0; font-style: italic;">
                * Shipping will be calculated and added to your total
              </p>
              
              <!-- Payment Options -->
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <h3 style="color: #92400e; font-size: 16px; margin: 0 0 15px 0;">Payment Options</h3>
                <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>PayPal:</strong> faithandharmonyllc@gmail.com
                </p>
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  <strong>Cash App:</strong> $FaithandHarmony
                </p>
              </div>
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

    // Send customer confirmation
    const customerEmailResult = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: [data.customer.email],
      subject: "Order Confirmation - Faith & Harmony LLC",
      html: customerEmailHtml,
    });
    console.log("Customer email sent:", customerEmailResult);

    // 5. Send notification email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Order Received</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">
          <h1 style="color: #1e3a5f; margin: 0 0 20px 0;">🛒 New Order Received</h1>
          
          <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0;"><strong>Order ID:</strong> ${order.id}</p>
            <p style="margin: 5px 0 0 0;"><strong>Total:</strong> $${Number(data.subtotal).toFixed(2)}</p>
          </div>
          
          <h3 style="color: #1e3a5f; margin: 20px 0 10px 0;">Customer Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${data.customer.name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${data.customer.email}</p>
          <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.customer.phone}</p>
          <p style="margin: 5px 0;"><strong>Address:</strong> ${data.customer.address}, ${data.customer.city}, ${data.customer.state} ${data.customer.zip}</p>
          
          <h3 style="color: #1e3a5f; margin: 20px 0 10px 0;">Order Items</h3>
          <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr>
                  <td style="padding: 10px; border-top: 1px solid #e5e7eb;">${item.product_name}${item.product_color ? ` - ${item.product_color}` : ""}</td>
                  <td style="padding: 10px; border-top: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
                  <td style="padding: 10px; border-top: 1px solid #e5e7eb; text-align: right;">$${Number(item.total_price).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          ${data.notes ? `
          <h3 style="color: #1e3a5f; margin: 20px 0 10px 0;">Customer Notes</h3>
          <p style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 0;">${data.notes}</p>
          ` : ""}
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            View and manage this order in the admin panel.
          </p>
        </div>
      </body>
      </html>
    `;

    const adminEmailResult = await resend.emails.send({
      from: "Faith & Harmony Orders <onboarding@resend.dev>",
      to: ["faithandharmonyllc@gmail.com"],
      subject: `New Order #${order.id.slice(0, 8).toUpperCase()} - $${Number(data.subtotal).toFixed(2)}`,
      html: adminEmailHtml,
    });
    console.log("Admin email sent:", adminEmailResult);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        customerId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in process-checkout function:", error);
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
