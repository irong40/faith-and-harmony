import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkItem } from "@/types/command-center";

const repository = vi.hoisted(() => ({
  listWorkItems: vi.fn(),
  getWorkItem: vi.fn(),
  createWorkItem: vi.fn(),
  updateWorkItem: vi.fn(),
  addWorkItemComment: vi.fn(),
  listWorkItemActivity: vi.fn(),
}));

vi.mock("@/lib/command-center/work-items", () => repository);

import {
  useCreateWorkItem,
  useUpdateWorkItem,
  useWorkItems,
  workItemKeys,
} from "./useWorkItems";

const workItem: WorkItem = {
  id: "work-1",
  title: "Approve quote",
  description: null,
  item_type: "approval",
  department: "revenue",
  status: "needs_approval",
  priority: "urgent",
  owner_id: null,
  created_by: "user-1",
  due_at: null,
  completed_at: null,
  source_system: "crm",
  source_ref: "quote-1",
  parent_id: null,
  version: 1,
  created_at: "2026-07-27T12:00:00.000Z",
  updated_at: "2026-07-27T12:00:00.000Z",
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(
    QueryClientProvider,
    { client: queryClient },
    children,
  );
  return { queryClient, wrapper };
}

describe("work item hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listWorkItems.mockResolvedValue([workItem]);
  });

  it("uses filter-specific list keys", async () => {
    const filters = { departments: ["revenue"] as const };
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useWorkItems(filters), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repository.listWorkItems).toHaveBeenCalledWith(filters);
    expect(queryClient.getQueryData(workItemKeys.list(filters))).toEqual([workItem]);
  });

  it("invalidates work item lists after a successful create", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    repository.createWorkItem.mockResolvedValue(workItem);
    const { result } = renderHook(() => useCreateWorkItem(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: "Approve quote", department: "revenue" });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: workItemKeys.lists() });
  });

  it("optimistically updates list and detail caches", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(workItemKeys.list({}), [workItem]);
    queryClient.setQueryData(workItemKeys.detail(workItem.id), workItem);
    let finishUpdate: (value: WorkItem) => void = () => undefined;
    repository.updateWorkItem.mockReturnValue(new Promise((resolve) => { finishUpdate = resolve; }));
    const { result } = renderHook(() => useUpdateWorkItem(), { wrapper });

    let mutation: Promise<WorkItem>;
    act(() => {
      mutation = result.current.mutateAsync({
        id: workItem.id,
        input: { status: "in_progress", version: workItem.version },
      });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<WorkItem[]>(workItemKeys.list({}))?.[0].status)
        .toBe("in_progress");
    });
    expect(queryClient.getQueryData<WorkItem>(workItemKeys.detail(workItem.id))?.status)
      .toBe("in_progress");

    finishUpdate({ ...workItem, status: "in_progress", version: 2 });
    await act(async () => mutation);
  });

  it("rolls optimistic changes back when an update fails", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(workItemKeys.list({}), [workItem]);
    queryClient.setQueryData(workItemKeys.detail(workItem.id), workItem);
    repository.updateWorkItem.mockRejectedValue(new Error("Update failed"));
    const { result } = renderHook(() => useUpdateWorkItem(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({
        id: workItem.id,
        input: { status: "done", version: workItem.version },
      })).rejects.toThrow("Update failed");
    });

    expect(queryClient.getQueryData<WorkItem[]>(workItemKeys.list({}))).toEqual([workItem]);
    expect(queryClient.getQueryData<WorkItem>(workItemKeys.detail(workItem.id))).toEqual(workItem);
  });
});
