import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProposalEmailRequest {
  proposal: {
    proposal_number: string;
    title: string;
    total: number;
    valid_until: string;
    approval_token: string;
  };
  client: {
    name: string;
    email: string;
    company_name?: string;
  };
  deliverables: Array<{ name: string; description: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposal, client, deliverables }: ProposalEmailRequest = await req.json();
    
    const proposalUrl = `${req.headers.get("origin") || "https://faithandharmonyllc.com"}/proposal/${proposal.approval_token}`;
    
    const deliverablesHtml = deliverables
      .map(d => `<li style="margin-bottom: 8px;"><strong>${d.name}</strong>: ${d.description}</li>`)
      .join("");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2b0a3d 0%, #4a1259 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #dfae62; margin: 0; font-size: 28px; font-weight: 700;">Faith & Harmony LLC</h1>
              <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Technology & Creative Services</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #2b0a3d; margin: 0 0 20px; font-size: 24px;">Your Proposal is Ready</h2>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear ${client.name},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Thank you for your interest in working with Faith & Harmony LLC. We're excited to present our proposal for your project.
              </p>
              
              <!-- Proposal Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f4fc; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 8px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Proposal</p>
                    <h3 style="margin: 0 0 15px; color: #2b0a3d; font-size: 20px;">${proposal.title}</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #666; font-size: 14px; padding: 5px 0;">Proposal #:</td>
                        <td style="color: #333; font-size: 14px; padding: 5px 0; text-align: right; font-weight: 600;">${proposal.proposal_number}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; font-size: 14px; padding: 5px 0;">Total:</td>
                        <td style="color: #2b0a3d; font-size: 18px; padding: 5px 0; text-align: right; font-weight: 700;">$${proposal.total.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; font-size: 14px; padding: 5px 0;">Valid Until:</td>
                        <td style="color: #333; font-size: 14px; padding: 5px 0; text-align: right;">${new Date(proposal.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Deliverables -->
              <h4 style="color: #2b0a3d; margin: 25px 0 15px; font-size: 16px;">What's Included:</h4>
              <ul style="color: #333; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0 0 25px;">
                ${deliverablesHtml}
              </ul>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${proposalUrl}" style="display: inline-block; background: linear-gradient(135deg, #dfae62 0%, #c9973e 100%); color: #2b0a3d; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">View Full Proposal</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                Click the button above to view the complete proposal, including detailed scope of work, terms, and approval options.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #2b0a3d; padding: 30px 40px; text-align: center;">
              <p style="color: #dfae62; margin: 0 0 10px; font-size: 14px; font-weight: 600;">Faith & Harmony LLC</p>
              <p style="color: #ffffff; margin: 0 0 5px; font-size: 12px; opacity: 0.8;">info@faithandharmonyllc.com</p>
              <p style="color: #ffffff; margin: 0; font-size: 12px; opacity: 0.6;">© ${new Date().getFullYear()} Faith & Harmony LLC. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <info@faithandharmonyllc.com>",
      to: [client.email],
      subject: `Your Proposal: ${proposal.title} (${proposal.proposal_number})`,
      html: emailHtml,
    });

    console.log("Proposal email sent:", emailResponse);

    // Also send notification to admin
    await resend.emails.send({
      from: "Faith & Harmony <info@faithandharmonyllc.com>",
      to: ["info@faithandharmonyllc.com"],
      subject: `Proposal Sent: ${proposal.proposal_number} - ${client.name}`,
      html: `
        <h2>Proposal Sent</h2>
        <p><strong>Proposal:</strong> ${proposal.proposal_number}</p>
        <p><strong>Client:</strong> ${client.name} (${client.email})</p>
        <p><strong>Title:</strong> ${proposal.title}</p>
        <p><strong>Total:</strong> $${proposal.total.toLocaleString()}</p>
        <p><strong>Valid Until:</strong> ${proposal.valid_until}</p>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending proposal email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
