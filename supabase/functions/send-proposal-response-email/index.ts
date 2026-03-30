import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// SAI Brand constants (matches sentinel-landing)
const SAI = {
  name: "Sentinel Aerial Inspections",
  tagline: "Professional Drone Services",
  email: "info@sentinelaerialinspections.com",
  website: "sentinelaerialinspections.com",
  orange: "#e85d26",
  orangeDark: "#c44a1a",
  dark950: "#0a0a0a",
  dark900: "#0f0f0f",
  dark800: "#1a1a1a",
  cream: "#f0ebe4",
  creamDim: "#d9d0c4",
};

interface ProposalResponseRequest {
  action: 'approved' | 'declined' | 'revision_requested';
  proposal: {
    proposal_number: string;
    title: string;
    total: number;
    approval_token: string;
  };
  client: {
    name: string;
    email: string;
  };
  customerNotes?: string;
}

const getActionDetails = (action: string) => {
  switch (action) {
    case 'approved':
      return {
        emoji: '✅',
        label: 'Approved',
        color: '#22c55e',
        adminSubject: 'Proposal Approved',
        customerSubject: 'Your Proposal Has Been Approved',
        customerMessage: 'Thank you for approving our proposal! We\'re excited to get started on your project.',
        nextSteps: 'We\'ll be in touch within 24 hours to discuss the next steps and get your project underway.',
      };
    case 'declined':
      return {
        emoji: '❌',
        label: 'Declined',
        color: '#ef4444',
        adminSubject: 'Proposal Declined',
        customerSubject: 'Proposal Response Received',
        customerMessage: 'We\'ve received your response regarding our proposal.',
        nextSteps: 'Thank you for considering us. If your needs change in the future, we\'d be happy to help. Feel free to reach out anytime.',
      };
    case 'revision_requested':
      return {
        emoji: '📝',
        label: 'Revision Requested',
        color: '#f59e0b',
        adminSubject: 'Proposal Revision Requested',
        customerSubject: 'Your Revision Request Has Been Received',
        customerMessage: 'We\'ve received your request for changes to the proposal.',
        nextSteps: 'Our team will review your feedback and send an updated proposal within 48 hours.',
      };
    default:
      return {
        emoji: '📋',
        label: 'Updated',
        color: '#6b7280',
        adminSubject: 'Proposal Update',
        customerSubject: 'Proposal Update',
        customerMessage: 'Your proposal status has been updated.',
        nextSteps: 'We\'ll be in touch soon.',
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, proposal, client, customerNotes }: ProposalResponseRequest = await req.json();

    console.log("Processing proposal response email:", { action, proposal: proposal.proposal_number, client: client.name });

    const actionDetails = getActionDetails(action);
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    // Send admin notification email
    const adminHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: ${SAI.dark950}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: ${SAI.orange}; margin: 0; font-size: 24px;">${SAI.name}</h1>
              <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 14px;">Proposal Response Notification</p>
            </div>

            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">${actionDetails.emoji}</span>
                <h2 style="color: ${actionDetails.color}; margin: 12px 0 0 0;">${actionDetails.adminSubject}</h2>
              </div>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #374151;">Proposal Details</h3>
                <p style="margin: 6px 0; color: #6b7280;"><strong>Number:</strong> ${proposal.proposal_number}</p>
                <p style="margin: 6px 0; color: #6b7280;"><strong>Title:</strong> ${proposal.title}</p>
                <p style="margin: 6px 0; color: #6b7280;"><strong>Total:</strong> $${(proposal.total ?? 0).toLocaleString()}</p>
              </div>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #374151;">Client Information</h3>
                <p style="margin: 6px 0; color: #6b7280;"><strong>Name:</strong> ${client.name}</p>
                <p style="margin: 6px 0; color: #6b7280;"><strong>Email:</strong> ${client.email}</p>
              </div>

              ${customerNotes ? `
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; color: #92400e;">Customer Notes</h3>
                <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${customerNotes}</p>
              </div>
              ` : ''}

              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                Action taken on ${timestamp}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send customer confirmation email
    const customerHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: ${SAI.dark950}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: ${SAI.orange}; margin: 0; font-size: 24px;">${SAI.name}</h1>
              <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 14px;">${SAI.tagline}</p>
            </div>

            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin: 0 0 16px 0;">Hello ${client.name},</h2>

              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
                ${actionDetails.customerMessage}
              </p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #6b7280;"><strong>Proposal:</strong> ${proposal.proposal_number}</p>
                <p style="margin: 0; color: #6b7280;"><strong>Project:</strong> ${proposal.title}</p>
              </div>

              <div style="background-color: ${actionDetails.color}15; padding: 20px; border-radius: 8px; border-left: 4px solid ${actionDetails.color}; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; color: #1f2937;">Next Steps</h3>
                <p style="margin: 0; color: #4b5563;">${actionDetails.nextSteps}</p>
              </div>

              <p style="color: #4b5563; line-height: 1.6;">
                If you have any questions, please don't hesitate to reach out.
              </p>

              <p style="color: #4b5563; margin-top: 24px;">
                Best regards,<br>
                <strong>The ${SAI.name} Team</strong>
              </p>
            </div>

            <div style="text-align: center; padding: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ${SAI.name} | ${SAI.email}
              </p>
              <p style="color: #d1d5db; font-size: 11px; margin: 8px 0 0 0;">
                \u00a9 ${new Date().getFullYear()} ${SAI.name}. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send admin notification
    const adminEmailResponse = await resend.emails.send({
      from: `Sentinel Aerial Inspections <${SAI.email}>`,
      to: [SAI.email],
      subject: `${actionDetails.emoji} ${actionDetails.adminSubject} - ${proposal.proposal_number}`,
      html: adminHtml,
    });

    console.log("Admin notification sent:", adminEmailResponse);

    // Send customer confirmation
    const customerEmailResponse = await resend.emails.send({
      from: `Sentinel Aerial Inspections <${SAI.email}>`,
      to: [client.email],
      subject: `${actionDetails.customerSubject} - ${proposal.proposal_number}`,
      html: customerHtml,
    });

    console.log("Customer confirmation sent:", customerEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        adminEmail: adminEmailResponse,
        customerEmail: customerEmailResponse
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-proposal-response-email:", error);
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
