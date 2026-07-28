import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Accessory } from "@/types/fleet";

// ---------------------------------------------------------------------------
// AccessoriesManager is the ONE accessories UI: /admin/settings/accessories and
// the fleet inventory page both render this component. It replaced two
// divergent implementations over the same useAllAccessories rows, so the tests
// that used to sit on the page (Accessories.spec.tsx) live here now.
// ---------------------------------------------------------------------------

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useFleet", () => ({
  useAllAccessories: vi.fn(),
  useAllAircraft: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/hooks/useFleetMutations", () => ({
  useDeleteAccessory: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateAccessory: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateAccessory: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { useAllAccessories } from "@/hooks/useFleet";
import AccessoriesManager from "./AccessoriesManager";

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function accessory(overrides: Partial<Accessory> = {}): Accessory {
  return {
    id: "acc-1",
    name: "ND16 Filter",
    type: "filter",
    serial_number: "SN001",
    compatible_aircraft: ["DJI Matrice 4E"],
    status: "active",
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  } as Accessory;
}

function setAccessories(data: Accessory[] | undefined, isLoading = false) {
  asMock(useAllAccessories).mockReturnValue({ data, isLoading, error: null });
}

describe("AccessoriesManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a skeleton, not a spinner, while the rows load", () => {
    setAccessories(undefined, true);
    render(<AccessoriesManager />);
    expect(screen.getByText("Loading accessories")).toBeDefined();
  });

  it("shows an empty state when the fleet has no accessories", () => {
    setAccessories([]);
    render(<AccessoriesManager />);
    expect(screen.getByText("No accessories yet")).toBeDefined();
  });

  it("renders a row per accessory", () => {
    setAccessories([accessory(), accessory({ id: "acc-2", name: "Landing Pad" })]);
    render(<AccessoriesManager />);
    // Table (md+) and card (below md) layouts both render, so each name appears
    // twice — one component, two responsive presentations.
    expect(screen.getAllByText("ND16 Filter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Landing Pad").length).toBeGreaterThan(0);
  });

  it("reads an empty compatible_aircraft list as Universal", () => {
    setAccessories([accessory({ compatible_aircraft: [] })]);
    render(<AccessoriesManager />);
    expect(screen.getAllByText("Universal").length).toBeGreaterThan(0);
  });

  it("offers the maintenance action only where the parent supplies a handler", () => {
    setAccessories([accessory()]);
    const { unmount } = render(<AccessoriesManager />);
    expect(screen.queryByLabelText("Log maintenance for ND16 Filter")).toBeNull();
    unmount();

    render(<AccessoriesManager onLogMaintenance={vi.fn()} />);
    expect(screen.getByLabelText("Log maintenance for ND16 Filter")).toBeDefined();
  });

  it("labels the row actions for screen readers", () => {
    setAccessories([accessory()]);
    render(<AccessoriesManager />);
    expect(screen.getByLabelText("Edit ND16 Filter")).toBeDefined();
    expect(screen.getByLabelText("Delete ND16 Filter")).toBeDefined();
  });
});
