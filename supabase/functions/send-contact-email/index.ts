import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Faith & Harmony Branding - consistent with all emails
const BRAND = {
  purple: "#2b0a3d",
  gold: "#dfae62",
  cream: "#eae3d9",
  companyName: "Faith & Harmony LLC",
  tagline: "Rooted in Purpose. Driven by Service.",
  email: "info@faithandharmonyllc.com",
  website: "faithandharmonyllc.com",
};

/** Escape HTML special characters to prevent XSS in email templates. */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Contact email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, subject, message }: ContactRequest = await req.json();
    
    console.log("Processing contact form submission from:", email);

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Faith & Harmony <info@faithandharmonyllc.com>",
      to: [BRAND.email],
      subject: `New Contact Form: ${esc(subject)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white;">
            <tr>
              <td style="background: linear-gradient(135deg, ${BRAND.purple} 0%, #4a1259 100%); padding: 24px; text-align: center;">
                <h1 style="color: ${BRAND.gold}; margin: 0; font-size: 22px;">New Contact Form Submission</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px;">
                <table style="border-collapse: collapse; width: 100%;">
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: ${BRAND.purple};">Name:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${esc(name)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: ${BRAND.purple};">Email:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;"><a href="mailto:${esc(email)}" style="color: ${BRAND.purple};">${esc(email)}</a></td>
                  </tr>
                  ${phone ? `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: ${BRAND.purple};">Phone:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${esc(phone)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: ${BRAND.purple};">Subject:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${esc(subject)}</td>
                  </tr>
                </table>
                <h3 style="margin-top: 24px; color: ${BRAND.purple};">Message:</h3>
                <div style="background: ${BRAND.cream}; padding: 20px; border-radius: 8px; border-left: 4px solid ${BRAND.gold}; white-space: pre-wrap; color: #333;">${esc(message)}</div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Admin notification sent:", adminEmailResponse);

    // Send confirmation to the user
    const userEmailResponse = await resend.emails.send({
      from: "Faith & Harmony <info@faithandharmonyllc.com>",
      to: [email],
      subject: "We received your message!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, ${BRAND.purple} 0%, #4a1259 100%); padding: 32px; text-align: center;">
                <h1 style="color: ${BRAND.gold}; margin: 0; font-size: 26px; font-weight: 700;">${BRAND.companyName}</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 13px; font-style: italic;">${BRAND.tagline}</p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 32px;">
                <h2 style="color: ${BRAND.purple}; margin: 0 0 20px 0;">Thank you for reaching out, ${esc(name)}!</h2>
                <p style="color: #333; line-height: 1.6;">We've received your message and will get back to you as soon as possible.</p>
                
                <div style="background: ${BRAND.cream}; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${BRAND.gold};">
                  <h3 style="margin: 0 0 12px 0; color: ${BRAND.purple};">Your message:</h3>
                  <p style="color: #666; margin: 0 0 8px 0;"><strong>Subject:</strong> ${esc(subject)}</p>
                  <p style="white-space: pre-wrap; color: #333; margin: 0;">${esc(message)}</p>
                </div>
                
                <p style="color: #333; line-height: 1.6;">
                  In the meantime, feel free to explore our <a href="https://${BRAND.website}/services" style="color: ${BRAND.gold}; font-weight: 600;">services</a>.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                
                <p style="color: #666; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: ${BRAND.purple};">The Faith & Harmony Team</strong>
                </p>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: ${BRAND.purple}; padding: 24px; text-align: center;">
                <p style="color: ${BRAND.gold}; font-size: 14px; font-weight: 600; margin: 0;">${BRAND.companyName}</p>
                <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 8px 0 0 0;">
                  <a href="https://${BRAND.website}" style="color: ${BRAND.gold}; text-decoration: none;">${BRAND.website}</a>
                </p>
                <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 12px 0 0 0;">
                  © ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("User confirmation sent:", userEmailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
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
