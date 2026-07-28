import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// WHAT THIS FILE PROVES — AND WHAT IT DOES NOT
//
// The defect was: ReportBuilder declared its own `min-h-screen` INSIDE
// AdminLayout's `min-h-screen` flex column. That stacked a second viewport
// below the nav, so the document grew past 100vh by the nav's height (scrolling
// that reveals nothing = "dead scroll") and the 3-pane row's bottom edge sat
// under the fold where the panes' own scrollbars could not reach.
//
// jsdom performs NO LAYOUT. It has no viewport, resolves no `vh`, and runs no
// flexbox algorithm. Every element here reports zero height. So this file
// CANNOT observe the symptom. What it CAN do is pin the structural contract
// that the browser's flex algorithm consumes:
//
//   - exactly ONE `min-h-screen` exists in the rendered chain, and
//   - every element between the shell root and the scrollable editor pane is
//     itself a flex container that is `flex-1 min-h-0`.
//
// Those two facts are necessary for the correct pixel behaviour. They are not
// sufficient to prove it. PIXEL VERIFICATION REMAINS OUTSTANDING and requires a
// human loading /admin/reports/<id>/edit in a real browser.
//
// Every test name below says STRUCTURE for that reason. Do not read a green run
// here as "the scroll bug is fixed".
// ---------------------------------------------------------------------------

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    in: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
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
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
  };
});

// The data layer is stubbed so the component lands on the 3-pane editor branch
// deterministically. `active_sections: []` keeps `selectedSection` null, which
// renders the empty state inside the centre pane — the pane itself, which is
// the element under test, renders either way.
//
// Every stubbed value is a STABLE SINGLETON, defined once in the factory rather
// than rebuilt per call. ReportBuilder hydrates its local state from
// `useEffect(..., [existingReport])`; handing back a fresh object identity on
// every render makes that effect re-fire forever and the run dies on an OOM
// rather than a failed assertion. Real react-query returns a stable reference,
// so this matches production behaviour — it is not a workaround for a defect.
vi.mock("@/hooks/useReportBuilder", () => {
  const TEMPLATE = {
    id: "tpl-1",
    name: "Structural Inspection",
    service_type: "inspection",
    sections_manifest: [],
  };
  const REPORT = {
    id: "rpt-1",
    title: "Report - SPEC-007",
    template_id: "tpl-1",
    status: "draft",
    section_data: {},
    active_sections: [],
    report_images: [],
  };
  const TEMPLATE_QUERY = { data: TEMPLATE, isLoading: false };
  const TEMPLATES_QUERY = { data: [], isLoading: false };
  const REPORT_QUERY = { data: REPORT, isLoading: false };
  const IDLE_MUTATION = {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue("new-report-id"),
    isPending: false,
  };
  return {
    useReportTemplates: () => TEMPLATES_QUERY,
    useReportTemplate: () => TEMPLATE_QUERY,
    useJobReport: () => REPORT_QUERY,
    useJobReports: () => TEMPLATES_QUERY,
    useCreateReport: () => IDLE_MUTATION,
    useUpdateReport: () => IDLE_MUTATION,
    useSaveReportImages: () => IDLE_MUTATION,
    useDeleteReport: () => IDLE_MUTATION,
    useGenerateReportPDF: () => IDLE_MUTATION,
  };
});

import AdminLayout from "./AdminLayout";
import ReportBuilder from "./ReportBuilder";

/** Class list as a set. `getAttribute` avoids the SVGAnimatedString trap. */
function classesOf(el: Element): Set<string> {
  return new Set((el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean));
}

function describeEl(el: Element): string {
  return `<${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}">`;
}

/** Inclusive ancestor chain from `root` down to `leaf`. */
function chainFromTo(root: Element, leaf: Element): Element[] {
  const chain: Element[] = [];
  let cur: Element | null = leaf;
  while (cur && cur !== root) {
    chain.unshift(cur);
    cur = cur.parentElement;
  }
  if (cur !== root) throw new Error("leaf is not a descendant of root");
  chain.unshift(root);
  return chain;
}

/**
 * Renders ReportBuilder through the REAL AdminLayout, at the real route.
 *
 * ProtectedRoute is intentionally absent: on its authorised path it returns
 * `<>{children}</>` and contributes no DOM. That claim is a source-level
 * assertion in its own test below rather than an assumption made here.
 */
function renderEditorInShell() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/admin/reports/rpt-1/edit"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="reports/:id/edit" element={<ReportBuilder />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The centre editor pane — the element whose scrollbar the user actually uses. */
function scrollPaneOf(container: HTMLElement): HTMLElement {
  const pane = container.querySelector("main.overflow-y-auto");
  expect(pane, "centre editor pane (main.overflow-y-auto) did not render").toBeTruthy();
  return pane as HTMLElement;
}

