import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rows = [
  {
    id: "m1",
    equipment_id: "a1",
    equipment_type: "aircraft",
    maintenance_type: "calibration",
    description: "IMU calibration",
    performed_at: "2026-07-21T12:00:00Z",
    cost_cents: 0,
    parts_used: null,
    next_due_date: null,
    notes: null,
  },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    })),
  },
}));

import MaintenanceHistory from "./MaintenanceHistory";

// ---------------------------------------------------------------------------
// One component, two homes. /pilot/fleet/maintenance keeps its own
// `min-h-screen` + sticky header; /admin/settings/fleet/maintenance must NOT,
// because AdminLayout already supplies both — a second one nests a viewport
// and a second sticky bar inside the admin shell.
//
// The admin route exists at all because Fleet's History button used to jump to
// /pilot/fleet/maintenance, whose only Back link goes to /pilot/fleet: a
// one-way exit out of the admin portal.
// ---------------------------------------------------------------------------

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<MaintenanceHistory />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MaintenanceHistory", () => {
  it("renders the pilot chrome outside /admin", () => {
    const { container } = renderAt("/pilot/fleet/maintenance");
    expect(container.querySelector(".min-h-screen")).not.toBeNull();
    expect(container.querySelector("header")).not.toBeNull();
    expect(screen.getByText("Maintenance Log")).toBeTruthy();
  });

  it("drops its own viewport and sticky header inside /admin", () => {
    const { container } = renderAt("/admin/settings/fleet/maintenance");
    expect(container.querySelector(".min-h-screen")).toBeNull();
    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByText("Maintenance Log")).toBeTruthy();
  });

  it("offers a way back INTO admin, not out to the pilot portal", () => {
    const { container } = renderAt("/admin/settings/fleet/maintenance");
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/admin/settings/fleet");
    expect(hrefs.some((h) => h?.startsWith("/pilot"))).toBe(false);
  });
});
