import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkItem } from "@/types/command-center";
import ActionQueue from "./ActionQueue";
import { sortOwnerActionItems } from "./action-queue";

const NOW = new Date("2026-07-27T16:00:00.000Z");

function item(overrides: Partial<WorkItem>): WorkItem {
  return {
    id: "work-1",
    title: "Review company work",
    description: null,
    item_type: "task",
    department: "executive",
    status: "planned",
    priority: "normal",
    owner_id: null,
    created_by: "user-1",
    due_at: null,
    completed_at: null,
    source_system: "manual",
    source_ref: null,
    parent_id: null,
    version: 1,
    created_at: "2026-07-27T12:00:00.000Z",
    updated_at: "2026-07-27T12:00:00.000Z",
    ...overrides,
  };
}

const items = [
  item({ id: "risk", title: "Insurance renewal risk", item_type: "risk", priority: "high" }),
  item({ id: "approval", title: "Approve crane quote", item_type: "approval", status: "needs_approval" }),
  item({ id: "blocked", title: "Resolve calendar access", item_type: "blocker", status: "blocked" }),
  item({ id: "overdue", title: "File compliance response", due_at: "2026-07-26T16:00:00.000Z" }),
  item({ id: "waiting", title: "Waiting on client", status: "waiting" }),
];

describe("ActionQueue", () => {
  it("sorts overdue, blocked, approval, and risk work ahead of routine work", () => {
    expect(sortOwnerActionItems(items, NOW).map((entry) => entry.id)).toEqual([
      "overdue",
      "blocked",
      "approval",
      "risk",
    ]);
  });

  it("explains why each item needs action and opens the selected item", () => {
    const onSelect = vi.fn();
    render(<ActionQueue items={items} now={NOW} onSelect={onSelect} />);

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("Approval needed")).toBeInTheDocument();
    expect(screen.getByText("Risk review")).toBeInTheDocument();
    expect(screen.queryByText("Waiting on client")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /approve crane quote/i }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "approval" }));
  });

  it("renders an isolated loading state", () => {
    render(<ActionQueue items={[]} isLoading />);
    expect(screen.getByRole("status", { name: "Loading owner actions" })).toBeInTheDocument();
  });

  it("renders a retryable error without hiding the section", () => {
    const onRetry = vi.fn();
    render(<ActionQueue items={[]} error={new Error("Unavailable")} onRetry={onRetry} />);

    expect(screen.getByText("Owner actions are unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders a clear empty state", () => {
    render(<ActionQueue items={[]} />);
    expect(screen.getByText("Nothing needs your decision right now")).toBeInTheDocument();
  });
});
