import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const AIRCRAFT_ID = "11111111-2222-3333-4444-555555555555";

// TEST data only.
const aircraftRow = {
  id: AIRCRAFT_ID,
  model: "TEST model",
  serial_number: "SN-TEST-1",
  nickname: "TEST aircraft",
  faa_registration: null,
  firmware_version: null,
  status: "active",
};

let historyRows: Record<string, unknown>[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "or", "order"]) chain[m] = () => chain;
      chain.maybeSingle = vi.fn(async () => ({ data: aircraftRow, error: null }));
      chain.limit = vi.fn(async () => ({ data: historyRows, error: null }));
      return chain;
    }),
  },
}));

import AircraftMaintenanceRecordPrint from "./AircraftMaintenanceRecordPrint";

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/admin/settings/fleet/aircraft/${AIRCRAFT_ID}/maintenance/print`]}>
        <Routes>
          <Route path="/admin/settings/fleet/aircraft/:aircraftId/maintenance/print" element={<AircraftMaintenanceRecordPrint />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const srcDoc = async () => {
  const frame = (await screen.findByTitle(/maintenance record preview/i)) as HTMLIFrameElement;
  return frame.getAttribute("srcdoc") ?? "";
};

beforeEach(() => {
  historyRows = [];
});

describe("AircraftMaintenanceRecordPrint", () => {
  it("empty history: letterhead record with the empty message and a signature line", async () => {
    renderPage();
    const html = await srcDoc();
    expect(html).toContain("Sentinel Aerial Inspections");
    expect(html).toContain("No maintenance recorded for this aircraft in this reporting period.");
    expect(html).toContain("Reviewed by (name)");
    expect(html).toContain("not a certification");
    expect(screen.getByRole("button", { name: /print \/ save as pdf/i })).toBeTruthy();
  });

  it("shows dated history inside the chosen period only", async () => {
    historyRows = [
      { id: "a", equipment_id: AIRCRAFT_ID, equipment_type: "aircraft", aircraft_id: AIRCRAFT_ID, maintenance_type: "inspection",
        description: "TEST in-period inspection", performed_at: "2026-03-02T00:00:00Z", next_due_date: null, is_test: false },
      { id: "b", equipment_id: AIRCRAFT_ID, equipment_type: "aircraft", aircraft_id: AIRCRAFT_ID, maintenance_type: "repair",
        description: "TEST out-of-period repair", performed_at: "2025-03-02T00:00:00Z", next_due_date: null, is_test: false },
    ];
    renderPage();
    fireEvent.change(await screen.findByLabelText(/reporting period from/i), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: "2026-06-30" } });
    const html = await srcDoc();
    expect(html).toContain("TEST in-period inspection");
    expect(html).not.toContain("TEST out-of-period repair");
    expect(html).toContain("2026-01-01 to 2026-06-30");
  });

  it("refuses a period whose start is after its end", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(/reporting period from/i), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: "2026-01-01" } });
    expect(await screen.findByText(/start date on or before the end date/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: /print \/ save as pdf/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
