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

/** Written by Sortie's attach_report_pdf on every engine PDF it stores. */
export const ENGINE_SOURCE = "sentinel-reports";

/**
 * The engine PDF attached to a report, or null for a legacy CRM draft.
 *
 * Keyed on the engine's own stamp, not on a file path: the retired
 * document-generator "generate-report" action wrote generated_documents rows
 * with a file_path and no file for every report whose Download PDF was
 * clicked, and those reports must keep opening in the section editor.
 */
export function engineDocumentOf(report: WithDocument | null | undefined): EngineReportDocument | null {
  const doc = report?.generated_documents;
  if (!doc || !doc.file_path) return null;
  if (doc.metadata?.source !== ENGINE_SOURCE) return null;
  return doc;
}

/**
 * The one rule for "this PDF may go to a client". The delivery email
 * (drone-delivery-email/delivery.ts, isReleasedEngineDocument) and Sortie's
 * crm.attach_report_pdf apply the same rule. An allow-list: missing metadata
 * is a no.
 */
export function isReleasedEngineDocument(doc: EngineReportDocument | null | undefined): boolean {
  if (!doc || !doc.file_path) return false;
  if (doc.metadata?.source !== ENGINE_SOURCE) return false;
  if (doc.metadata?.report_complete !== true) return false;
  return !/^draft_/i.test(doc.file_name ?? "");
}

export interface ApprovalCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Only a released engine PDF can go to a client. The engine marks a PDF that
 * failed its release gates with report_complete=false and a DRAFT_ file name;
 * either one, or missing engine metadata, blocks approval.
 */
export function canApproveEngineReport(doc: EngineReportDocument | null): ApprovalCheck {
  if (!doc) {
    return { ok: false, reason: "No engine PDF is attached. Render the report in the engine first." };
  }
  if (!isReleasedEngineDocument(doc)) {
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

/** ok with the bytes, or not ok with the reason. Flat because the app does not build under strictNullChecks, so a union would not narrow. */
export interface VerifiedPdf {
  ok: boolean;
  bytes?: ArrayBuffer;
  reason?: string;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fetch the PDF behind a signed link and prove it is the file the engine
 * released: a successful response, PDF bytes, and the SHA-256 Sortie recorded
 * when it stored the file. An iframe load event proves none of this, because
 * browsers fire it for failed loads too. The viewer then shows these exact
 * bytes, so what Adam approves is what was checked.
 */
export async function fetchVerifiedEngineReport(
  url: string,
  expectedSha256: string | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<VerifiedPdf> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    return { ok: false, reason: "Storage did not return the PDF. Check the connection and reopen the report." };
  }
  if (!response.ok) {
    return { ok: false, reason: `Storage returned ${response.status} for the PDF.` };
  }
  // Headers can arrive and the body still fail part way, so reading the body
  // and hashing it are failures to report, never exceptions to escape.
  let bytes: ArrayBuffer;
  try {
    bytes = await response.arrayBuffer();
  } catch {
    return { ok: false, reason: "The PDF download was interrupted. Reopen the report to try again." };
  }
  const head = new TextDecoder().decode(new Uint8Array(bytes.slice(0, 5)));
  if (head !== "%PDF-") {
    return { ok: false, reason: "The stored file is not a PDF." };
  }
  if (!expectedSha256) {
    return {
      ok: false,
      reason: "This PDF has no recorded checksum, so it cannot be tied to the engine's release. Attach it again from Sortie.",
    };
  }
  let digest: string;
  try {
    digest = toHex(await crypto.subtle.digest("SHA-256", bytes));
  } catch {
    return { ok: false, reason: "This browser could not check the PDF's checksum." };
  }
  if (digest !== expectedSha256.toLowerCase()) {
    return {
      ok: false,
      reason: "The stored PDF does not match the file the engine released. Attach it again from Sortie.",
    };
  }
  return { ok: true, bytes };
}

/**
 * Whether a delivery has anything to send: a Drive link, files, or an approved
 * engine report. Both Send buttons (DeliveryReview, DroneJobDetail) use it, so
 * an approved report alone always enables Send on both.
 */
export function hasSomethingToSend(input: {
  driveUrl?: string | null;
  fileCount: number;
  approvedReport: unknown;
}): boolean {
  return Boolean(input.driveUrl) || input.fileCount > 0 || Boolean(input.approvedReport);
}
