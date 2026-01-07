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
  website: "faithandharmony.com",
};

interface NotificationRequest {
  type: "new_user_message" | "admin_reply";
  conversation_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  subject: string;
  recipient_email?: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("Send message notification called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NotificationRequest = await req.json();
    console.log("Notification request:", body);

    let emailTo: string;
    let emailSubject: string;
    let emailHtml: string;

    if (body.type === "new_user_message") {
      // Notify admin about new message from user
      emailTo = BRAND.email;
      emailSubject = `New Message: ${body.subject}`;
      emailHtml = `
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
                <h1 style="color: ${BRAND.gold}; margin: 0; font-size: 22px;">New Message Received</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px;">
                <p style="color: #333;"><strong style="color: ${BRAND.purple};">From:</strong> ${body.sender_name} (${body.sender_email})</p>
                <p style="color: #333;"><strong style="color: ${BRAND.purple};">Subject:</strong> ${body.subject}</p>
                <div style="background: ${BRAND.cream}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND.gold};">
                  <p style="margin: 0; white-space: pre-wrap; color: #333;">${body.content}</p>
                </div>
                <p style="text-align: center;">
                  <a href="https://${BRAND.website}/admin/messages?conversation=${body.conversation_id}" 
                     style="background: linear-gradient(135deg, ${BRAND.gold} 0%, #c9973e 100%); color: ${BRAND.purple}; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                    View & Reply
                  </a>
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
                  This is an automated notification from ${BRAND.companyName}.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    } else if (body.type === "admin_reply") {
      // Notify user about admin's reply
      emailTo = body.recipient_email || body.sender_email;
      emailSubject = `Re: ${body.subject} - Faith & Harmony`;
      emailHtml = `
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
                <h2 style="color: ${BRAND.purple}; margin: 0 0 16px 0;">You Have a New Message</h2>
                <p style="color: #333; line-height: 1.6;">Hello ${body.sender_name},</p>
                <p style="color: #333; line-height: 1.6;">We have responded to your message regarding "${body.subject}".</p>
                
                <div style="background: ${BRAND.cream}; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${BRAND.gold};">
                  <p style="margin: 0; white-space: pre-wrap; color: #333;">${body.content}</p>
                </div>
                
                <p style="text-align: center;">
                  <a href="https://${BRAND.website}/messages" 
                     style="background: linear-gradient(135deg, ${BRAND.gold} 0%, #c9973e 100%); color: ${BRAND.purple}; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                    View Full Conversation
                  </a>
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
                  This is an automated notification. Please do not reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    } else {
      throw new Error("Unknown notification type");
    }

    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <info@faithandharmonyllc.com>",
      to: [emailTo],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Send message notification error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
