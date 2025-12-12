import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      emailTo = "contact@faithandharmony.com";
      emailSubject = `New Message: ${body.subject}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Message Received</h2>
          <p><strong>From:</strong> ${body.sender_name} (${body.sender_email})</p>
          <p><strong>Subject:</strong> ${body.subject}</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${body.content}</p>
          </div>
          <p>
            <a href="https://faithandharmony.com/admin/messages?conversation=${body.conversation_id}" 
               style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View & Reply
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated notification from Faith & Harmony Mission Control.
          </p>
        </div>
      `;
    } else if (body.type === "admin_reply") {
      // Notify user about admin's reply
      emailTo = body.recipient_email || body.sender_email;
      emailSubject = `Re: ${body.subject} - Faith & Harmony`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You Have a New Message</h2>
          <p>Hello ${body.sender_name},</p>
          <p>We have responded to your message regarding "${body.subject}".</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${body.content}</p>
          </div>
          <p>
            <a href="https://faithandharmony.com/messages" 
               style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Full Conversation
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Faith & Harmony LLC<br>
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `;
    } else {
      throw new Error("Unknown notification type");
    }

    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <notifications@resend.dev>",
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
