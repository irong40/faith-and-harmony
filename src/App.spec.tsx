import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: { id: "admin-1" },
    isAdmin: true,
    isPilot: false,
    loading: false,
  }),
}));
vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/seo/DefaultHelmet", () => ({ default: () => null }));
vi.mock("@/components/pwa/PWAUpdatePrompt", () => ({ default: () => null }));
vi.mock("@/components/pwa/PWAInstallPrompt", () => ({ default: () => null }));
vi.mock("@/components/map/GoogleMapsProvider", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/NotificationBell", () => ({
  default: () => <button type="button" aria-label="Notifications">Notifications</button>,
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

afterEach(() => cleanup());

async function renderAt(path: string) {
  window.history.pushState({}, "", path);
  render(<App />);
  await waitFor(() => expect(window.location.pathname).not.toBe(path === "/" ? "/" : ""));
}

describe("admin routing", () => {
  it.each(["/", "/admin", "/admin/dashboard"])(
    "routes %s to the company command center",
    async (path) => {
      await renderAt(path);

      expect(await screen.findByRole("heading", { name: "Company command center" }, { timeout: 5_000 }))
        .toBeInTheDocument();
      expect(window.location.pathname).toBe("/admin/command-center");
    },
  );

  it("renders company work inside the admin shell", async () => {
    await renderAt("/admin/work");

    expect(await screen.findByRole("heading", { name: "Company work" }, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Company navigation" })).toBeInTheDocument();
  });

  it("keeps a representative legacy route available inside the shell", async () => {
    await renderAt("/admin/documents");

    expect(await screen.findByRole("navigation", { name: "Company navigation" }, { timeout: 5_000 }))
      .toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/documents");
  });
});
