import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// What enables Send on both delivery screens (Codex round 4, CRM F2): only an
// approved, released engine PDF for this job counts.

const calls = vi.hoisted(() => ({ eq: [] as [string, unknown][] }));
const rows = vi.hoisted(() => ({ data: [] as unknown[] }));

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => { calls.eq.push([col, val]); return chain; }),
    not: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: rows.data, error: null })),
  });
  return { supabase: { from: vi.fn(() => chain) } };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useApprovedEngineReport } from "./useReportBuilder";

const released = {
  file_name: "SAI-2026-0927-CCAME_Roof.pdf",
  file_path: "job-reports/job-1/abc-SAI-2026-0927-CCAME_Roof.pdf",
  metadata: { source: "sentinel-reports", report_complete: true },
};

function run(jobId = "job-1") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useApprovedEngineReport(jobId), { wrapper });
}

beforeEach(() => {
  calls.eq = [];
  rows.data = [];
});

describe("useApprovedEngineReport", () => {
  it("returns the approved released engine PDF for this job", async () => {
    rows.data = [{ id: "rpt-1", title: "Roof", generated_documents: released }];
    const { result } = run();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "rpt-1", title: "Roof", document: released });
    expect(calls.eq).toEqual(expect.arrayContaining([["job_id", "job-1"], ["status", "final"]]));
  });

  it("returns null for a draft, a DRAFT_ name, or a legacy document", async () => {
    rows.data = [
      { id: "a", title: "d", generated_documents: { ...released, metadata: { source: "sentinel-reports", report_complete: false } } },
      { id: "b", title: "n", generated_documents: { ...released, file_name: "DRAFT_x.pdf" } },
      { id: "c", title: "l", generated_documents: { file_name: "r.pdf", file_path: "reports/r.pdf", metadata: { report_id: "x" } } },
    ];
    const { result } = run();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("skips unreleased rows and finds a released one behind them", async () => {
    rows.data = [
      { id: "a", title: "d", generated_documents: { ...released, file_name: "DRAFT_x.pdf" } },
      { id: "b", title: "ok", generated_documents: released },
    ];
    const { result } = run();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("b");
  });
});
