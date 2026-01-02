import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  template_code: string;
  data: Record<string, unknown>;
  filename?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get user from auth header if present
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    // GET /templates - List all active templates
    if (action === "templates" && req.method === "GET") {
      const category = url.searchParams.get("category");
      
      let query = supabase
        .from("document_templates")
        .select("id, code, name, description, category, output_format, schema, is_system")
        .eq("active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ templates: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /schema?template=xxx - Get template schema
    if (action === "schema" && req.method === "GET") {
      const templateCode = url.searchParams.get("template");
      if (!templateCode) {
        return new Response(
          JSON.stringify({ error: "template parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("document_templates")
        .select("code, name, schema, output_format, template_config")
        .eq("code", templateCode)
        .eq("active", true)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Template not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /generate - Generate a document
    if (action === "generate" && req.method === "POST") {
      const body: GenerateRequest = await req.json();
      const { template_code, data, filename } = body;

      if (!template_code) {
        return new Response(
          JSON.stringify({ error: "template_code required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get template
      const { data: template, error: templateError } = await supabase
        .from("document_templates")
        .select("*")
        .eq("code", template_code)
        .eq("active", true)
        .single();

      if (templateError || !template) {
        return new Response(
          JSON.stringify({ error: "Template not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate document content based on format
      let fileContent: Uint8Array;
      let contentType: string;
      let fileExtension: string;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const baseFilename = filename || `${template_code}-${timestamp}`;

      switch (template.output_format) {
        case "pdf":
          fileContent = await generatePDF(template, data);
          contentType = "application/pdf";
          fileExtension = "pdf";
          break;
        case "xlsx":
          fileContent = await generateXLSX(template, data);
          contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          fileExtension = "xlsx";
          break;
        case "docx":
          fileContent = await generateDOCX(template, data);
          contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          fileExtension = "docx";
          break;
        case "csv":
          fileContent = await generateCSV(template, data);
          contentType = "text/csv";
          fileExtension = "csv";
          break;
        default:
          return new Response(
            JSON.stringify({ error: `Unsupported format: ${template.output_format}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      const finalFilename = `${baseFilename}.${fileExtension}`;
      const filePath = userId 
        ? `${userId}/${finalFilename}`
        : `anonymous/${timestamp}/${finalFilename}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("generated-documents")
        .upload(filePath, fileContent, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload document: ${uploadError.message}`);
      }

      // Create signed URL for download (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("generated-documents")
        .createSignedUrl(filePath, 3600);

      if (signedUrlError) {
        throw new Error(`Failed to create download URL: ${signedUrlError.message}`);
      }

      // Log the generation
      const { data: logEntry, error: logError } = await supabase
        .from("generated_documents")
        .insert({
          template_id: template.id,
          template_code: template.code,
          user_id: userId,
          file_name: finalFilename,
          file_path: filePath,
          file_size: fileContent.length,
          output_format: template.output_format,
          input_data: data,
          metadata: {
            generated_at: new Date().toISOString(),
            template_version: template.updated_at,
          },
        })
        .select("id")
        .single();

      if (logError) {
        console.error("Log error:", logError);
      }

      console.log(`Document generated: ${finalFilename} (${fileContent.length} bytes)`);

      return new Response(
        JSON.stringify({
          success: true,
          document_id: logEntry?.id,
          filename: finalFilename,
          download_url: signedUrlData.signedUrl,
          format: template.output_format,
          size: fileContent.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /history - Get user's generated documents
    if (action === "history" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      
      let query = supabase
        .from("generated_documents")
        .select("id, template_code, file_name, output_format, file_size, created_at, download_count")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ documents: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: templates, schema, generate, or history" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Document generator error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// PDF Generation (simplified text-based PDF)
async function generatePDF(template: any, data: Record<string, unknown>): Promise<Uint8Array> {
  const config = template.template_config || {};
  const header = config.header || "Faith & Harmony LLC";
  const footer = config.footer || "";

  // Build content sections
  const lines: string[] = [];
  lines.push(header);
  lines.push("");
  lines.push(`Document: ${template.name}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push("--- Data ---");
  
  for (const [key, value] of Object.entries(data)) {
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  
  if (footer) {
    lines.push("");
    lines.push(footer);
  }

  // Create minimal PDF structure
  const content = lines.join("\n");
  const pdfContent = createMinimalPDF(content);
  return new TextEncoder().encode(pdfContent);
}

function createMinimalPDF(text: string): string {
  const escapedText = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines = escapedText.split("\n");
  const textContent = lines.map((line, i) => `BT /F1 12 Tf 50 ${750 - i * 20} Td (${line}) Tj ET`).join("\n");
  
  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${textContent.length} >> stream
${textContent}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${350 + textContent.length}
%%EOF`;
  return pdf;
}

// XLSX Generation (simplified CSV-like structure for now)
async function generateXLSX(template: any, data: Record<string, unknown>): Promise<Uint8Array> {
  // For simplicity, generate CSV content that can be opened in Excel
  // In production, you'd use a proper XLSX library
  const rows: string[] = [];
  
  rows.push("Field,Value");
  rows.push(`Template,${template.name}`);
  rows.push(`Generated,${new Date().toISOString()}`);
  rows.push("");
  
  for (const [key, value] of Object.entries(data)) {
    const safeValue = String(value).replace(/"/g, '""');
    rows.push(`"${key}","${safeValue}"`);
  }

  return new TextEncoder().encode(rows.join("\n"));
}

// DOCX Generation (simplified XML structure)
async function generateDOCX(template: any, data: Record<string, unknown>): Promise<Uint8Array> {
  const config = template.template_config || {};
  
  // Generate simple text document (in production, use proper DOCX library)
  const lines: string[] = [];
  lines.push(template.name);
  lines.push("=".repeat(template.name.length));
  lines.push("");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  
  for (const [key, value] of Object.entries(data)) {
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }

  return new TextEncoder().encode(lines.join("\n"));
}

// CSV Generation
async function generateCSV(template: any, data: Record<string, unknown>): Promise<Uint8Array> {
  const config = template.template_config || {};
  const delimiter = config.delimiter || ",";
  const includeHeaders = config.include_headers !== false;

  const rows: string[] = [];
  
  if (includeHeaders) {
    rows.push(Object.keys(data).join(delimiter));
  }
  
  const values = Object.values(data).map(v => {
    const str = String(v);
    if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  });
  rows.push(values.join(delimiter));

  return new TextEncoder().encode(rows.join("\n"));
}
