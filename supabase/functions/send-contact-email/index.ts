import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Contact email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, subject, message }: ContactRequest = await req.json();
    
    console.log("Processing contact form submission from:", email);

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: ["info@faithandharmonyllc.com"],
      subject: `New Contact Form: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${phone}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${subject}</td>
          </tr>
        </table>
        <h3 style="margin-top: 20px;">Message:</h3>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${message}</div>
      `,
    });

    console.log("Admin notification sent:", adminEmailResponse);

    // Send confirmation to the user
    const userEmailResponse = await resend.emails.send({
      from: "Faith & Harmony <onboarding@resend.dev>",
      to: [email],
      subject: "We received your message!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a365d;">Thank you for reaching out, ${name}!</h1>
          <p>We've received your message and will get back to you as soon as possible.</p>
          <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your message:</h3>
            <p><strong>Subject:</strong> ${subject}</p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p>In the meantime, feel free to explore our <a href="https://faithandharmony.com/services">services</a>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>Faith & Harmony LLC</strong>
          </p>
        </div>
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
