import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const listDepartmentUpdates = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/lib/command-center/departments", () => ({ listDepartmentUpdates }));

import { departmentUpdateKey, useDepartmentUpdates } from "./useDepartmentUpdates";

describe("useDepartmentUpdates", () => {
  it("loads latest department reports under a stable query key", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
    const { result } = renderHook(() => useDepartmentUpdates(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listDepartmentUpdates).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(departmentUpdateKey)).toEqual([]);
  });
});
