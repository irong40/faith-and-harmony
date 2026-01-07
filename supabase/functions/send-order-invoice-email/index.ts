import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { jsPDF } from "npm:jspdf@2.5.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Faith & Harmony Branding
const BRAND = {
  purple: "#3B1F4D",
  gold: "#D4AF37",
  cream: "#FFFEF7",
  companyName: "Faith & Harmony, LLC",
  tagline: "Rooted in Purpose. Driven by Service.",
  email: "faithandharmonyllc@gmail.com",
  phone: "(Your Phone)",
  website: "faithandharmony.com",
};

interface OrderItem {
  product_name: string;
  product_color?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceData {
  type: "invoice" | "receipt";
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_zip?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
}

function generatePDF(data: InvoiceData): string {
  const doc = new jsPDF();
  const isReceipt = data.type === "receipt";
  const documentTitle = isReceipt ? "RECEIPT" : "INVOICE";
  const invoiceNumber = data.order_id.slice(0, 8).toUpperCase();
  
  // Page setup
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header bar with purple background
  doc.setFillColor(59, 31, 77); // #3B1F4D
  doc.rect(0, 0, pageWidth, 45, "F");

  // Company name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND.companyName, margin, 20);

  // Tagline
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(BRAND.tagline, margin, 28);

  // Document type (Invoice/Receipt)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(212, 175, 55); // Gold
  doc.text(documentTitle, pageWidth - margin, 20, { align: "right" });

  // Invoice number
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(`#${invoiceNumber}`, pageWidth - margin, 28, { align: "right" });

  y = 60;

  // Reset text color to dark
  doc.setTextColor(59, 31, 77);

  // Date and Due Date
  doc.setFontSize(10);
  const orderDate = new Date(data.created_at);
  const dueDate = new Date(orderDate);
  dueDate.setDate(dueDate.getDate() + 14);
  
  doc.setFont("helvetica", "bold");
  doc.text("Date:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(orderDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), margin + 25, y);
  
  if (!isReceipt) {
    doc.setFont("helvetica", "bold");
    doc.text("Due Date:", margin + 80, y);
    doc.setFont("helvetica", "normal");
    doc.text(dueDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), margin + 105, y);
  }

  y += 15;

  // Bill To section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill To:", margin, y);
  y += 6;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.customer_name, margin, y);
  y += 5;
  
  if (data.customer_address) {
    doc.text(data.customer_address, margin, y);
    y += 5;
  }
  
  if (data.customer_city || data.customer_state || data.customer_zip) {
    const cityStateZip = [
      data.customer_city,
      data.customer_state,
      data.customer_zip,
    ].filter(Boolean).join(", ");
    doc.text(cityStateZip, margin, y);
    y += 5;
  }
  
  doc.text(data.customer_email, margin, y);
  y += 15;

  // If receipt, show PAID stamp
  if (isReceipt) {
    doc.setTextColor(34, 197, 94); // Green
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth - margin - 30, 75);
    doc.setTextColor(59, 31, 77);
  }

  // Items table header
  const tableStartY = y;
  const colWidths = { item: 80, qty: 25, price: 35, total: 35 };
  const tableWidth = colWidths.item + colWidths.qty + colWidths.price + colWidths.total;
  
  // Table header background
  doc.setFillColor(59, 31, 77);
  doc.rect(margin, y - 5, tableWidth, 10, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  
  let x = margin + 3;
  doc.text("Item", x, y + 1);
  x += colWidths.item;
  doc.text("Qty", x, y + 1);
  x += colWidths.qty;
  doc.text("Price", x, y + 1);
  x += colWidths.price;
  doc.text("Total", x, y + 1);
  
  y += 10;

  // Table rows
  doc.setTextColor(59, 31, 77);
  doc.setFont("helvetica", "normal");
  
  data.items.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 4, tableWidth, 8, "F");
    }
    
    x = margin + 3;
    const itemName = item.product_color 
      ? `${item.product_name} - ${item.product_color}` 
      : item.product_name;
    
    // Truncate long names
    const truncatedName = itemName.length > 35 ? itemName.substring(0, 32) + "..." : itemName;
    doc.text(truncatedName, x, y);
    x += colWidths.item;
    doc.text(item.quantity.toString(), x, y);
    x += colWidths.qty;
    doc.text(`$${item.unit_price.toFixed(2)}`, x, y);
    x += colWidths.price;
    doc.text(`$${item.total_price.toFixed(2)}`, x, y);
    
    y += 8;
  });

  // Draw table border
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, tableStartY - 5, tableWidth, y - tableStartY + 5);

  y += 10;

  // Totals section
  const totalsX = margin + colWidths.item + colWidths.qty;
  
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, y);
  doc.text(`$${data.subtotal.toFixed(2)}`, totalsX + colWidths.price + colWidths.total - 3, y, { align: "right" });
  y += 6;
  
  doc.text("Shipping:", totalsX, y);
  doc.text(`$${data.shipping.toFixed(2)}`, totalsX + colWidths.price + colWidths.total - 3, y, { align: "right" });
  y += 8;
  
  // Total with gold accent
  doc.setFillColor(212, 175, 55);
  doc.rect(totalsX - 3, y - 5, colWidths.price + colWidths.total + 3, 10, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(59, 31, 77);
  doc.text("TOTAL:", totalsX, y + 1);
  doc.text(`$${data.total.toFixed(2)}`, totalsX + colWidths.price + colWidths.total - 3, y + 1, { align: "right" });
  
  y += 20;

  // Payment instructions (only for invoice)
  if (!isReceipt) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 31, 77);
    doc.text("Payment Options:", margin, y);
    y += 6;
    
    doc.setFont("helvetica", "normal");
    doc.text("PayPal: faithandharmonyllc@gmail.com", margin, y);
    y += 5;
    doc.text("Cash App: $FaithandHarmony", margin, y);
    y += 5;
    doc.text("Please include invoice number in payment reference.", margin, y);
  }

  // Footer bar
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFillColor(59, 31, 77);
  doc.rect(0, footerY - 5, pageWidth, 25, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", pageWidth / 2, footerY + 2, { align: "center" });
  doc.setFontSize(8);
  doc.text(`${BRAND.email} | ${BRAND.website}`, pageWidth / 2, footerY + 8, { align: "center" });

  // Return as base64
  return doc.output("datauristring").split(",")[1];
}

