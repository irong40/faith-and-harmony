import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  ReportTemplate,
  JobReport,
  ReportImage,
  ReportSectionKey,
  ReportStatus,
  SectionDataMap,
  SectionManifestEntry,
} from "@/types/report";
import { ENGINE_DOCUMENT_EMBED } from "@/lib/engineReport";
import type { Json } from "@/integrations/supabase/types";

// ---- helpers ----

function castTemplate(row: Record<string, unknown>): ReportTemplate {
  return {
    ...row,
    sections_manifest: (row.sections_manifest ?? []) as SectionManifestEntry[],
    brand_config: (row.brand_config ?? undefined) as Record<string, unknown> | undefined,
    is_active: row.is_active as boolean,
  } as ReportTemplate;
}

function castReport(row: Record<string, unknown>): JobReport {
  return {
    ...row,
    section_data: (row.section_data ?? {}) as Partial<SectionDataMap>,
    active_sections: (row.active_sections ?? []) as ReportSectionKey[],
    status: row.status as ReportStatus,
  } as JobReport;
}

// ---- queries ----

export function useReportTemplates() {
  return useQuery({
    queryKey: ["report-templates"],
    queryFn: async (): Promise<ReportTemplate[]> => {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => castTemplate(r as unknown as Record<string, unknown>));
    },
  });
}

export function useReportTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["report-template", id],
    queryFn: async (): Promise<ReportTemplate> => {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return castTemplate(data as unknown as Record<string, unknown>);
    },
    enabled: !!id,
  });
}

export function useJobReports(options?: {
  status?: ReportStatus;
  job_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["job-reports", options],
    queryFn: async () => {
      let q = supabase
        .from("job_reports")
        .select(`*, clients(name, company), report_templates(name), ${ENGINE_DOCUMENT_EMBED}`)
        .order("updated_at", { ascending: false });
      if (options?.status) q = q.eq("status", options.status);
      if (options?.job_id) q = q.eq("job_id", options.job_id);
      if (options?.limit) q = q.limit(options.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...castReport(r as unknown as Record<string, unknown>),
        clients: (r as any).clients as { name: string; company: string | null } | null,
        report_templates: (r as any).report_templates as { name: string } | null,
      }));
    },
  });
}

export function useJobReport(id: string | undefined) {
  return useQuery({
    queryKey: ["job-report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_reports")
        .select(`*, report_images(*), ${ENGINE_DOCUMENT_EMBED}`)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return {
        ...castReport(data as unknown as Record<string, unknown>),
        report_images: ((data as any).report_images ?? []) as ReportImage[],
      };
    },
    enabled: !!id,
  });
}

// ---- mutations ----

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      template_id: string;
      job_id?: string;
      client_id?: string;
      section_data?: Partial<SectionDataMap>;
      active_sections?: ReportSectionKey[];
      prepared_by?: string;
      classification?: string;
    }) => {
      const { data, error } = await supabase
        .from("job_reports")
        .insert({
          title: input.title,
          template_id: input.template_id,
          job_id: input.job_id ?? null,
          client_id: input.client_id ?? null,
          section_data: (input.section_data ?? {}) as unknown as Json,
          active_sections: input.active_sections ?? null,
          prepared_by: input.prepared_by ?? "Adam Pierce",
          classification: input.classification ?? "CONFIDENTIAL",
          status: "draft",
          report_date: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      toast.success("Report created");
      qc.invalidateQueries({ queryKey: ["job-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      section_data?: Partial<SectionDataMap>;
      active_sections?: ReportSectionKey[];
      status?: ReportStatus;
    }) => {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.title !== undefined) update.title = input.title;
      if (input.section_data !== undefined) update.section_data = input.section_data as unknown as Json;
      if (input.active_sections !== undefined) update.active_sections = input.active_sections;
      if (input.status !== undefined) update.status = input.status;
      const { error } = await supabase.from("job_reports").update(update).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-reports"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Thrown when the report changed between opening it and approving it. */
export class StaleApprovalError extends Error {
  constructor() {
    super(
      "This report changed after you opened it (a new PDF was attached, or it was already approved). " +
        "The current version has been loaded; review it before approving."
    );
    this.name = "StaleApprovalError";
  }
}

/**
 * Approve exactly the engine PDF the reviewer is looking at.
 *
 * The update matches the report id AND status 'draft' AND the document id on
 * screen, and must return the row it changed. If Sortie attached a newer PDF
 * after the page loaded, nothing matches, nothing is approved, and the caller
 * reloads so the new PDF is what gets reviewed.
 */
export function useApproveEngineReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; documentId: string }) => {
      const { data, error } = await supabase
        .from("job_reports")
        .update({ status: "final", updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("status", "draft")
        .eq("generated_document_id", input.documentId)
        .select("id, status, generated_document_id");
      if (error) throw error;
      const row = (data ?? [])[0] as { id: string; status: ReportStatus; generated_document_id: string } | undefined;
      if (!row) throw new StaleApprovalError();
      return row;
    },
    onSuccess: (row) => {
      // The authoritative row, straight into the cache the page reads from.
      qc.setQueryData(["job-report", row.id], (old: unknown) =>
        old && typeof old === "object" ? { ...(old as object), status: row.status } : old
      );
      qc.invalidateQueries({ queryKey: ["job-reports"] });
    },
    onError: (e: Error, input) => {
      toast.error(e.message);
      if (e instanceof StaleApprovalError) {
        qc.invalidateQueries({ queryKey: ["job-report", input.id] });
      }
    },
  });
}

export function useSaveReportImages(reportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (images: { section_key: ReportSectionKey; image_url: string; caption?: string; sort_order?: number }[]) => {
      const rows = images.map((img) => ({
        report_id: reportId,
        section_key: img.section_key,
        image_url: img.image_url,
        caption: img.caption ?? null,
        sort_order: img.sort_order ?? 0,
      }));
      const { error } = await supabase.from("report_images").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-report", reportId] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report deleted");
      qc.invalidateQueries({ queryKey: ["job-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// useGenerateReportPDF retired 2026-09-28 (one layout). The CRM no longer
// draws client PDFs through window.print(); the report engine renders them and
// attaches them to the job. See src/lib/engineReport.ts.
