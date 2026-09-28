import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createHash } from "node:crypto";

// One layout (2026-09-28): a report with an engine PDF opens as a viewer with
// Approve and Download. A report without one keeps the legacy editor, which
// no longer prints anything.

const createSignedUrl = vi.fn();
vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  return {
    supabase: {
      from: vi.fn(() => chain),
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    },
  };
});

const state = vi.hoisted(() => ({ report: null as Record<string, unknown> | null }));
const updateMutate = vi.fn();
const approveMutate = vi.fn();

vi.mock("@/hooks/useReportBuilder", () => {
  const TEMPLATE_QUERY = { data: { id: "tpl-1", name: "Roof", service_type: "roof", sections_manifest: [] }, isLoading: false };
  const EMPTY = { data: [], isLoading: false };
  const IDLE = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
  const cache = new Map<unknown, unknown>();
  return {
    useReportTemplates: () => EMPTY,
    useReportTemplate: () => TEMPLATE_QUERY,
    // Stable identity per report object, like react-query.
    useJobReport: () => {
      if (!cache.has(state.report)) cache.set(state.report, { data: state.report, isLoading: false });
      return cache.get(state.report);
    },
    useJobReports: () => EMPTY,
    useCreateReport: () => IDLE,
    useUpdateReport: () => ({ mutate: updateMutate, isPending: false }),
    useApproveEngineReport: () => ({ mutate: approveMutate, isPending: false }),
    useSaveReportImages: () => IDLE,
    useDeleteReport: () => IDLE,
  };
});

import ReportBuilder from "./ReportBuilder";

const BASE = {
  id: "rpt-1",
  title: "CCAME Roof Condition",
  template_id: "tpl-1",
  status: "draft",
  section_data: {},
  active_sections: [],
  report_images: [],
};

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7 released engine report");
const PDF_SHA = createHash("sha256").update(PDF_BYTES).digest("hex");

const ENGINE_DOC = {
  file_name: "SAI-2026-0927-CCAME_Roof.pdf",
  file_path: "job-reports/job-1/SAI-2026-0927-CCAME_Roof.pdf",
  metadata: {
    source: "sentinel-reports",
    report_complete: true,
    report_id: "SAI-2026-0927",
    engine_version: "0.3.0",
    sha256: PDF_SHA,
  },
};

const fetchMock = vi.fn();

