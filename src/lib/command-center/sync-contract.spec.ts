import { describe, expect, it } from "vitest";
import {
  executeSync,
  planSync,
  signSyncBody,
  validateSyncPayload,
  verifySyncSignature,
} from "../../../supabase/functions/_shared/command-center-sync";

const validPayload = {
  mode: "dry_run",
  source: "obsidian",
  work_items: [{
    source_ref: "projects/faith-and-harmony/task-001",
    title: "Review crane inspection quote",
    description: "Confirm scope and margin",
    item_type: "approval",
    department: "revenue",
    priority: "urgent",
    due_at: "2026-07-28T16:00:00.000Z",
  }],
  department_updates: [{
    source_ref: "reports/revenue/2026-07-27",
    department: "revenue",
    health: "watch",
    objective: "Convert qualified demand",
    summary: "One quote needs approval",
    blockers: ["Owner approval"],
    report_path: "projects/faith-and-harmony/reports/revenue-2026-07-27.md",
    reported_at: "2026-07-27T15:00:00.000Z",
  }],
};

describe("command center sync contract", () => {
  it("signs and verifies the exact timestamped request body", async () => {
    const body = JSON.stringify(validPayload);
    const timestamp = "1785168000000";
    const signature = await signSyncBody(body, timestamp, "secret-value");

    await expect(verifySyncSignature(body, timestamp, signature, "secret-value"))
      .resolves.toBe(true);
    await expect(verifySyncSignature(`${body} `, timestamp, signature, "secret-value"))
      .resolves.toBe(false);
  });

  it("accepts only allow-listed proposal fields", () => {
    expect(validateSyncPayload(validPayload)).toEqual(expect.objectContaining({ valid: true }));

    const injected = structuredClone(validPayload);
    Object.assign(injected.work_items[0], {
      status: "done",
      owner_id: "someone-else",
      completed_at: "2026-07-27T16:00:00.000Z",
    });
    const result = validateSyncPayload(injected);

    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toMatch(/status|owner_id|completed_at/);
  });

  it("plans a dry run without applying and reports idempotent skips and conflicts", () => {
    const payload = validateSyncPayload(validPayload);
    if (!payload.valid) throw new Error(payload.issues.join(", "));

    const same = planSync(payload.value, [{
      source_ref: "projects/faith-and-harmony/task-001",
      title: "Review crane inspection quote",
    }], [{
      source_ref: "reports/revenue/2026-07-27",
      summary: "An older summary",
    }]);

    expect(same.apply).toBe(false);
    expect(same.work.toInsert).toEqual([]);
    expect(same.work.skipped).toEqual(["projects/faith-and-harmony/task-001"]);
    expect(same.departments.conflicts).toEqual([expect.objectContaining({
      source_ref: "reports/revenue/2026-07-27",
    })]);
    expect(same.wouldApply).toBe(0);
  });

  it("does not write operational rows in dry run and applies only new rows", async () => {
    const validated = validateSyncPayload({
      ...validPayload,
      work_items: [
        ...validPayload.work_items,
        { ...validPayload.work_items[0], source_ref: "projects/faith-and-harmony/task-002", title: "Schedule flight" },
      ],
      department_updates: [],
    });
    if (!validated.valid) throw new Error(validated.issues.join(", "));
    const inserted: string[] = [];
    const runs: unknown[] = [];
    const store = {
      findExistingWork: async () => [{
        source_ref: "projects/faith-and-harmony/task-001",
        title: "Review crane inspection quote",
      }],
      findExistingDepartments: async () => [],
      insertWork: async (rows: Array<{ source_ref: string }>) => { inserted.push(...rows.map((row) => row.source_ref)); },
      insertDepartments: async () => undefined,
      recordRun: async (run: unknown) => { runs.push(run); },
    };

    const dryRun = await executeSync(validated.value, store);
    expect(dryRun.applied).toBe(0);
    expect(dryRun.wouldApply).toBe(1);
    expect(inserted).toEqual([]);

    const applied = await executeSync({ ...validated.value, mode: "apply" }, store);
    expect(applied.applied).toBe(1);
    expect(inserted).toEqual(["projects/faith-and-harmony/task-002"]);
    expect(runs).toHaveLength(2);
  });
});
