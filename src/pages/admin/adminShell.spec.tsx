import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
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
}));

import AdminLayout from "./AdminLayout";

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

const ADMIN_PAGES_DIR = resolve(process.cwd(), "src/pages/admin");

/** `min-h-screen` appearing inside a className string (not in prose/comments). */
const MIN_H_SCREEN_CLASS = /className\s*=\s*"[^"]*\bmin-h-screen\b/;

function adminPageFiles(): string[] {
  return readdirSync(ADMIN_PAGES_DIR)
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".spec.tsx"))
    .filter((f) => f !== "AdminLayout.tsx"); // the shell is the one that owns it
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

  it("no admin page declares its own min-h-screen wrapper", () => {
    const offenders = adminPageFiles().filter((file) =>
      MIN_H_SCREEN_CLASS.test(readFileSync(resolve(ADMIN_PAGES_DIR, file), "utf8"))
    );
    expect(
      offenders,
      `these nest a second viewport inside AdminLayout: ${offenders.join(", ")}`
    ).toEqual([]);
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
