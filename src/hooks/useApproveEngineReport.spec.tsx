import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Approval is bound to the exact PDF on screen (Codex full audit, CRM F2 /
// Sortie F1): the update filters on id, draft status AND document id, and an
// update that changes no row is a refusal, never a silent success.

const calls = vi.hoisted(() => ({ eq: [] as [string, unknown][], update: null as unknown }));
const outcome = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    update: vi.fn((payload: unknown) => { calls.update = payload; return chain; }),
    eq: vi.fn((col: string, val: unknown) => { calls.eq.push([col, val]); return chain; }),
    select: vi.fn(() => Promise.resolve({ data: outcome.rows, error: null })),
  });
  return { supabase: { from: vi.fn(() => chain) } };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useApproveEngineReport, StaleApprovalError } from "./useReportBuilder";

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  calls.eq = [];
  calls.update = null;
});

describe("useApproveEngineReport", () => {
  it("approves only the draft that still holds the reviewed document", async () => {
    outcome.rows = [{ id: "rpt-1", status: "final", generated_document_id: "doc-1" }];
    const client = new QueryClient();
    client.setQueryData(["job-report", "rpt-1"], { id: "rpt-1", status: "draft" });
    const { result } = renderHook(() => useApproveEngineReport(), { wrapper: wrapper(client) });

    result.current.mutate({ id: "rpt-1", documentId: "doc-1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(calls.eq).toEqual([["id", "rpt-1"], ["status", "draft"], ["generated_document_id", "doc-1"]]);
    expect(calls.update).toMatchObject({ status: "final" });
    // The cache the page reads now holds the authoritative status.
    expect((client.getQueryData(["job-report", "rpt-1"]) as { status: string }).status).toBe("final");
  });

  it("refuses when a newer PDF was attached after the page loaded", async () => {
    outcome.rows = []; // the filter matched nothing: the document id moved on
    const client = new QueryClient();
    const { result } = renderHook(() => useApproveEngineReport(), { wrapper: wrapper(client) });

    result.current.mutate({ id: "rpt-1", documentId: "doc-OLD" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(StaleApprovalError);
  });
});
