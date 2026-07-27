import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import NotificationBell from "./NotificationBell";

describe("NotificationBell", () => {
  it("gives the icon-only trigger an accessible name", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});