function formatOrderItemsHtml(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            ${item.product_name}${item.product_color ? ` - ${item.product_color}` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unit_price.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total_price.toFixed(2)}</td>
        </tr>`
    )
    .join("");
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send order invoice email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: InvoiceData = await req.json();
    console.log("Received invoice data:", {
      type: data.type,
      orderId: data.order_id,
      customerEmail: data.customer_email,
      itemCount: data.items.length,
    });

    const isReceipt = data.type === "receipt";
    const documentType = isReceipt ? "Receipt" : "Invoice";
    const invoiceNumber = data.order_id.slice(0, 8).toUpperCase();

    // Generate PDF
    console.log("Generating PDF...");
    const pdfBase64 = generatePDF(data);
    console.log("PDF generated successfully");

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${documentType} from Faith & Harmony</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <tr>
            <td style="background: ${BRAND.purple}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ${BRAND.companyName}
              </h1>
              <p style="color: ${BRAND.gold}; margin: 8px 0 0 0; font-size: 12px;">
                ${BRAND.tagline}
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: ${BRAND.purple}; margin: 0 0 20px 0; font-size: 22px;">
                ${isReceipt ? "Thank You for Your Order! 🎉" : "Your Invoice is Ready"}
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${data.customer_name},
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${isReceipt 
                  ? "Your payment has been received. Please find your receipt attached to this email." 
                  : "Please find your invoice attached to this email. We appreciate your business!"}
              </p>
              
              <!-- Order Info Box -->
              <div style="background-color: #f8fafc; border-left: 4px solid ${BRAND.gold}; padding: 20px; margin-bottom: 30px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 5px 0;">${documentType} Number</p>
                <p style="color: ${BRAND.purple}; font-size: 18px; font-weight: 600; margin: 0; font-family: monospace;">
                  #${invoiceNumber}
                </p>
                <p style="color: ${BRAND.purple}; font-size: 24px; font-weight: 700; margin: 10px 0 0 0;">
                  $${data.total.toFixed(2)}
                </p>
              </div>
              
              <!-- Order Summary -->
              <h3 style="color: ${BRAND.purple}; font-size: 16px; margin: 0 0 15px 0;">Order Summary</h3>
              <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: ${BRAND.purple};">
                    <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 14px; font-weight: 600;">Item</th>
                    <th style="padding: 12px; text-align: center; color: #ffffff; font-size: 14px; font-weight: 600;">Qty</th>
                    <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 14px; font-weight: 600;">Price</th>
                    <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 14px; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${formatOrderItemsHtml(data.items)}
                </tbody>
                <tfoot>
                  <tr style="background-color: ${BRAND.gold};">
                    <td colspan="3" style="padding: 15px; color: ${BRAND.purple}; font-weight: 600;">Total</td>
                    <td style="padding: 15px; text-align: right; color: ${BRAND.purple}; font-weight: 600; font-size: 18px;">
                      $${data.total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              ${!isReceipt ? `
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
              ` : ""}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.purple}; padding: 30px; text-align: center;">
              <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0;">
                Thank you for choosing ${BRAND.companyName}
              </p>
              <p style="color: ${BRAND.gold}; font-size: 12px; margin: 0;">
                ${BRAND.email} | ${BRAND.website}
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email with PDF attachment
    console.log("Sending email with PDF attachment to:", data.customer_email);
    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <orders@faithandharmonyllc.com>",
      to: [data.customer_email],
      subject: `${documentType} #${invoiceNumber} - ${BRAND.companyName}`,
      html: emailHtml,
      attachments: [
        {
          filename: `${documentType}-${invoiceNumber}.pdf`,
          content: pdfBase64,
          type: "application/pdf",
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-order-invoice-email function:", error);
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
