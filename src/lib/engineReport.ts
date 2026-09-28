import { supabase } from "@/integrations/supabase/client";
import type { EngineReportDocument, JobReport } from "@/types/report";

/**
 * One layout rule (2026-09-28): the report engine (sentinel-reports) draws
 * every client PDF. The CRM stores it, Adam approves it, and the delivery
 * email links it. The CRM never draws a report itself.
 */
export const ENGINE_REPORT_BUCKET = "generated-documents";

/** Signed links for the in-app viewer; short, because the page re-signs. */
export const VIEWER_LINK_TTL_SECONDS = 60 * 60;

/** Columns the CRM embeds wherever it needs the engine PDF. */
export const ENGINE_DOCUMENT_EMBED =
  "generated_documents(id, file_name, file_path, metadata, created_at)";

type WithDocument = Pick<JobReport, "generated_documents">;

/** The engine PDF attached to a report, or null for a legacy CRM draft. */
export function engineDocumentOf(report: WithDocument | null | undefined): EngineReportDocument | null {
  const doc = report?.generated_documents;
  if (!doc || !doc.file_path) return null;
  return doc;
}

export interface ApprovalCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Only a released engine PDF can go to a client. The engine marks a PDF that
 * failed its release gates with report_complete=false and a DRAFT_ file name;
 * either one blocks approval. The delivery email applies the same rule.
 */
export function canApproveEngineReport(doc: EngineReportDocument | null): ApprovalCheck {
  if (!doc) {
    return { ok: false, reason: "No engine PDF is attached. Render the report in the engine first." };
  }
  if (doc.metadata?.report_complete === false || /^DRAFT_/i.test(doc.file_name)) {
    return {
      ok: false,
      reason: "The engine released this PDF as a draft. Fix the flagged items and re-render it.",
    };
  }
  return { ok: true };
}

/** Sign a private-bucket link for viewing or downloading the engine PDF. */
export async function signEngineReportUrl(
  filePath: string,
  options?: { download?: string | boolean }
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ENGINE_REPORT_BUCKET)
    .createSignedUrl(filePath, VIEWER_LINK_TTL_SECONDS, options);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
