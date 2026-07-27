import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DepartmentUpdate } from "@/types/command-center";
import DepartmentHealth from "./DepartmentHealth";

const NOW = new Date("2026-07-27T16:00:00.000Z");

function update(overrides: Partial<DepartmentUpdate>): DepartmentUpdate {
  return {
    id: "update-1",
    department: "executive",
    health: "healthy",
    objective: "Protect this week's delivery commitments",
    summary: "Work is on plan.",
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

describe("DepartmentHealth", () => {
  it("renders every department in the approved order", () => {
    render(<DepartmentHealth updates={[]} now={NOW} />);

    expect(screen.getAllByTestId("department-card").map((card) => card.dataset.department))
      .toEqual([
        "executive",
        "revenue",
        "operations",
        "finance",
        "compliance",
        "marketing",
        "technology",
      ]);
  });

  it("shows objectives, blockers, stale reports, and missing reports", () => {
    render(<DepartmentHealth updates={[
      update({ department: "executive", blockers: ["Owner approval", "Vendor response"] }),
      update({
        department: "revenue",
        objective: "Recover stalled leads",
        reported_at: "2026-07-24T12:00:00.000Z",
      }),
    ]} now={NOW} />);

    expect(screen.getByText("Protect this week's delivery commitments")).toBeInTheDocument();
    expect(screen.getByText("2 blockers")).toBeInTheDocument();
    expect(screen.getByText("Stale report")).toBeInTheDocument();
    expect(screen.getAllByText("No report")).toHaveLength(5);
  });

  it("keeps failures isolated and retryable", () => {
    const onRetry = vi.fn();
    render(<DepartmentHealth updates={[]} error={new Error("Unavailable")} onRetry={onRetry} />);

    expect(screen.getByText("Department reports are unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
