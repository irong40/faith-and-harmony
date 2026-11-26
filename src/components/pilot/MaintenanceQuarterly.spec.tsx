import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const A1 = "11111111-2222-3333-4444-555555555555";
const A2 = "66666666-7777-8888-9999-000000000000";

let rows: Record<string, Record<string, unknown>[]> = {};
const inserts: { table: string; payload: unknown }[] = [];

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const filters: [string, unknown][] = [];
      for (const m of ["select", "or", "order", "limit"]) chain[m] = () => chain;
      // .eq filters like PostgREST does, so a status filter in a hook is visible to the test.
      chain.eq = (col: string, val: unknown) => {
        filters.push([col, val]);
        return chain;
      };
      chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({
          data: ((rows[table] ?? []) as Record<string, unknown>[]).filter((r) =>
            filters.every(([c, v]) => r[c] === undefined || r[c] === v)
          ),
          error: null,
        }).then(res, rej);
      chain.insert = (payload: unknown) => {
        inserts.push({ table, payload });
        return chain;
      };
      chain.single = async () => ({ data: inserts[inserts.length - 1]?.payload, error: null });
      return chain;
    }),
  },
}));

import MaintenanceQuarterly from "./MaintenanceQuarterly";

const aircraft = [
  { id: A1, model: "Mini 4 Pro", serial_number: "SN-TEST-1", nickname: "TEST one", status: "active" },
  { id: A2, model: "Matrice 4E", serial_number: "SN-TEST-2", nickname: "TEST two", status: "active" },
];

const entry = (over: Record<string, unknown>) => ({
  id: "e1",
  aircraft_id: A1,
  equipment_type: "aircraft",
  equipment_id: A1,
  maintenance_type: "inspection",
  performed_at: "2019-12-01T12:00:00Z",
  description: "TEST pre-season inspection",
  next_due_date: null,
  next_due_flight_hours: null,
  open_issues: null,
  component_id: null,
  is_test: false,
  ...over,
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <MaintenanceQuarterly />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const cardFor = async (name: string) =>
  (await screen.findAllByTestId("quarterly-aircraft")).find((c) => c.textContent?.includes(name)) as HTMLElement;

beforeEach(() => {
  rows = { aircraft, maintenance_log: [], aircraft_flight_hours: [] };
  inserts.length = 0;
});

describe("MaintenanceQuarterly", () => {
  it("keeps grounded and in-maintenance aircraft in the view and the hours selector; leaves out retired", async () => {
    rows.aircraft = [
      ...aircraft,
      { id: "00000000-0000-4000-8000-0000000000a3", model: "TEST grounded model", serial_number: "SN-TEST-3", nickname: "TEST grounded", status: "grounded" },
      { id: "00000000-0000-4000-8000-0000000000a4", model: "TEST shop model", serial_number: "SN-TEST-4", nickname: "TEST in shop", status: "maintenance" },
      { id: "00000000-0000-4000-8000-0000000000a5", model: "TEST retired model", serial_number: "SN-TEST-5", nickname: "TEST retired", status: "retired" },
    ];
    renderPage();
    expect(await cardFor("TEST grounded")).toBeTruthy();
    expect(await cardFor("TEST in shop")).toBeTruthy();
    const names = (await screen.findAllByTestId("quarterly-aircraft")).map((c) => c.textContent ?? "");
    expect(names.some((t) => t.includes("TEST retired"))).toBe(false);
    const options = Array.from(document.querySelectorAll("option")).map((o) => o.textContent ?? "");
    expect(options.some((t) => t.includes("TEST grounded"))).toBe(true);
    expect(options.some((t) => t.includes("TEST retired"))).toBe(false);
  });

  it("shows 'no maintenance recorded' for an aircraft with no history, not a blank", async () => {
    renderPage();
    const card = await cardFor("TEST two");
    expect(within(card).getAllByText("no maintenance recorded").length).toBeGreaterThanOrEqual(2);
    expect(within(card).getByTestId("flight-activity").textContent).toMatch(/flight hours unknown/);
  });

  it("marks a past next-due date as overdue", async () => {
    rows.maintenance_log = [entry({ next_due_date: "2020-01-01" })];
    renderPage();
    const card = await cardFor("TEST one");
    expect(within(card).getByTestId("upcoming-item").textContent).toMatch(/by 2020-01-01:\s*overdue/);
    expect(within(card).getByText(/2019-12-01/)).toBeTruthy();
  });

  it("says a flight-hour threshold cannot be computed when hours are unknown", async () => {
    rows.maintenance_log = [entry({ next_due_flight_hours: 50, open_issues: "TEST prop nick" })];
    renderPage();
    const card = await cardFor("TEST one");
    expect(within(card).getByTestId("upcoming-item").textContent).toMatch(/cannot be computed, hours unknown/);
    expect(within(card).getByText(/TEST prop nick/)).toBeTruthy();
  });

  it("shows a flight-hours reading as flight activity with its source, separate from maintenance", async () => {
    rows.maintenance_log = [entry({ next_due_flight_hours: 50 })];
    rows.aircraft_flight_hours = [
      { id: "r1", aircraft_id: A1, total_flight_hours: 60, as_of_date: "2026-09-06", source: "manual",
        source_detail: "TEST", entered_by: null, entered_by_name: "TEST person", entered_at: "2026-11-24T10:00:00Z", is_test: false },
    ];
    renderPage();
    const card = await cardFor("TEST one");
    expect(within(card).getByTestId("upcoming-item").textContent).toMatch(/overdue/);
    const fa = within(card).getByTestId("flight-activity").textContent ?? "";
    expect(fa).toMatch(/not evidence of maintenance/);
    expect(fa).toMatch(/as of 2026-09-06/);
    expect(fa).toMatch(/entered by TEST person/);
    // The reading did not become a service entry.
    expect(within(card).getByText(/2019-12-01/)).toBeTruthy();
  });

  it("refuses a manual reading without who entered it, then saves it stamped", async () => {
    renderPage();
    await cardFor("TEST one");
    fireEvent.change(screen.getByLabelText("Aircraft"), { target: { value: A1 } });
    fireEvent.change(screen.getByLabelText("Total flight hours"), { target: { value: "27.1" } });
    fireEvent.change(screen.getByLabelText("As of date"), { target: { value: "2026-09-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Save reading" }));
    expect(await screen.findByText(/Enter who is entering this reading/)).toBeTruthy();
    expect(inserts).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Entered by"), { target: { value: "TEST person" } });
    fireEvent.click(screen.getByRole("button", { name: "Save reading" }));
    await vi.waitFor(() => expect(inserts).toHaveLength(1));
    const p = inserts[0].payload as Record<string, unknown>;
    expect(inserts[0].table).toBe("aircraft_flight_hours");
    expect(p).toMatchObject({ aircraft_id: A1, total_flight_hours: 27.1, source: "manual", entered_by: "user-1", entered_by_name: "TEST person" });
    expect(typeof p.entered_at).toBe("string");
  });
});