function respond(body: Uint8Array | string, status = 200) {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

function renderBuilder() {
  return render(
    <MemoryRouter initialEntries={["/admin/reports/rpt-1/edit"]}>
      <Routes>
        <Route path="/admin/reports/:id/edit" element={<ReportBuilder />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(respond(PDF_BYTES));
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:verified-report");
  URL.revokeObjectURL = vi.fn();
  createSignedUrl.mockReset();
  createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/report.pdf" }, error: null });
  updateMutate.mockReset();
  approveMutate.mockReset();
});

describe("ReportBuilder with an engine PDF", () => {
  it("shows the engine PDF and approves it for delivery", async () => {
    state.report = { ...BASE, generated_document_id: "doc-1", generated_documents: ENGINE_DOC };
    renderBuilder();

    // Before the bytes are checked nothing has been seen, nothing can be approved.
    const pending = screen.getByRole("button", { name: /approve for delivery/i }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    const frame = await screen.findByTitle("Engine report PDF");
    // The viewer shows the verified bytes, never the remote link.
    expect(fetchMock).toHaveBeenCalledWith("https://signed/report.pdf");
    expect(frame.getAttribute("src")).toBe("blob:verified-report");
    await waitFor(() =>
      expect((screen.getByRole("button", { name: /approve for delivery/i }) as HTMLButtonElement).disabled).toBe(false)
    );
    expect(screen.getByTestId("engine-report-file").textContent).toContain("SAI-2026-0927");

    fireEvent.click(screen.getByRole("button", { name: /approve for delivery/i }));
    // Approval names the exact document on screen, not just the report.
    expect(approveMutate).toHaveBeenCalledWith(
      { id: "rpt-1", documentId: "doc-1" },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it("will not approve a PDF the engine released as a draft", async () => {
    state.report = {
      ...BASE,
      generated_document_id: "doc-2",
      generated_documents: {
        ...ENGINE_DOC,
        file_name: "DRAFT_roof.pdf",
        metadata: { source: "sentinel-reports", report_complete: false, sha256: PDF_SHA },
      },
    };
    renderBuilder();

    await screen.findByTitle("Engine report PDF");
    const approve = screen.getByRole("button", { name: /approve for delivery/i }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(screen.getByText("Not ready to send")).toBeTruthy();
  });

  it("says so when storage will not sign the PDF", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error("denied") });
    state.report = { ...BASE, generated_document_id: "doc-3", generated_documents: ENGINE_DOC };
    renderBuilder();

    await waitFor(() => expect(screen.getByText("Could not open the PDF")).toBeTruthy());
    // A PDF nobody could open cannot have been reviewed.
    const approve = screen.getByRole("button", { name: /approve for delivery/i }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Signing succeeds and the PDF itself does not arrive: the case an iframe
  // load event reported as success (Codex round 4, CRM F1).
  it.each([
    ["storage refuses the signed link", () => Promise.resolve(respond("denied", 403)), /returned 403/],
    ["the network fails", () => Promise.reject(new TypeError("Failed to fetch")), /did not return the PDF/],
    ["an error page comes back", () => Promise.resolve(respond("<html>error</html>")), /not a PDF/],
    [
      "the download is cut off after the headers arrive",
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.reject(new TypeError("terminated")),
        }),
      /download was interrupted/,
    ],
    [
      "the bytes are not the released file",
      () => Promise.resolve(respond("%PDF-1.7 a different build")),
      /does not match the file the engine released/,
    ],
  ])("will not approve when %s", async (_label, reply, message) => {
    fetchMock.mockImplementation(reply);
    state.report = { ...BASE, generated_document_id: "doc-4", generated_documents: ENGINE_DOC };
    renderBuilder();

    await waitFor(() => expect(screen.getByText("Could not open the PDF")).toBeTruthy());
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByTitle("Engine report PDF")).toBeNull();
    expect(screen.queryByText("Opening the PDF")).toBeNull();
    const approve = screen.getByRole("button", { name: /approve for delivery/i }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
  });

  it("will not approve a PDF with no recorded checksum", async () => {
    state.report = {
      ...BASE,
      generated_document_id: "doc-5",
      generated_documents: { ...ENGINE_DOC, metadata: { ...ENGINE_DOC.metadata, sha256: undefined } },
    };
    renderBuilder();

    await waitFor(() => expect(screen.getByText(/no recorded checksum/)).toBeTruthy());
    const approve = screen.getByRole("button", { name: /approve for delivery/i }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
  });
});

describe("ReportBuilder for a report the retired print path logged", () => {
  it("keeps the section editor: a document row without the engine stamp is not an engine PDF", () => {
    // Shape of the one such row in production (2026-09-28): the old
    // document-generator logged a path and uploaded nothing.
    state.report = {
      ...BASE,
      generated_document_id: "doc-legacy",
      generated_documents: {
        file_name: "re_aerial_photography-report.pdf",
        file_path: "reports/re_aerial_photography-report.pdf",
        metadata: { report_id: "rpt-1" },
      },
    };
    const { container } = renderBuilder();
    expect(screen.queryByTitle("Engine report PDF")).toBeNull();
    expect(container.querySelector("main.overflow-y-auto")).toBeTruthy();
  });
});

describe("ReportBuilder for a legacy draft", () => {
  it("keeps the editor, flags it as legacy, and offers no print path", () => {
    state.report = { ...BASE, generated_documents: null };
    const { container } = renderBuilder();

    expect(screen.getByText(/legacy draft: no engine PDF yet/i)).toBeTruthy();
    expect(container.querySelector("main.overflow-y-auto")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /download pdf/i })).toBeNull();
    expect(container.querySelector(".print\\:block")).toBeNull();
  });
});

describe("ReportBuilder approval state comes from the row", () => {
  it("shows Approved only when the stored status is final", async () => {
    state.report = { ...BASE, status: "final", generated_document_id: "doc-9", generated_documents: ENGINE_DOC };
    renderBuilder();
    await screen.findByTitle("Engine report PDF");
    const approve = screen.getByRole("button", { name: /approved/i }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
  });
});
