import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AircraftMaintenanceForm from "./AircraftMaintenanceForm";

const AIRCRAFT = "11111111-2222-3333-4444-555555555555";

function setup(allowTestRows = false) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<AircraftMaintenanceForm aircraftId={AIRCRAFT} onSubmit={onSubmit} allowTestRows={allowTestRows} />);
  return { onSubmit };
}

const change = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("AircraftMaintenanceForm", () => {
  it("starts empty: no date or event type is pre-filled", () => {
    setup();
    expect((screen.getByLabelText(/date performed/i) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/event type/i) as HTMLSelectElement).value).toBe("");
  });

  it("offers exactly the five event types Adam named", () => {
    setup();
    const opts = Array.from((screen.getByLabelText(/event type/i) as HTMLSelectElement).options)
      .map(o => o.value)
      .filter(Boolean);
    expect(opts).toEqual(["inspection", "service", "repair", "part_replacement", "battery_replacement"]);
  });

  it("refuses to save without type, date and work, and does not call onSubmit", async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("button", { name: /save record/i }));
    expect(await screen.findByText(/choose an event type/i)).toBeTruthy();
    expect(screen.getByText(/enter the date the work was done/i)).toBeTruthy();
    expect(screen.getByText(/describe the work performed/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("saves blank optional fields as null (unknown), never 0 or a default", async () => {
    const { onSubmit } = setup();
    change(/event type/i, "battery_replacement");
    change(/date performed/i, "2026-11-20");
    change(/work performed/i, "Replaced battery pack");
    fireEvent.click(screen.getByRole("button", { name: /save record/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      aircraft_id: AIRCRAFT,
      equipment_id: AIRCRAFT,
      equipment_type: "aircraft",
      maintenance_type: "battery_replacement",
      performed_at: "2026-11-20T12:00:00Z",
      flight_hours_at_service: null,
      component_id: null,
      results: null,
      performed_by_name: null,
      evidence_url: null,
      open_issues: null,
      next_due_date: null,
      next_due_flight_hours: null,
      is_test: false,
    });
  });

  it("keeps a real 0 flight hours as 0 and rejects a negative value", async () => {
    const { onSubmit } = setup();
    change(/event type/i, "inspection");
    change(/date performed/i, "2026-11-20");
    change(/work performed/i, "Pre-season inspection");
    change(/flight hours at service/i, "-3");
    fireEvent.click(screen.getByRole("button", { name: /save record/i }));
    expect(await screen.findByText(/hours must be a number/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    change(/flight hours at service/i, "0");
    fireEvent.click(screen.getByRole("button", { name: /save record/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].flight_hours_at_service).toBe(0);
  });

  it("hides the TEST-row option unless allowed, and labels the row when used", async () => {
    setup(false);
    expect(screen.queryByText(/TEST row/)).toBeNull();
  });

  it("marks a TEST row is_test=true when the dev checkbox is ticked", async () => {
    const { onSubmit } = setup(true);
    change(/event type/i, "service");
    change(/date performed/i, "2026-11-20");
    change(/work performed/i, "TEST entry");
    fireEvent.click(screen.getByLabelText(/TEST row/));
    fireEvent.click(screen.getByRole("button", { name: /save record/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].is_test).toBe(true);
  });
});
