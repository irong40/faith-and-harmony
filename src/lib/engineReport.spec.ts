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
