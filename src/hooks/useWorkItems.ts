import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addWorkItemComment,
  createWorkItem,
  getWorkItem,
  listWorkItemActivity,
  listWorkItems,
  updateWorkItem,
} from "@/lib/command-center/work-items";
import type {
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItem,
  WorkItemFilters,
} from "@/types/command-center";

export const workItemKeys = {
  all: ["work-items"] as const,
  lists: () => ["work-items", "list"] as const,
  list: (filters: WorkItemFilters) => ["work-items", "list", filters] as const,
  details: () => ["work-items", "detail"] as const,
  detail: (id: string) => ["work-items", "detail", id] as const,
  activity: (id: string) => ["work-items", "activity", id] as const,
};

export function useWorkItems(filters: WorkItemFilters = {}) {
  return useQuery({
    queryKey: workItemKeys.list(filters),
    queryFn: () => listWorkItems(filters),
    staleTime: 30_000,
  });
}

export function useWorkItem(id: string) {
  return useQuery({
    queryKey: workItemKeys.detail(id),
    queryFn: () => getWorkItem(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useWorkItemActivity(id: string) {
  return useQuery({
    queryKey: workItemKeys.activity(id),
    queryFn: () => listWorkItemActivity(id),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkItemInput) => createWorkItem(input),
    onSuccess: (item) => {
      queryClient.setQueryData(workItemKeys.detail(item.id), item);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: workItemKeys.lists() }),
  });
}

interface UpdateMutationInput {
  id: string;
  input: UpdateWorkItemInput;
}

interface UpdateMutationContext {
  previousLists: Array<[readonly unknown[], WorkItem[] | undefined]>;
  previousDetail: WorkItem | undefined;
}

export function useUpdateWorkItem() {
  const queryClient = useQueryClient();

  return useMutation<WorkItem, Error, UpdateMutationInput, UpdateMutationContext>({
    mutationFn: ({ id, input }) => updateWorkItem(id, input),
    onMutate: async ({ id, input }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: workItemKeys.lists() }),
        queryClient.cancelQueries({ queryKey: workItemKeys.detail(id) }),
      ]);

      const previousLists = queryClient.getQueriesData<WorkItem[]>({
        queryKey: workItemKeys.lists(),
      });
      const previousDetail = queryClient.getQueryData<WorkItem>(workItemKeys.detail(id));
      const optimisticChanges = Object.fromEntries(
        Object.entries(input).filter(([key, value]) => key !== "version" && value !== undefined),
      );

      queryClient.setQueriesData<WorkItem[]>(
        { queryKey: workItemKeys.lists() },
        (items) => items?.map((item) => (
          item.id === id ? { ...item, ...optimisticChanges } : item
        )),
      );
      queryClient.setQueryData<WorkItem>(
        workItemKeys.detail(id),
        (item) => item ? { ...item, ...optimisticChanges } : item,
      );

      return { previousLists, previousDetail };
    },
    onError: (_error, { id }, context) => {
      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(workItemKeys.detail(id), context?.previousDetail);
    },
    onSuccess: (item) => {
      queryClient.setQueryData(workItemKeys.detail(item.id), item);
      queryClient.setQueriesData<WorkItem[]>(
        { queryKey: workItemKeys.lists() },
        (items) => items?.map((candidate) => candidate.id === item.id ? item : candidate),
      );
    },
    onSettled: (_data, _error, { id }) => Promise.all([
      queryClient.invalidateQueries({ queryKey: workItemKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: workItemKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: workItemKeys.activity(id) }),
    ]),
  });
}

export function useAddWorkItemComment(workItemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => addWorkItemComment(workItemId, body),
    onSettled: () => queryClient.invalidateQueries({
      queryKey: workItemKeys.activity(workItemId),
    }),
  });
}
