import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Codex round 7, CRM F1: the legacy editor's Finalize used to set status
// "final" by id alone. If Sortie attached an engine PDF after the page
// opened, that PDF became approved and deliverable without anyone seeing it.

type Row = { id: string; status: string; generated_document_id: string | null };
const db = vi.hoisted(() => ({ rows: [] as Row[] }));

vi.mock("@/integrations/supabase/client", () => {
  function builder() {
    const filters: Array<(r: Row) => boolean> = [];
    let patch: Record<string, unknown> = {};
    const apply = () => {
      const hit = db.rows.filter((r) => filters.every((f) => f(r)));
      hit.forEach((r) => Object.assign(r, patch));
      return hit.map((r) => ({ id: r.id }));
    };
    const chain: Record<string, unknown> = {
      update: (p: Record<string, unknown>) => { patch = p; return chain; },
      eq: (col: keyof Row, val: unknown) => { filters.push((r) => r[col] === val); return chain; },
      is: (col: keyof Row, val: unknown) => { filters.push((r) => r[col] === val); return chain; },
      select: () => Promise.resolve({ data: apply(), error: null }),
      then: (resolve: (v: unknown) => void) => { apply(); resolve({ error: null }); },
    };
    return chain;
  }
  return { supabase: { from: vi.fn(() => builder()) } };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useUpdateReport, StaleApprovalError } from "./useReportBuilder";

function hook() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useUpdateReport(), { wrapper });
}

beforeEach(() => {
  db.rows = [{ id: "rpt-1", status: "draft", generated_document_id: null }];
});

describe("legacy Finalize", () => {
  it("finalizes a legacy draft that is still as it was opened", async () => {
    const { result } = hook();
    await result.current.mutateAsync({ id: "rpt-1", status: "final", expectDocumentId: null });
    expect(db.rows[0].status).toBe("final");
  });

  it("refuses when Sortie attached an engine PDF after the page opened", async () => {
    const { result } = hook();
    db.rows[0].generated_document_id = "doc-engine";
    await expect(
      result.current.mutateAsync({ id: "rpt-1", status: "final", expectDocumentId: null })
    ).rejects.toBeInstanceOf(StaleApprovalError);
    // Still a draft, so the delivery rule (final + released) cannot link it.
    expect(db.rows[0].status).toBe("draft");
  });

  it("refuses a status change that does not name the loaded document state", async () => {
    const { result } = hook();
    await expect(result.current.mutateAsync({ id: "rpt-1", status: "final" })).rejects.toThrow(
      /document state it was opened with/
    );
    expect(db.rows[0].status).toBe("draft");
  });

  it("leaves content autosave unconditional", async () => {
    const { result } = hook();
    db.rows[0].generated_document_id = "doc-engine";
    await result.current.mutateAsync({ id: "rpt-1", title: "Roof" });
    await waitFor(() => expect(db.rows[0].status).toBe("draft"));
  });
});
