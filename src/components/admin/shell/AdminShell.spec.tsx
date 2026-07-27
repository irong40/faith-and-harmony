import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminNav from "@/pages/admin/components/AdminNav";
import AdminShell from "./AdminShell";
import {
  ADMIN_DETAIL_ROUTES,
  ADMIN_NAVIGATION,
  listAdminDestinations,
} from "./admin-navigation";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/NotificationBell", () => ({
  default: () => <button type="button" aria-label="Notifications">Notifications</button>,
}));

function renderShell(path = "/admin/work") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AdminShell />}>
          <Route
            path="/admin/work"
            element={<><h1>Company work</h1><AdminNav /></>}
          />
          <Route path="/admin/command-center" element={<h1>Command center page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminShell", () => {
  it("renders the seven approved company navigation destinations", () => {
    renderShell();
    const navigation = screen.getByRole("navigation", { name: "Company navigation" });

    expect(within(navigation).getAllByRole("link").map((link) => link.textContent?.trim()))
      .toEqual([
        "Command Center",
        "Work",
        "Revenue",
        "Operations",
        "Governance",
        "Library",
        "Settings",
      ]);
  });

  it("marks the current destination active", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Command Center" })).toHaveAttribute("data-active", "false");
  });

  it("provides command center, mobile navigation, and notification access", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Command Center" })).toHaveAttribute(
      "href",
      "/admin/command-center",
    );
    expect(screen.getByRole("button", { name: "Open company navigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("assigns every existing admin route to a section or a detail-only route", () => {
    const expectedRoutes = [
      "/admin/command-center",
      "/admin/work",
      "/admin/mission-control",
      "/admin/service-requests",
      "/admin/proposals",
      "/admin/projects",
      "/admin/drone-jobs",
      "/admin/pilots",
      "/admin/people",
      "/admin/invoices",
      "/admin/messages",
      "/admin/documents",
      "/admin/pricing",
      "/admin/settings",
      "/admin/clients",
      "/admin/jobs/new",
      "/admin/processing-templates",
      "/admin/quote-requests",
      "/admin/scheduling",
      "/admin/weather",
      "/admin/call-logs",
      "/admin/leads",
      "/admin/accessories",
      "/admin/governance",
      "/admin/contracts",
      "/admin/reports",
      "/admin/reports/new",
      "/admin/drone-jobs/:id",
      "/admin/drone-jobs/:id/delivery",
      "/admin/reports/:id/edit",
    ];

    expect([...listAdminDestinations().map((item) => item.href), ...ADMIN_DETAIL_ROUTES].sort())
      .toEqual(expectedRoutes.sort());
  });

  it("exposes the current section destinations from the header", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open Work destinations" }));

    expect(await screen.findByRole("menuitem", { name: "Company work" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Service requests" })).toBeInTheDocument();
  });

  it("suppresses the legacy top navigation inside the shell", () => {
    renderShell();

    expect(screen.queryByText("Missions")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company work" })).toBeInTheDocument();
  });
});
