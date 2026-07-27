import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminNav from "@/pages/admin/components/AdminNav";
import AdminShell from "./AdminShell";

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

  it("suppresses the legacy top navigation inside the shell", () => {
    renderShell();

    expect(screen.queryByText("Missions")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company work" })).toBeInTheDocument();
  });
});
