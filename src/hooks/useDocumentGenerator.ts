import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  output_format: string;
  schema: Record<string, unknown>;
  is_system: boolean;
}

export interface GeneratedDocument {
  id: string;
  template_code: string;
  file_name: string;
  output_format: string;
  file_size: number | null;
  created_at: string;
  download_count: number;
}

export interface GenerateRequest {
  template_code: string;
  data: Record<string, unknown>;
  filename?: string;
}

export interface GenerateResult {
  success: boolean;
  document_id: string;
  filename: string;
  download_url: string;
  format: string;
  size: number;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-generator`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function useDocumentTemplates(category?: string) {
  return useQuery({
    queryKey: ["document-templates", category],
    queryFn: async (): Promise<DocumentTemplate[]> => {
      const url = new URL(FUNCTION_URL);
      url.searchParams.set("action", "templates");
      if (category) url.searchParams.set("category", category);

      const response = await fetch(url.toString(), {
        headers: await getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      return data.templates;
    },
  });
}

export function useTemplateSchema(templateCode: string | null) {
  return useQuery({
    queryKey: ["template-schema", templateCode],
    queryFn: async () => {
      if (!templateCode) return null;

      const url = new URL(FUNCTION_URL);
      url.searchParams.set("action", "schema");
      url.searchParams.set("template", templateCode);

      const response = await fetch(url.toString(), {
        headers: await getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch template schema");
      }

      return response.json();
    },
    enabled: !!templateCode,
  });
}

export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GenerateRequest): Promise<GenerateResult> => {
      const url = new URL(FUNCTION_URL);
      url.searchParams.set("action", "generate");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate document");
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast.success(`Document generated: ${result.filename}`);
      queryClient.invalidateQueries({ queryKey: ["document-history"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDocumentHistory(limit = 20) {
  return useQuery({
    queryKey: ["document-history", limit],
    queryFn: async (): Promise<GeneratedDocument[]> => {
      const url = new URL(FUNCTION_URL);
      url.searchParams.set("action", "history");
      url.searchParams.set("limit", String(limit));

      const response = await fetch(url.toString(), {
        headers: await getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch document history");
      }

      const data = await response.json();
      return data.documents;
    },
  });
}

// Convenience hook for common document generation tasks
export function useDocumentGenerator() {
  const generateMutation = useGenerateDocument();
  const { data: templates, isLoading: templatesLoading } = useDocumentTemplates();

  const generate = async (templateCode: string, data: Record<string, unknown>, filename?: string) => {
    return generateMutation.mutateAsync({ template_code: templateCode, data, filename });
  };

  const generateAndDownload = async (templateCode: string, data: Record<string, unknown>, filename?: string) => {
    const result = await generate(templateCode, data, filename);
    if (result.download_url) {
      window.open(result.download_url, "_blank");
    }
    return result;
  };

  // Preset generators
  const generateInvoice = (orderId: string, includeLogo = true) =>
    generateAndDownload("invoice", { order_id: orderId, include_logo: includeLogo });

  const generateCOA = (productName: string, batchNumber: string, testResults: Record<string, unknown>) =>
    generateAndDownload("coa", { product_name: productName, batch_number: batchNumber, test_results: testResults });

  const generateInventoryExport = (category?: string, includeInactive = false) =>
    generateAndDownload("inventory-export", { category, include_inactive: includeInactive });

  const generateOrderSummary = (startDate: string, endDate: string) =>
    generateAndDownload("order-summary", { start_date: startDate, end_date: endDate });

  const generateDroneProposal = (clientName: string, propertyAddress: string, packageId?: string, customNotes?: string) =>
    generateAndDownload("drone-proposal", { 
      client_name: clientName, 
      property_address: propertyAddress, 
      package_id: packageId,
      custom_notes: customNotes 
    });

  const generatePhotoManifest = (jobId: string) =>
    generateAndDownload("photo-manifest", { job_id: jobId });

  const generateMemberReport = (organizationType: string, dateRange?: string) =>
    generateAndDownload("member-report", { organization_type: organizationType, date_range: dateRange });

  const generateQuarterlyReport = (quarter: number, year: number, district?: string) =>
    generateAndDownload("quarterly-report", { quarter, year, district });

  const generateDataExport = (tableName: string, columns?: string[], filters?: Record<string, unknown>) =>
    generateAndDownload("data-export", { table_name: tableName, columns, filters });

  return {
    templates,
    templatesLoading,
    isGenerating: generateMutation.isPending,
    generate,
    generateAndDownload,
    // Preset generators
    generateInvoice,
    generateCOA,
    generateInventoryExport,
    generateOrderSummary,
    generateDroneProposal,
    generatePhotoManifest,
    generateMemberReport,
    generateQuarterlyReport,
    generateDataExport,
  };
}

// Individual preset hooks for specific use cases
export function useInvoiceGenerator() {
  const { generateInvoice, isGenerating } = useDocumentGenerator();
  return { generateInvoice, isGenerating };
}

export function useCOAGenerator() {
  const { generateCOA, isGenerating } = useDocumentGenerator();
  return { generateCOA, isGenerating };
}

export function useInventoryExporter() {
  const { generateInventoryExport, isGenerating } = useDocumentGenerator();
  return { generateInventoryExport, isGenerating };
}

export function useDroneProposalGenerator() {
  const { generateDroneProposal, isGenerating } = useDocumentGenerator();
  return { generateDroneProposal, isGenerating };
}

export function useMemberReportGenerator() {
  const { generateMemberReport, isGenerating } = useDocumentGenerator();
  return { generateMemberReport, isGenerating };
}
