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

    // 4. Send invoice email to customer with PDF attachment
    console.log("Sending invoice email with PDF...");
    try {
      const invoiceResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-invoice-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            type: "invoice",
            order_id: order.id,
            customer_name: data.customer.name,
            customer_email: data.customer.email,
            customer_address: data.customer.address,
            customer_city: data.customer.city,
            customer_state: data.customer.state,
            customer_zip: data.customer.zip,
            items: data.items.map((item) => ({
              product_name: item.product_name,
              product_color: item.product_color,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            })),
            subtotal: data.subtotal,
            shipping: 0,
            total: data.subtotal,
            created_at: new Date().toISOString(),
          }),
        }
      );
      
      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        console.error("Invoice email failed:", errorText);
      } else {
        console.log("Invoice email sent successfully");
      }
    } catch (invoiceError) {
      console.error("Error sending invoice email:", invoiceError);
    }

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
      to: ["info@faithandharmonyllc.com"],
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
