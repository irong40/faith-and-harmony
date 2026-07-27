import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const loadRecentActivity = vi.hoisted(() => vi.fn().mockResolvedValue({ items: [], errors: [] }));
vi.mock("@/lib/command-center/recent-activity", () => ({ loadRecentActivity }));

import { recentActivityKey, useRecentActivity } from "./useRecentActivity";

describe("useRecentActivity", () => {
  it("loads normalized activity under a stable query key", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useRecentActivity(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(recentActivityKey)).toEqual({ items: [], errors: [] });
  });
});
