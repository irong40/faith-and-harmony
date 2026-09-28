import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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

const ENGINE_DOC = {
  file_name: "SAI-2026-0927-CCAME_Roof.pdf",
  file_path: "job-reports/job-1/SAI-2026-0927-CCAME_Roof.pdf",
  metadata: { source: "sentinel-reports", report_complete: true, report_id: "SAI-2026-0927", engine_version: "0.3.0" },
};

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
  createSignedUrl.mockReset();
  createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/report.pdf" }, error: null });
  updateMutate.mockReset();
});

describe("ReportBuilder with an engine PDF", () => {
  it("shows the engine PDF and approves it for delivery", async () => {
    state.report = { ...BASE, generated_document_id: "doc-1", generated_documents: ENGINE_DOC };
    renderBuilder();

    const frame = await screen.findByTitle("Engine report PDF");
    expect(frame.getAttribute("src")).toBe("https://signed/report.pdf");
    expect(screen.getByTestId("engine-report-file").textContent).toContain("SAI-2026-0927");

    fireEvent.click(screen.getByRole("button", { name: /approve for delivery/i }));
    expect(updateMutate).toHaveBeenCalledWith(
      { id: "rpt-1", status: "final" },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("will not approve a PDF the engine released as a draft", async () => {
    state.report = {
      ...BASE,
      generated_document_id: "doc-2",
      generated_documents: { ...ENGINE_DOC, file_name: "DRAFT_roof.pdf", metadata: { report_complete: false } },
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