describe("ReportBuilder inside AdminLayout — STRUCTURE of the scroll chain (jsdom does no layout, so no pixel is asserted here)", () => {
  it("STRUCTURE: exactly one min-h-screen exists in the whole rendered shell+editor tree", () => {
    const { container } = renderEditorInShell();

    const viewports = Array.from(container.querySelectorAll('[class~="min-h-screen"]'));
    expect(
      viewports.map(describeEl),
      "a second min-h-screen nested inside the shell is the original dead-scroll defect"
    ).toHaveLength(1);

    // ...and it is the shell root, not something deeper.
    expect(viewports[0]).toBe(container.firstElementChild);
  });

  it("STRUCTURE: the shell root is the flex column that owns the viewport", () => {
    const { container } = renderEditorInShell();

    const root = container.firstElementChild as HTMLElement;
    const cls = classesOf(root);
    for (const required of ["flex", "flex-col", "min-h-screen"]) {
      expect(cls, `shell root ${describeEl(root)} is missing ${required}`).toContain(required);
    }
  });

  it("STRUCTURE: the editor root is a DIRECT child of the shell column (ErrorBoundary, Suspense and Outlet add no DOM)", () => {
    const { container } = renderEditorInShell();

    const root = container.firstElementChild as HTMLElement;
    const pane = scrollPaneOf(container);
    const chain = chainFromTo(root, pane);
    const editorRoot = chain[1];

    // If ErrorBoundary ever wrapped children in an element, or a route guard
    // introduced a div, editorRoot.parentElement would not be the shell root
    // and the flex-1 handshake would be severed.
    expect(editorRoot.parentElement, "editor root is no longer a direct flex child of the shell").toBe(root);
    expect(classesOf(editorRoot)).toContain("flex-1");

    // The nav is a SIBLING above it, so flex-1 resolves to (100vh - nav height).
    const kids = Array.from(root.children);
    expect(kids[0].tagName).toBe("HEADER");
    expect(kids).toContain(editorRoot);
  });

  it("STRUCTURE: every element between the shell root and the scroll pane is a flex container carrying flex-1 AND min-h-0", () => {
    const { container } = renderEditorInShell();

    const root = container.firstElementChild as HTMLElement;
    const pane = scrollPaneOf(container);
    const chain = chainFromTo(root, pane);

    // Strictly between root and pane. Any link missing min-h-0 lets its content
    // set a floor on its height, so the ancestor cannot shrink and the pane's
    // overflow-y-auto never engages — the content pushes the page taller
    // instead. Any link that is not itself `flex` breaks its child's flex-1.
    const intermediates = chain.slice(1, -1);
    expect(
      intermediates.length,
      `expected the shell -> editor-root -> pane-row -> pane chain, got: ${chain.map(describeEl).join(" > ")}`
    ).toBe(2);

    for (const el of intermediates) {
      const cls = classesOf(el);
      for (const required of ["flex", "flex-1", "min-h-0"]) {
        expect(
          cls,
          `${describeEl(el)} is on the scroll path but is missing ${required} — this is exactly how dead scroll comes back`
        ).toContain(required);
      }
    }
  });

  it("STRUCTURE: the pane row clips, and the scroll pane itself is the flex-1 min-w-0 scroller", () => {
    const { container } = renderEditorInShell();

    const root = container.firstElementChild as HTMLElement;
    const pane = scrollPaneOf(container);
    const chain = chainFromTo(root, pane);
    const paneRow = chain[chain.length - 2];

    // The row must clip: without overflow-hidden the panes' own scrollers are
    // free to grow the row instead of scrolling inside it.
    expect(classesOf(paneRow), `${describeEl(paneRow)} must clip its panes`).toContain("overflow-hidden");

    const paneCls = classesOf(pane);
    for (const required of ["flex-1", "min-w-0", "overflow-y-auto"]) {
      expect(paneCls, `centre pane is missing ${required}`).toContain(required);
    }
  });

  it("STRUCTURE: the side rails are shrink-0 so they cannot squeeze the centre pane", () => {
    const { container } = renderEditorInShell();

    const rails = Array.from(container.querySelectorAll("aside"));
    expect(rails.length, "expected the section rail and the preview rail").toBeGreaterThanOrEqual(1);
    for (const rail of rails) {
      expect(classesOf(rail), `${describeEl(rail)} must not flex-shrink`).toContain("shrink-0");
    }
  });

  it("STRUCTURE (source-level): nothing above AdminLayout adds a second viewport or a height/overflow rule", () => {
    // ProtectedRoute wraps AdminLayout in App.tsx. Its authorised path must stay
    // a bare fragment — its unauthorised/loading paths DO use min-h-screen, but
    // those replace the shell entirely rather than nesting it.
    const guard = readFileSync(
      resolve(process.cwd(), "src/components/ProtectedRoute.tsx"),
      "utf8"
    );
    expect(
      guard,
      "ProtectedRoute's authorised path must not wrap AdminLayout in an element"
    ).toContain("return <>{children}</>;");

    // body and #root must stay plain auto-height blocks. A height or overflow
    // rule on either would re-introduce the symptom without touching any .tsx.
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    expect(css, "#root gained styling — re-check the height chain").not.toMatch(/#root\s*\{/);
    const bodyRule = css.match(/\bbody\s*\{[^}]*\}/g) ?? [];
    for (const rule of bodyRule) {
      expect(rule, `body rule now constrains height/overflow: ${rule}`).not.toMatch(
        /height\s*:|overflow\s*:/
      );
    }
  });
});
