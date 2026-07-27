import { describe, expect, it } from "vitest";
import type { DepartmentUpdate } from "@/types/command-center";
import {
  getDepartmentReportState,
  latestDepartmentUpdates,
  listDepartmentUpdates,
} from "./departments";

function update(overrides: Partial<DepartmentUpdate>): DepartmentUpdate {
  return {
    id: "update-1",
    department: "executive",
    health: "healthy",
    objective: "Keep the company moving",
    summary: "On plan",
    blockers: [],
    report_path: null,
    source_system: "agent",
    reported_at: "2026-07-27T12:00:00.000Z",
    created_by: null,
    created_at: "2026-07-27T12:00:00.000Z",
    updated_at: "2026-07-27T12:00:00.000Z",
    ...overrides,
  };
}

class Query implements PromiseLike<{ data: unknown; error: unknown | null }> {
  calls: Array<[string, ...unknown[]]> = [];
  constructor(private result: { data: unknown; error: unknown | null }) {}
  select(...args: unknown[]) { this.calls.push(["select", ...args]); return this; }
  order(...args: unknown[]) { this.calls.push(["order", ...args]); return this; }
  then<TResult1 = { data: unknown; error: unknown | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) { return Promise.resolve(this.result).then(onfulfilled, onrejected); }
}

describe("department updates", () => {
  it("keeps only the latest report for each department", () => {
    const updates = [
      update({ id: "old", department: "revenue", reported_at: "2026-07-25T12:00:00.000Z" }),
      update({ id: "latest", department: "revenue", reported_at: "2026-07-27T12:00:00.000Z" }),
      update({ id: "ops", department: "operations" }),
    ];

    expect(latestDepartmentUpdates(updates).map((entry) => entry.id)).toEqual(["latest", "ops"]);
  });

  it("marks old reports stale after 48 hours", () => {
    const now = new Date("2026-07-27T16:00:00.000Z");
    expect(getDepartmentReportState(update({ reported_at: "2026-07-25T15:59:59.000Z" }), now))
      .toBe("stale");
    expect(getDepartmentReportState(update({ reported_at: "2026-07-26T12:00:00.000Z" }), now))
      .toBe("healthy");
    expect(getDepartmentReportState(undefined, now)).toBe("missing");
  });

  it("queries reports newest first and propagates errors", async () => {
    const query = new Query({ data: [update({ id: "latest" })], error: null });
    const client = { from: () => query };

    await expect(listDepartmentUpdates(client)).resolves.toHaveLength(1);
    expect(query.calls).toEqual([
      ["select", "*"],
      ["order", "reported_at", { ascending: false }],
    ]);

    const failed = new Query({ data: null, error: { message: "Unavailable" } });
    await expect(listDepartmentUpdates({ from: () => failed })).rejects.toEqual({ message: "Unavailable" });
  });
});
