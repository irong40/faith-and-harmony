import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaitlistRequest {
  email: string;
  productName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Waitlist confirmation email request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, productName }: WaitlistRequest = await req.json();
    console.log(`Processing waitlist signup for ${email} - Product: ${productName}`);

    const emailResponse = await resend.emails.send({
      from: "Faith & Harmony <info@faithandharmonyllc.com>",
      to: [email],
      subject: `You're on the waitlist for "${productName}"!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #3B1F4D 0%, #5a3a6e 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 28px; font-weight: bold;">Faith & Harmony</h1>
                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Aerial Art Collection</p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="color: #3B1F4D; margin: 0 0 20px 0; font-size: 24px;">You're on the Waitlist! 🎨</h2>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you for your interest in our aerial art collection! You've been added to the waitlist for:
                </p>
                
                <div style="background-color: #f8f4ff; border-left: 4px solid #D4AF37; padding: 20px; margin: 20px 0;">
                  <p style="color: #3B1F4D; font-size: 18px; font-weight: bold; margin: 0;">${productName}</p>
                  <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">Premium Giclée Print • Multiple Sizes Available</p>
                </div>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                  We'll notify you the moment this beautiful piece becomes available for purchase. As a waitlist member, you'll also get:
                </p>
                
                <ul style="color: #333333; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                  <li><strong>Early access</strong> before the general public</li>
                  <li><strong>Exclusive preview</strong> of new aerial artwork</li>
                  <li><strong>Special launch pricing</strong> for waitlist members</li>
                </ul>
                
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                  In the meantime, explore our <a href="https://faithandharmony.com/gallery/aerial-art" style="color: #D4AF37;">Aerial Art Gallery</a> to see more of our transformations.
                </p>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #3B1F4D; padding: 30px; text-align: center;">
                <p style="color: #D4AF37; font-size: 16px; font-weight: bold; margin: 0;">Faith & Harmony LLC</p>
                <p style="color: #ffffff; font-size: 12px; margin: 10px 0 0 0; opacity: 0.8;">
                  Empowering Communities Through Technology, Storytelling, and Service
                </p>
                <p style="color: #ffffff; font-size: 11px; margin: 20px 0 0 0; opacity: 0.6;">
                  You received this email because you signed up for our aerial art waitlist.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Waitlist confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending waitlist confirmation:", error);
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
