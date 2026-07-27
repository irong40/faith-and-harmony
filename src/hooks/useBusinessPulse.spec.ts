import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const snapshot = { metrics: {}, capturedAt: "2026-07-27T16:00:00.000Z" };
const loadBusinessPulse = vi.hoisted(() => vi.fn());
loadBusinessPulse.mockResolvedValue(snapshot);
vi.mock("@/lib/command-center/business-pulse", () => ({ loadBusinessPulse }));

import { businessPulseKey, useBusinessPulse } from "./useBusinessPulse";

describe("useBusinessPulse", () => {
  it("loads a live snapshot under a stable query key", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useBusinessPulse(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(businessPulseKey)).toEqual(snapshot);
  });
});
