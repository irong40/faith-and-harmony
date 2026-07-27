import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkItem } from "@/types/command-center";
import WorkBoard from "./WorkBoard";

function item(overrides: Partial<WorkItem>): WorkItem {
  return {
    id: "work-1",
    title: "Planned task",
    description: null,
    item_type: "task",
    department: "operations",
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
  item({ id: "planned" }),
  item({ id: "blocked", title: "Blocked task", status: "blocked", priority: "urgent" }),
];

describe("WorkBoard", () => {
  it("groups work into the complete active lifecycle", () => {
    render(<WorkBoard items={items} />);

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent))
      .toEqual(["Inbox", "Planned", "In progress", "Waiting", "Blocked", "Needs approval", "Done"]);
    expect(within(screen.getByLabelText("Planned work")).getByText("Planned task")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Blocked work")).getByText("Blocked task")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Inbox work")).getByText("No work")).toBeInTheDocument();
  });

  it("provides keyboard-accessible status movement", () => {
    const onMove = vi.fn();
    render(<WorkBoard items={items} onMove={onMove} />);

    fireEvent.click(screen.getByRole("button", { name: "Move Planned task forward" }));
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: "planned" }), "in_progress");

    fireEvent.click(screen.getByRole("button", { name: "Move Planned task back" }));
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: "planned" }), "inbox");
  });

  it("renders a compact list mode", () => {
    render(<WorkBoard items={items} view="list" />);

    expect(screen.getByRole("table", { name: "Company work list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Planned task" })).toBeInTheDocument();
  });

  it("isolates loading and error states", () => {
    const { rerender } = render(<WorkBoard items={[]} isLoading />);
    expect(screen.getByRole("status", { name: "Loading company work" })).toBeInTheDocument();

    rerender(<WorkBoard items={[]} error={new Error("Unavailable")} />);
    expect(screen.getByText("Company work is unavailable")).toBeInTheDocument();
  });
});
