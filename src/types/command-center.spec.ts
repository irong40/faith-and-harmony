import { describe, expect, it } from "vitest";
import {
  DEPARTMENTS,
  OWNER_ACTION_STATUSES,
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
  isOwnerActionStatus,
  isTerminalWorkStatus,
} from "./command-center";

describe("command center domain", () => {
  it("exposes the approved work item types", () => {
    expect(WORK_ITEM_TYPES).toEqual([
      "task",
      "approval",
      "decision",
      "risk",
      "blocker",
    ]);
  });

  it("exposes the complete work lifecycle", () => {
    expect(WORK_ITEM_STATUSES).toEqual([
      "inbox",
      "planned",
      "in_progress",
      "waiting",
      "blocked",
      "needs_approval",
      "done",
      "cancelled",
    ]);
  });

  it("defines priorities and company departments", () => {
    expect(WORK_ITEM_PRIORITIES).toEqual(["low", "normal", "high", "urgent"]);
    expect(DEPARTMENTS).toEqual([
      "executive",
      "revenue",
      "operations",
      "finance",
      "compliance",
      "marketing",
      "technology",
    ]);
  });

  it("only treats done and cancelled as terminal", () => {
    expect(WORK_ITEM_STATUSES.filter(isTerminalWorkStatus)).toEqual(["done", "cancelled"]);
  });

  it("identifies statuses that require owner action", () => {
    expect(OWNER_ACTION_STATUSES).toEqual(["blocked", "needs_approval"]);
    expect(isOwnerActionStatus("blocked")).toBe(true);
    expect(isOwnerActionStatus("needs_approval")).toBe(true);
    expect(isOwnerActionStatus("waiting")).toBe(false);
    expect(isOwnerActionStatus("done")).toBe(false);
  });
});
