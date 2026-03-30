// Notification Email Edge Function
// Triggered by Postgres trigger on notifications table INSERT (via pg_net)
// Sends branded email to the notification recipient so they know to check the app.
//
// Auth: Service role key (called from pg_net trigger, not user-facing)
// Method: POST only

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const BRAND = {
  purple: "#2b0a3d",
  gold: "#dfae62",
  cream: "#eae3d9",
  companyName: "Faith & Harmony LLC",
  tagline: "Rooted in Purpose. Driven by Service.",
  email: "info@faithandharmonyllc.com",
  website: "faithandharmonyllc.com",
  adminEmail: "info@faithandharmonyllc.com",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  notification_id: string;
  user_email: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
}

function buildEmailHtml(payload: NotificationPayload): string {
  const linkButton = payload.link
    ? `<p style="text-align: center; margin-top: 24px;">
        <a href="https://${BRAND.website}${payload.link}"
           style="background: linear-gradient(135deg, ${BRAND.gold} 0%, #c9973e 100%); color: ${BRAND.purple}; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
          View Details
        </a>
      </p>`
    : "";

  const typeLabel: Record<string, string> = {
    message: "New Message",
    "ticket-update": "Ticket Update",
    system: "System Alert",
    voice_order: "New Voice Order",
  };

  const heading = typeLabel[payload.type] || "Notification";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white;">
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.purple} 0%, #4a1259 100%); padding: 24px; text-align: center;">
        <h1 style="color: ${BRAND.gold}; margin: 0; font-size: 22px;">${heading}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <h2 style="color: ${BRAND.purple}; margin: 0 0 12px 0; font-size: 18px;">${payload.title}</h2>
        <div style="background: ${BRAND.cream}; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${BRAND.gold};">
          <p style="margin: 0; white-space: pre-wrap; color: #333;">${payload.body}</p>
        </div>
        ${linkButton}
        <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
          This is an automated notification from ${BRAND.companyName}.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: ${BRAND.purple}; padding: 16px; text-align: center;">
        <p style="color: ${BRAND.gold}; font-size: 13px; font-weight: 600; margin: 0;">${BRAND.companyName}</p>
        <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 6px 0 0 0;">
          <a href="https://${BRAND.website}" style="color: ${BRAND.gold}; text-decoration: none;">${BRAND.website}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Notification email request:", payload.notification_id, payload.type);

    // Normalize recipient. Some notification sources use admin@faithandharmonyllc.com
    // but the real inbox is info@faithandharmonyllc.com.
    let recipient = payload.user_email || BRAND.adminEmail;
    if (recipient === "admin@faithandharmonyllc.com") {
      recipient = BRAND.adminEmail;
    }

    const subjectPrefix: Record<string, string> = {
      message: "New Message",
      "ticket-update": "Ticket Update",
      system: "System Alert",
      voice_order: "Voice Order Received",
    };
    const prefix = subjectPrefix[payload.type] || "Notification";
    const subject = `${prefix}: ${payload.title}`;

    const emailResponse = await resend.emails.send({
      from: `Faith & Harmony <${BRAND.email}>`,
      to: [recipient],
      subject,
      html: buildEmailHtml(payload),
    });

    console.log("Notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Notification email error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
