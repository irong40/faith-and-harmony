import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkFilters from "./WorkFilters";

describe("WorkFilters", () => {
  it("emits department, type, status, priority, source, owner, and due filters", () => {
    const onChange = vi.fn();
    const now = new Date("2026-07-27T16:00:00.000Z");
    const { rerender } = render(<WorkFilters value={{}} onChange={onChange} now={now} />);

    fireEvent.change(screen.getByLabelText("Department filter"), { target: { value: "operations" } });
    expect(onChange).toHaveBeenLastCalledWith({ departments: ["operations"] });

    rerender(<WorkFilters value={{ departments: ["operations"] }} onChange={onChange} now={now} />);
    fireEvent.change(screen.getByLabelText("Priority filter"), { target: { value: "urgent" } });
    expect(onChange).toHaveBeenLastCalledWith({ departments: ["operations"], priorities: ["urgent"] });

    fireEvent.change(screen.getByLabelText("Due filter"), { target: { value: "week" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      departments: ["operations"],
      dueBefore: "2026-08-03T16:00:00.000Z",
    }));
  });

  it("clears all filters", () => {
    const onChange = vi.fn();
    render(<WorkFilters value={{ statuses: ["blocked"], ownerId: null }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
