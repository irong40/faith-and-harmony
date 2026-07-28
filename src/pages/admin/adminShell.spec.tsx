import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => {
  // A chainable, awaitable query builder. `order` used to be a
  // mockResolvedValue, which cannot serve MaintenanceHistory's
  // `.order(...).limit(100)` — awaiting mid-chain has to work too.
  const chain: Record<string, unknown> = {
    then: (onFulfilled: (value: unknown) => unknown) =>
      onFulfilled({ data: [], error: null }),
  };
  for (const method of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "or", "not", "gt", "gte", "lt", "lte",
    "like", "ilike", "contains", "order", "limit", "range",
    "single", "maybeSingle",
  ]) {
    chain[method] = vi.fn(() => chain);
  }
  return {
    supabase: {
      from: vi.fn(() => chain),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    },
  };
});

// FleetOverview's data layer. Mocked at the hook seam so the render test is
// about layout, not about fleet queries.
vi.mock("@/hooks/useFleet", () => ({
  useAllAircraft: () => ({ data: [], isLoading: false }),
  useAllBatteries: () => ({ data: [], isLoading: false }),
  useAllControllers: () => ({ data: [], isLoading: false }),
  useAllAccessories: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/useFleetMutations", () => ({
  useDeleteAircraft: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteBattery: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteController: () => ({ mutate: vi.fn(), isPending: false }),
}));
// FleetOverview mounts these unconditionally (they self-hide on open={false}),
// and each pulls in its own mutation hooks. None of them affect the page frame.
vi.mock("@/components/admin/AccessoriesManager", () => ({
  default: () => <div data-testid="accessories-manager" />,
}));
vi.mock("@/components/pilot/AircraftFormDialog", () => ({ default: () => null }));
vi.mock("@/components/pilot/BatteryFormDialog", () => ({ default: () => null }));
vi.mock("@/components/pilot/ControllerFormDialog", () => ({ default: () => null }));
vi.mock("@/components/pilot/MaintenanceLogDialog", () => ({ default: () => null }));

import AdminLayout from "./AdminLayout";
import FleetOverview from "@/components/pilot/FleetOverview";
import MaintenanceHistory from "@/components/pilot/MaintenanceHistory";

// ---------------------------------------------------------------------------
// The admin shell owns exactly one viewport.
//
// AdminLayout is a `min-h-screen` flex column with the nav as its first child,
// so a full-height page (ReportBuilder's 3-pane editor) can claim the leftover
// with `flex-1`. A page that declares its own `min-h-screen` inside that column
// stacks a SECOND viewport below the nav: the document grows past 100vh by the
// nav's height (scrolling that reveals nothing), and the pane row's bottom edge
// sits under the fold where its internal scrollbars cannot reach.
//
// jsdom does no layout, so these assert the class contract that produces the
// layout rather than the pixels. The pixel behaviour follows from flexbox.
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const ADMIN_PAGES_DIR = resolve(ROOT, "src/pages/admin");

/** `min-h-screen` appearing inside a className string (not in prose/comments). */
const MIN_H_SCREEN_CLASS = /className\s*=\s*"[^"]*\bmin-h-screen\b/;

const rel = (file: string) => relative(ROOT, file).replace(/\\/g, "/");

function walkTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return walkTsx(path);
    if (!entry.name.endsWith(".tsx") || entry.name.endsWith(".spec.tsx")) return [];
    return [path];
  });
}

/**
 * Components mounted as route elements under `/admin` that live OUTSIDE the
 * admin directories — derived from App.tsx rather than hardcoded, so a foreign
 * component newly mounted into the shell is picked up without editing this
 * spec.
 *
 * Fails closed: if the markers move, this throws rather than silently
 * narrowing the scan back down (which is the bug this whole file guards).
 */
