import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceRequestEmailData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  preferredContactMethod: string;
  serviceName: string;
  projectTitle?: string;
  projectDescription: string;
  budgetRange?: string;
  targetStartDate?: string;
  targetEndDate?: string;
  metadata?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ServiceRequestEmailData = await req.json();
    console.log("Sending service request emails for:", data.clientEmail);

    // Format metadata for display
    const formatMetadata = (metadata: Record<string, any> | undefined): string => {
      if (!metadata || Object.keys(metadata).length === 0) return "No additional details provided";
      
      return Object.entries(metadata)
        .filter(([_, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
          return `<li><strong>${formattedKey}:</strong> ${formattedValue}</li>`;
        })
        .join('');
    };

    // Send confirmation to client
    const clientEmailResult = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: [data.clientEmail],
      subject: `We Received Your Service Request - ${data.serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2b0a3d; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2b0a3d; color: #dfae62; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #fff; padding: 30px; border: 1px solid #eae3d9; }
            .highlight { background: #eae3d9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #eae3d9; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
            .gold { color: #dfae62; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Faith & Harmony LLC</h1>
              <p class="gold">Rooted in Purpose, Driven by Service</p>
            </div>
            <div class="content">
              <h2>Thank you, ${data.clientName}!</h2>
              <p>We've received your request for <strong>${data.serviceName}</strong> and are excited to learn more about your project.</p>
              
              <div class="highlight">
                <h3 style="margin-top: 0;">What Happens Next?</h3>
                <ol>
                  <li>We'll review your request within 24-48 hours</li>
                  <li>We'll reach out via your preferred method: <strong>${data.preferredContactMethod}</strong></li>
                  <li>We'll schedule a discovery call to discuss your project in detail</li>
                </ol>
              </div>

              <h3>Your Request Summary:</h3>
              <ul>
                <li><strong>Service:</strong> ${data.serviceName}</li>
                ${data.projectTitle ? `<li><strong>Project Title:</strong> ${data.projectTitle}</li>` : ''}
                ${data.budgetRange ? `<li><strong>Budget Range:</strong> ${data.budgetRange}</li>` : ''}
                ${data.targetStartDate ? `<li><strong>Target Start:</strong> ${data.targetStartDate}</li>` : ''}
              </ul>

              <p>If you have any questions before we reach out, feel free to reply to this email or call us at <strong>(760) 575-4876</strong>.</p>
              
              <p>Best regards,<br><strong>Dr. Adam Pierce</strong><br>Faith & Harmony LLC</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
              <p>dradamopierce@gmail.com | (760) 575-4876</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Client email sent:", clientEmailResult);

    // Send notification to admin
    const adminEmailResult = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: ["dradamopierce@gmail.com"],
      subject: `🔔 New Service Request: ${data.serviceName} from ${data.clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: #2b0a3d; color: #dfae62; padding: 20px; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .section { margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .section:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #2b0a3d; }
            .value { margin-top: 5px; }
            .highlight { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #dfae62; }
            ul { margin: 10px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Service Request</h1>
            </div>
            <div class="content">
              <div class="section">
                <h2>Contact Information</h2>
                <p><span class="label">Name:</span> ${data.clientName}</p>
                <p><span class="label">Email:</span> <a href="mailto:${data.clientEmail}">${data.clientEmail}</a></p>
                <p><span class="label">Phone:</span> <a href="tel:${data.clientPhone}">${data.clientPhone}</a></p>
                <p><span class="label">Preferred Contact:</span> ${data.preferredContactMethod}</p>
              </div>

              <div class="section">
                <h2>Service Details</h2>
                <p><span class="label">Service:</span> ${data.serviceName}</p>
                ${data.projectTitle ? `<p><span class="label">Project Title:</span> ${data.projectTitle}</p>` : ''}
                <div class="highlight">
                  <p class="label">Project Description:</p>
                  <p>${data.projectDescription}</p>
                </div>
              </div>

              <div class="section">
                <h2>Timeline & Budget</h2>
                <p><span class="label">Budget Range:</span> ${data.budgetRange || 'Not specified'}</p>
                <p><span class="label">Target Start:</span> ${data.targetStartDate || 'Not specified'}</p>
                <p><span class="label">Target Completion:</span> ${data.targetEndDate || 'Not specified'}</p>
              </div>

              ${data.metadata && Object.keys(data.metadata).length > 0 ? `
              <div class="section">
                <h2>Service-Specific Details</h2>
                <ul>
                  ${formatMetadata(data.metadata)}
                </ul>
              </div>
              ` : ''}
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Admin email sent:", adminEmailResult);

    return new Response(
      JSON.stringify({ success: true, clientEmail: clientEmailResult, adminEmail: adminEmailResult }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending emails:", error);
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
