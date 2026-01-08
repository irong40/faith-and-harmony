import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Status configuration with email templates
const statusConfig: Record<string, {
  subject: string;
  heading: string;
  message: string;
  showCta: boolean;
  ctaText?: string;
}> = {
  kickoff: {
    subject: "Your {service} Project Has Begun",
    heading: "Let's Get Started! 🚀",
    message: "We're excited to begin work on your project. Our team is reviewing the scope and will be in touch shortly with next steps.",
    showCta: false,
  },
  in_progress: {
    subject: "Update on Your {service} Project",
    heading: "Work in Progress 🔧",
    message: "Great news! Active work is underway on your project. We're making progress and will keep you updated as we hit key milestones.",
    showCta: false,
  },
  review: {
    subject: "Your {service} Deliverables Are Ready for Review",
    heading: "Ready for Your Review 👀",
    message: "We've completed the initial deliverables and they're ready for your review. Please take a look and let us know if you have any feedback or requested changes.",
    showCta: true,
    ctaText: "Review Deliverables",
  },
  revision: {
    subject: "We've Received Your Feedback",
    heading: "Revisions Underway 📝",
    message: "Thank you for your feedback! We're working on the requested changes and will have the updated deliverables ready for you soon.",
    showCta: false,
  },
  complete: {
    subject: "Your {service} Project Is Complete",
    heading: "Project Complete! 🎉",
    message: "Congratulations! Your project has been completed. All final deliverables have been prepared and are ready for you. Thank you for choosing Faith & Harmony!",
    showCta: false,
  },
  on_hold: {
    subject: "Your Project Has Been Paused",
    heading: "Project On Hold ⏸️",
    message: "Your project has been temporarily paused. If you have any questions or would like to resume work, please don't hesitate to reach out.",
    showCta: false,
  },
  cancelled: {
    subject: "Project Cancellation Confirmation",
    heading: "Project Cancelled",
    message: "As requested, your project has been cancelled. If this was in error or you'd like to restart the project, please contact us.",
    showCta: false,
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, newStatus, customMessage } = await req.json();

    if (!projectId || !newStatus) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or newStatus" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const config = statusConfig[newStatus];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown status: ${newStatus}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project with customer and service details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        customer:customers(name, email, company_name),
        service:services(name, code),
        proposal:proposals(proposal_number, total)
      `)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Error fetching project:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const customerEmail = project.customer?.email;
    const customerName = project.customer?.name || "Valued Customer";
    const serviceName = project.service?.name || "Service";

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "No customer email found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Replace placeholders in subject
    const subject = config.subject.replace("{service}", serviceName);
    const message = customMessage || config.message;

    // Generate email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
              Faith & Harmony
            </h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">
              Project Update
            </p>
          </div>
          
          <!-- Content -->
          <div style="background: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1e3a5f; margin: 0 0 8px 0; font-size: 28px;">
              ${config.heading}
            </h2>
            
            <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">
              Project: <strong style="color: #1e3a5f;">${project.title}</strong> (#${project.project_number})
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi ${customerName.split(' ')[0]},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${message}
            </p>
            
            <!-- Project Details -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #1e3a5f; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
                Project Details
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Service</td>
                  <td style="padding: 8px 0; color: #1e3a5f; font-size: 14px; text-align: right; font-weight: 500;">${serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Project Number</td>
                  <td style="padding: 8px 0; color: #1e3a5f; font-size: 14px; text-align: right; font-weight: 500;">${project.project_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Status</td>
                  <td style="padding: 8px 0; color: #1e3a5f; font-size: 14px; text-align: right; font-weight: 500; text-transform: capitalize;">${newStatus.replace('_', ' ')}</td>
                </tr>
              </table>
            </div>
            
            ${config.showCta ? `
            <div style="text-align: center; margin: 32px 0;">
              <a href="mailto:info@faithandharmonyllc.com?subject=Re: ${project.project_number}" 
                 style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #1e3a5f; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ${config.ctaText}
              </a>
            </div>
            ` : ''}
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
              If you have any questions, feel free to reply to this email or contact us at 
              <a href="mailto:info@faithandharmonyllc.com" style="color: #d4af37; text-decoration: none;">info@faithandharmonyllc.com</a>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 24px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Faith & Harmony, LLC<br>
              Virginia Beach, VA<br>
              info@faithandharmonyllc.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    console.log(`Sending ${newStatus} email to ${customerEmail} for project ${project.project_number}`);
    
    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <projects@faithandharmonyllc.com>",
      to: [customerEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update project status
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'complete') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId);

    if (updateError) {
      console.error("Error updating project status:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-project-status-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
