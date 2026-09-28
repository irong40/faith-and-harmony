import { describe, it, expect, vi } from "vitest";

const createSignedUrl = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: vi.fn(() => ({ createSignedUrl })) } },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  ENGINE_REPORT_BUCKET,
  ENGINE_DOCUMENT_EMBED,
  canApproveEngineReport,
  engineDocumentOf,
  fetchVerifiedEngineReport,
  hasSomethingToSend,
  signEngineReportUrl,
} from "./engineReport";
import type { EngineReportDocument } from "@/types/report";

const released: EngineReportDocument = {
  file_name: "SAI-2026-0927-CCAME_Roof.pdf",
  file_path: "job-reports/job-1/SAI-2026-0927-CCAME_Roof.pdf",
  metadata: { source: "sentinel-reports", report_complete: true, engine_version: "0.3.0" },
};

describe("engineDocumentOf", () => {
  it("returns the embedded engine PDF", () => {
    expect(engineDocumentOf({ generated_documents: released })).toBe(released);
  });

  it("ignores a document row the retired print path logged (no engine stamp)", () => {
    const legacy = { file_name: "r.pdf", file_path: "reports/r.pdf", metadata: { report_id: "x" } };
    expect(engineDocumentOf({ generated_documents: legacy })).toBeNull();
    expect(engineDocumentOf({ generated_documents: { ...legacy, metadata: null } })).toBeNull();
  });

  it("treats a report without a PDF as a legacy draft", () => {
    expect(engineDocumentOf({ generated_documents: null })).toBeNull();
    expect(engineDocumentOf({})).toBeNull();
    expect(engineDocumentOf(undefined)).toBeNull();
    expect(engineDocumentOf({ generated_documents: { ...released, file_path: "" } })).toBeNull();
  });
});

describe("canApproveEngineReport", () => {
  it("approves a released engine PDF", () => {
    expect(canApproveEngineReport(released)).toEqual({ ok: true });
  });

  it("blocks a PDF the engine flagged incomplete", () => {
    const check = canApproveEngineReport({ ...released, metadata: { report_complete: false } });
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/draft/i);
  });

  it("blocks a DRAFT_ file even when the metadata is missing", () => {
    const check = canApproveEngineReport({ ...released, file_name: "DRAFT_roof.pdf", metadata: null });
    expect(check.ok).toBe(false);
  });

  it("blocks when there is no PDF at all", () => {
    expect(canApproveEngineReport(null).ok).toBe(false);
  });

  it("blocks when the engine never said the report was complete", () => {
    expect(canApproveEngineReport({ ...released, metadata: { source: "sentinel-reports" } }).ok).toBe(false);
  });

  it("blocks a lower-case draft_ name", () => {
    expect(canApproveEngineReport({ ...released, file_name: "draft_roof.pdf" }).ok).toBe(false);
  });
});

describe("signEngineReportUrl", () => {
  it("signs from the private generated-documents bucket", async () => {
    createSignedUrl.mockResolvedValueOnce({ data: { signedUrl: "https://signed/x" }, error: null });
    await expect(signEngineReportUrl(released.file_path)).resolves.toBe("https://signed/x");
    expect(supabase.storage.from).toHaveBeenCalledWith(ENGINE_REPORT_BUCKET);
    expect(ENGINE_REPORT_BUCKET).toBe("generated-documents");
  });

  it("returns null instead of throwing when signing fails", async () => {
    createSignedUrl.mockResolvedValueOnce({ data: null, error: new Error("denied") });
    await expect(signEngineReportUrl(released.file_path)).resolves.toBeNull();
  });
});

it("embeds the columns the viewer and the delivery email both read", () => {
  for (const col of ["file_name", "file_path", "metadata"]) {
    expect(ENGINE_DOCUMENT_EMBED).toContain(col);
  }
  expect(ENGINE_DOCUMENT_EMBED.startsWith("generated_documents(")).toBe(true);
});

describe("hasSomethingToSend", () => {
  const report = { id: "rpt-1" };

  it("enables Send with an approved report and nothing else", () => {
    expect(hasSomethingToSend({ fileCount: 0, approvedReport: report })).toBe(true);
    expect(hasSomethingToSend({ driveUrl: "", fileCount: 0, approvedReport: report })).toBe(true);
  });

  it("does not enable Send with no report, no files and no link", () => {
    expect(hasSomethingToSend({ fileCount: 0, approvedReport: null })).toBe(false);
    expect(hasSomethingToSend({ driveUrl: null, fileCount: 0, approvedReport: undefined })).toBe(false);
  });

  it("still sends files or a Drive link without a report", () => {
    expect(hasSomethingToSend({ fileCount: 2, approvedReport: null })).toBe(true);
    expect(hasSomethingToSend({ driveUrl: "https://drive/x", fileCount: 0, approvedReport: null })).toBe(true);
  });
});

describe("fetchVerifiedEngineReport", () => {
  const bytes = new TextEncoder().encode("%PDF-1.7 body");
  const reply = (body: Uint8Array, status = 200) =>
    vi.fn().mockResolvedValue({
      ok: status < 300,
      status,
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    }) as unknown as typeof fetch;

  async function sha(body: Uint8Array) {
    const d = await crypto.subtle.digest("SHA-256", body);
    return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  it("accepts the released bytes", async () => {
    const result = await fetchVerifiedEngineReport("u", await sha(bytes), reply(bytes));
    expect(result.ok).toBe(true);
  });

  it("accepts an upper-case recorded digest", async () => {
    const result = await fetchVerifiedEngineReport("u", (await sha(bytes)).toUpperCase(), reply(bytes));
    expect(result.ok).toBe(true);
  });

  it("refuses a failed response, non-PDF bytes, a missing digest and a mismatch", async () => {
    expect((await fetchVerifiedEngineReport("u", await sha(bytes), reply(bytes, 404))).ok).toBe(false);
    const html = new TextEncoder().encode("<html>");
    expect((await fetchVerifiedEngineReport("u", await sha(html), reply(html))).ok).toBe(false);
    expect((await fetchVerifiedEngineReport("u", undefined, reply(bytes))).ok).toBe(false);
    expect((await fetchVerifiedEngineReport("u", "0".repeat(64), reply(bytes))).ok).toBe(false);
  });
});
