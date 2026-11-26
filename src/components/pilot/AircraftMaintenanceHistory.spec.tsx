import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const AIRCRAFT_ID = "11111111-2222-3333-4444-555555555555";

const aircraftRow = {
  id: AIRCRAFT_ID,
  model: "Matrice 4T",
  serial_number: "SN-TEST-1",
  nickname: "TEST aircraft",
  faa_registration: null,
  status: "active",
};

let historyRows: Record<string, unknown>[] = [];
const calls: { table: string; method: string; args: unknown[] }[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const rec = (method: string) => (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
      for (const m of ["select", "eq", "or", "order"]) chain[m] = rec(m);
      chain.maybeSingle = vi.fn(async () => ({ data: aircraftRow, error: null }));
      chain.limit = vi.fn(async () => ({ data: historyRows, error: null }));
      return chain;
    }),
  },
}));

import AircraftMaintenanceHistory from "./AircraftMaintenanceHistory";

function renderPage(id = AIRCRAFT_ID) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/admin/settings/fleet/aircraft/${id}/maintenance`]}>
        <Routes>
          <Route path="/admin/settings/fleet/aircraft/:aircraftId/maintenance" element={<AircraftMaintenanceHistory />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  calls.length = 0;
  historyRows = [];
});

describe("AircraftMaintenanceHistory", () => {
  it("shows the aircraft and an empty-history message when there are no records", async () => {
    renderPage();
    expect(await screen.findByText(/no maintenance records for this aircraft yet/i)).toBeTruthy();
    expect(screen.getByText("SN-TEST-1")).toBeTruthy();
    // FAA registration is null on the row: shown as unknown, not blank.
    expect(screen.getAllByText("unknown").length).toBeGreaterThan(0);
  });

  it("queries only this aircraft's rows and excludes TEST rows", async () => {
    renderPage();
    await screen.findByText(/no maintenance records/i);
    const mx = calls.filter(c => c.table === "maintenance_log");
    expect(mx.find(c => c.method === "or")?.args[0]).toBe(
      `aircraft_id.eq.${AIRCRAFT_ID},and(equipment_type.eq.aircraft,equipment_id.eq.${AIRCRAFT_ID})`
    );
    expect(mx.some(c => c.method === "eq" && c.args[0] === "is_test" && c.args[1] === false)).toBe(true);
  });

  it("shows unknown values explicitly instead of blanks or zeros", async () => {
    historyRows = [
      {
        id: "m1",
        equipment_id: AIRCRAFT_ID,
        equipment_type: "aircraft",
        aircraft_id: AIRCRAFT_ID,
        maintenance_type: "battery_replacement",
        description: "TEST: replaced battery pack",
        performed_at: "2026-11-20T12:00:00Z",
        flight_hours_at_service: null,
        results: null,
        performed_by_name: null,
        evidence_url: null,
        open_issues: null,
        next_due_date: null,
        next_due_flight_hours: null,
        component_id: "BATT-TEST-7",
        is_test: false,
      },
    ];
    renderPage();
    const entry = await screen.findByTestId("maintenance-entry");
    expect(entry.textContent).toContain("Battery replacement");
    expect(entry.textContent).toContain("2026-11-20");
    expect(entry.textContent).toContain("Component BATT-TEST-7");
    expect(entry.textContent).toContain("Flight hours at serviceunknown");
    expect(entry.textContent).toContain("Performed byunknown");
    expect(entry.textContent).toContain("Open issuesnone recorded");
    expect(entry.textContent).toContain("Next duenot set");
    expect(entry.textContent).toContain("Evidencenone on file");
    expect(entry.textContent).not.toContain("0.0 h");
  });

  it("does not query with an id that is not a UUID", async () => {
    renderPage("bad,id)");
    expect(await screen.findByText(/no aircraft with this id/i)).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});
