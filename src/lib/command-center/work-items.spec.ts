import { describe, expect, it } from "vitest";
import type {
  CreateWorkItemInput,
  WorkItem,
  WorkItemComment,
  WorkItemEvent,
} from "@/types/command-center";
import {
  WorkItemConflictError,
  addWorkItemComment,
  createWorkItem,
  listWorkItemActivity,
  listWorkItems,
  normalizeCreateWorkItemInput,
  updateWorkItem,
} from "./work-items";

type Result = { data: unknown; error: { message: string } | null };

class RecordingQuery implements PromiseLike<Result> {
  readonly calls: Array<[string, ...unknown[]]> = [];

  constructor(private readonly result: Result) {}

  select(...args: unknown[]) { this.calls.push(["select", ...args]); return this; }
  insert(...args: unknown[]) { this.calls.push(["insert", ...args]); return this; }
  update(...args: unknown[]) { this.calls.push(["update", ...args]); return this; }
  in(...args: unknown[]) { this.calls.push(["in", ...args]); return this; }
  eq(...args: unknown[]) { this.calls.push(["eq", ...args]); return this; }
  is(...args: unknown[]) { this.calls.push(["is", ...args]); return this; }
  lte(...args: unknown[]) { this.calls.push(["lte", ...args]); return this; }
  order(...args: unknown[]) { this.calls.push(["order", ...args]); return this; }
  single(...args: unknown[]) { this.calls.push(["single", ...args]); return this; }
  maybeSingle(...args: unknown[]) { this.calls.push(["maybeSingle", ...args]); return this; }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function makeClient(results: Record<string, Result>) {
  const queries = new Map<string, RecordingQuery>();

  return {
    queries,
    from(table: string) {
      const query = new RecordingQuery(results[table] ?? { data: [], error: null });
      queries.set(table, query);
      return query;
    },
  };
}

const workItem: WorkItem = {
  id: "work-1",
  title: "Approve crane inspection quote",
  description: null,
  item_type: "approval",
  department: "revenue",
  status: "needs_approval",
  priority: "urgent",
  owner_id: null,
  created_by: "user-1",
  due_at: "2026-07-28T14:00:00.000Z",
  completed_at: null,
  source_system: "crm",
  source_ref: "quote-1",
  parent_id: null,
  version: 2,
  created_at: "2026-07-27T12:00:00.000Z",
  updated_at: "2026-07-27T13:00:00.000Z",
};

describe("work item repository", () => {
  it("normalizes create input and supplies operational defaults", () => {
    const input: CreateWorkItemInput = {
      title: "  Review FAA renewal  ",
      description: "   ",
      department: "compliance",
    };

    expect(normalizeCreateWorkItemInput(input)).toEqual({
      title: "Review FAA renewal",
      description: null,
      department: "compliance",
      item_type: "task",
      status: "inbox",
      priority: "normal",
      owner_id: null,
      due_at: null,
      source_system: "manual",
      source_ref: null,
      parent_id: null,
    });
  });

  it("serializes filters and uses stable due date ordering", async () => {
    const client = makeClient({ work_items: { data: [workItem], error: null } });

    const result = await listWorkItems({
      departments: ["revenue"],
      statuses: ["blocked", "needs_approval"],
      priorities: ["high", "urgent"],
      ownerId: null,
      sourceSystem: "crm",
      dueBefore: "2026-08-01T00:00:00.000Z",
    }, client);

    expect(result).toEqual([workItem]);
    expect(client.queries.get("work_items")?.calls).toEqual([
      ["select", "*"],
      ["in", "department", ["revenue"]],
      ["in", "status", ["blocked", "needs_approval"]],
      ["in", "priority", ["high", "urgent"]],
      ["is", "owner_id", null],
      ["eq", "source_system", "crm"],
      ["lte", "due_at", "2026-08-01T00:00:00.000Z"],
      ["order", "due_at", { ascending: true, nullsFirst: false }],
      ["order", "created_at", { ascending: false }],
    ]);
  });

  it("normalizes and inserts a new work item", async () => {
    const client = makeClient({ work_items: { data: workItem, error: null } });

    await createWorkItem({ title: "  Approve quote ", department: "revenue" }, client);

    expect(client.queries.get("work_items")?.calls[0]).toEqual([
      "insert",
      expect.objectContaining({
        title: "Approve quote",
        item_type: "task",
        status: "inbox",
        priority: "normal",
      }),
    ]);
  });

  it("uses the current version for optimistic updates", async () => {
    const client = makeClient({ work_items: { data: workItem, error: null } });

    await updateWorkItem("work-1", { status: "in_progress", version: 2 }, client);

    expect(client.queries.get("work_items")?.calls).toEqual([
      ["update", { status: "in_progress" }],
      ["eq", "id", "work-1"],
      ["eq", "version", 2],
      ["select", "*"],
      ["maybeSingle"],
    ]);
  });

  it("raises a conflict when an optimistic update matches no row", async () => {
    const client = makeClient({ work_items: { data: null, error: null } });

    await expect(
      updateWorkItem("work-1", { status: "done", version: 1 }, client),
    ).rejects.toBeInstanceOf(WorkItemConflictError);
  });

  it("trims comments and returns chronological activity", async () => {
    const comment = { id: "comment-1", body: "Ready to send" } as WorkItemComment;
    const event = { id: "event-1", event_type: "created" } as WorkItemEvent;
    const client = makeClient({
      work_item_comments: { data: comment, error: null },
      work_item_events: { data: [event], error: null },
    });

    await addWorkItemComment("work-1", "  Ready to send  ", client);
    const activity = await listWorkItemActivity("work-1", client);

    expect(client.queries.get("work_item_comments")?.calls[0]).toEqual([
      "insert",
      { work_item_id: "work-1", body: "Ready to send" },
    ]);
    expect(activity).toEqual([event]);
    expect(client.queries.get("work_item_events")?.calls).toEqual([
      ["select", "*"],
      ["eq", "work_item_id", "work-1"],
      ["order", "created_at", { ascending: false }],
    ]);
  });

  it("propagates database errors", async () => {
    const client = makeClient({
      work_items: { data: null, error: { message: "relation unavailable" } },
    });

    await expect(listWorkItems({}, client)).rejects.toEqual({ message: "relation unavailable" });
  });
});
