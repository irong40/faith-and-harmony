import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serviceRequest, serviceName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a professional business proposal writer for Faith & Harmony LLC, a technology and creative services company. Generate a professional proposal based on the following service request:

Service Type: ${serviceName}
Client Name: ${serviceRequest.client_name}
Company: ${serviceRequest.company_name || "N/A"}
Project Title: ${serviceRequest.project_title || "Untitled Project"}
Project Description: ${serviceRequest.project_description}
Budget Range: ${serviceRequest.budget_range || "To be determined"}
Timeline: ${serviceRequest.target_start_date ? `Start: ${serviceRequest.target_start_date}` : ""} ${serviceRequest.target_end_date ? `End: ${serviceRequest.target_end_date}` : ""}

Additional Details: ${JSON.stringify(serviceRequest.metadata || {})}

Generate a JSON response with the following structure:
{
  "title": "Professional proposal title",
  "scope_of_work": "Detailed scope of work paragraph (2-3 paragraphs)",
  "deliverables": [
    { "name": "Deliverable name", "description": "Brief description" }
  ],
  "pricing_items": [
    { "description": "Line item description", "quantity": 1, "unit": "item", "rate": 0 }
  ],
  "terms_and_conditions": "Standard terms including payment terms, revision policy, and timeline expectations"
}

Important:
- Set rate to 0 for pricing items - the admin will set actual prices
- Include 3-6 deliverables based on the service type
- Include 3-5 pricing line items that make sense for the service
- Keep scope of work professional and detailed
- Terms should be fair and professional`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional proposal writer. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON response, handling potential markdown code blocks
    let proposalData;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      proposalData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse proposal content");
    }

    console.log("Generated proposal:", proposalData);

    return new Response(JSON.stringify(proposalData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-proposal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