function adminRouteElementFiles(): string[] {
  const src = readFileSync(resolve(ROOT, "src/App.tsx"), "utf8");

  const start = src.indexOf('path="/admin"');
  // The retired-paths array is the first thing after the admin subtree closes.
  const end = src.indexOf("{adminRedirectRoutes()}", start);
  if (start === -1 || end === -1) {
    throw new Error(
      "adminShell.spec: could not locate the /admin route subtree in src/App.tsx — " +
        "update the markers, do not delete this check."
    );
  }
  const adminBlock = src.slice(start, end);

  const lazyImports = new Map<string, string>();
  for (const [, name, path] of src.matchAll(
    /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["'](.+?)["']\s*\)\s*\)/g
  )) {
    lazyImports.set(name, path);
  }

  const files = new Set<string>();
  for (const [, name] of adminBlock.matchAll(/element=\{<(\w+)\s*\/>\}/g)) {
    const importPath = lazyImports.get(name);
    if (!importPath) continue; // eagerly-imported or inline element
    files.add(resolve(ROOT, "src", `${importPath.replace(/^\.\//, "")}.tsx`));
  }
  return [...files];
}

/**
 * Every .tsx that can render INSIDE AdminLayout.
 *
 * Inclusion rule — a file is in scope iff it can appear under the shell:
 *   1. `src/pages/admin/**` (recursive: the old scan was top-level-only, so
 *      `components/` under it was never checked), minus AdminLayout itself —
 *      the shell is the one thing that legitimately owns the viewport.
 *   2. `src/components/admin/**` — this directory is admin-only by
 *      construction; nothing outside the admin shell imports from it.
 *   3. Anything mounted as an `/admin` route element in App.tsx, wherever it
 *      lives (see adminRouteElementFiles).
 *
 * `src/components/pilot/**` is deliberately NOT swept in wholesale. Only two of
 * its files (FleetOverview, MaintenanceHistory) are mounted in the admin shell,
 * and rule 3 picks those up by name. The other ~20 render only under the pilot
 * portal routes (/pilot/*), which have no shell above them, so `min-h-screen`
 * there is correct and flagging it would be a false positive.
 */
function adminShellFiles(): string[] {
  const files = new Set<string>([
    ...walkTsx(ADMIN_PAGES_DIR).filter((f) => !f.endsWith("AdminLayout.tsx")),
    ...walkTsx(resolve(ROOT, "src/components/admin")),
    ...adminRouteElementFiles(),
  ]);
  return [...files].sort();
}

/**
 * Components that render in BOTH the admin shell and a standalone portal route,
 * and so legitimately contain a `min-h-screen` — in the branch only the
 * standalone route reaches.
 *
 * This is NOT a known-offenders allowlist. Membership buys nothing on its own:
 * each entry is held to two checks that are strictly stronger than the text
 * scan it opts out of — the `inAdmin` branch must still come first, and
 * rendering it under /admin must produce no second viewport. Deleting either
 * the branch or the shell frame turns this red.
 */
const DUAL_HOMED = [
  {
    name: "FleetOverview",
    file: "src/components/pilot/FleetOverview.tsx",
    // Also mounted bare at /pilot/fleet, where there is no shell above it and
    // `min-h-screen` is the correct way to own the viewport.
    routePath: "settings/fleet",
    element: <FleetOverview />,
    heading: /fleet inventory/i,
  },
  {
    name: "MaintenanceHistory",
    file: "src/components/pilot/MaintenanceHistory.tsx",
    // Also mounted bare at /pilot/fleet/maintenance.
    routePath: "settings/fleet/maintenance",
    element: <MaintenanceHistory />,
    heading: /maintenance log/i,
  },
];

function withProviders(initialEntry: string, routes: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            {routes}
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** AdminNav -> NotificationBell needs a query client; nothing else does. */
function renderShell() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin/reports"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="reports" element={<main data-testid="page">page</main>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("admin shell", () => {
  it("renders a min-h-screen flex column, not a plain block", () => {
    const { container } = renderShell();

    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    for (const cls of ["flex", "flex-col", "min-h-screen"]) {
      expect(root.className.split(/\s+/), `shell root is missing ${cls}`).toContain(cls);
    }
  });

  it("puts the nav and the routed page in the same flex column", () => {
    const { container } = renderShell();

    const root = container.firstElementChild as HTMLElement;
    const children = Array.from(root.children);
    // ErrorBoundary and Suspense render no DOM, so the page element must be a
    // direct child of the column — that is what lets it use `flex-1`.
    expect(children[0].tagName).toBe("HEADER");
    expect(children.some((c) => c.getAttribute("data-testid") === "page")).toBe(true);
  });

  it("the scan actually reaches nested dirs and shell-mounted components", () => {
    const scanned = adminShellFiles().map(rel);
    // Regression pins for the bug this scan had: top-level-only readdir.
    expect(scanned).toContain("src/pages/admin/components/ReportSectionNav.tsx");
    expect(scanned).toContain("src/components/admin/PageShell.tsx");
    expect(scanned).toContain("src/components/pilot/FleetOverview.tsx");
    expect(scanned).toContain("src/components/pilot/MaintenanceHistory.tsx");
    // ...and the pilot-portal-only components stay OUT.
    expect(scanned).not.toContain("src/components/pilot/PreFlightAccordion.tsx");
  });

  it("nothing under the shell declares its own min-h-screen wrapper", () => {
    const dualHomed = new Set(DUAL_HOMED.map((page) => page.file));
    const offenders = adminShellFiles()
      .map(rel)
      .filter((file) => !dualHomed.has(file))
      .filter((file) => MIN_H_SCREEN_CLASS.test(readFileSync(resolve(ROOT, file), "utf8")));
    expect(
      offenders,
      `these nest a second viewport inside AdminLayout: ${offenders.join(", ")}`
    ).toEqual([]);
  });

  // The text scan cannot see which BRANCH a class sits in, so the dual-homed
  // pages get checked on structure and then on actual rendered output.
  it.each(DUAL_HOMED)("$name reaches its shell frame before any min-h-screen", ({ file }) => {
    const src = readFileSync(resolve(ROOT, file), "utf8");
    const guard = src.search(/if\s*\(\s*inAdmin\s*\)/);
    const viewport = src.search(MIN_H_SCREEN_CLASS);

    expect(guard, `${file} lost its inAdmin branch — it now renders one way everywhere`).toBeGreaterThan(-1);
    expect(
      viewport,
      `${file}: min-h-screen is reachable under /admin. It must sit after the ` +
        `inAdmin early return, which returns the shared PageShell frame.`
    ).toBeGreaterThan(guard);
  });

  it.each(DUAL_HOMED)("$name renders one viewport when mounted in the shell", async ({ routePath, element, heading }) => {
    const { container, findByRole } = withProviders(
      `/admin/${routePath}`,
      <Route path={routePath} element={element} />
    );

    // Positive assertion FIRST. A crash here would be swallowed by
    // AdminLayout's ErrorBoundary, whose fallback contains no min-h-screen —
    // the viewport check below would then pass for entirely the wrong reason.
    await findByRole("heading", { level: 1, name: heading });

    const shellRoot = container.firstElementChild;
    const nested = Array.from(container.querySelectorAll(".min-h-screen"))
      .filter((el) => el !== shellRoot)
      .map((el) => `<${el.tagName.toLowerCase()} class="${el.className}">`);

    expect(nested, "a second viewport is nested inside AdminLayout").toEqual([]);
  });

  it("the report editor claims the leftover column height instead", () => {
    const src = readFileSync(resolve(ADMIN_PAGES_DIR, "ReportBuilder.tsx"), "utf8");
    // The 3-pane root must be flex-1 + min-h-0 (shrinkable) and the pane row
    // must clip, or the panes' own overflow-y-auto never engages.
    expect(src).toContain("flex min-h-0 flex-1 flex-col");
    expect(src).toContain("flex min-h-0 flex-1 overflow-hidden");
  });

  it("no pane sizes itself off the viewport with a calc(100vh - …) guess", () => {
    const files = [
      resolve(process.cwd(), "src/pages/admin/components/ReportSectionNav.tsx"),
      resolve(process.cwd(), "src/components/reports/ReportPreview.tsx"),
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} still guesses at the viewport height`).not.toMatch(
        /className\s*=\s*"[^"]*100vh/
      );
    }
  });
});
