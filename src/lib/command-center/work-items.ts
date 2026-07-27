import { supabase } from "@/integrations/supabase/client";
import type {
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItem,
  WorkItemComment,
  WorkItemEvent,
  WorkItemFilters,
} from "@/types/command-center";

interface QueryResult<T = unknown> {
  data: T | null;
  error: unknown | null;
}

export interface CommandCenterQuery<T = unknown> extends PromiseLike<QueryResult<T>> {
  select(columns?: string): CommandCenterQuery<T>;
  insert(values: unknown): CommandCenterQuery<T>;
  update(values: unknown): CommandCenterQuery<T>;
  in(column: string, values: readonly unknown[]): CommandCenterQuery<T>;
  eq(column: string, value: unknown): CommandCenterQuery<T>;
  is(column: string, value: null): CommandCenterQuery<T>;
  lte(column: string, value: string): CommandCenterQuery<T>;
  order(column: string, options: { ascending: boolean; nullsFirst?: boolean }): CommandCenterQuery<T>;
  single(): CommandCenterQuery<T>;
  maybeSingle(): CommandCenterQuery<T>;
}

export interface CommandCenterDataClient {
  from(table: string): CommandCenterQuery;
}

const defaultClient = supabase as unknown as CommandCenterDataClient;

export class WorkItemConflictError extends Error {
  constructor() {
    super("This work item changed after it was loaded. Refresh it and try again.");
    this.name = "WorkItemConflictError";
  }
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

export function normalizeCreateWorkItemInput(input: CreateWorkItemInput) {
  const title = input.title.trim();
  if (!title) throw new Error("A work item title is required.");

  const description = input.description?.trim();

  return {
    title,
    description: description || null,
    department: input.department,
    item_type: input.item_type ?? "task",
    status: input.status ?? "inbox",
    priority: input.priority ?? "normal",
    owner_id: input.owner_id ?? null,
    due_at: input.due_at ?? null,
    source_system: input.source_system ?? "manual",
    source_ref: input.source_ref ?? null,
    parent_id: input.parent_id ?? null,
  };
}

export async function listWorkItems(
  filters: WorkItemFilters = {},
  client: CommandCenterDataClient = defaultClient,
): Promise<WorkItem[]> {
  let query = client.from("work_items").select("*");

  if (filters.departments?.length) query = query.in("department", filters.departments);
  if (filters.types?.length) query = query.in("item_type", filters.types);
  if (filters.statuses?.length) query = query.in("status", filters.statuses);
  if (filters.priorities?.length) query = query.in("priority", filters.priorities);
  if (filters.ownerId === null) query = query.is("owner_id", null);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.sourceSystem) query = query.eq("source_system", filters.sourceSystem);
  if (filters.dueBefore) query = query.lte("due_at", filters.dueBefore);

  query = query
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WorkItem[];
}

export async function getWorkItem(
  id: string,
  client: CommandCenterDataClient = defaultClient,
): Promise<WorkItem> {
  const { data, error } = await client
    .from("work_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as WorkItem;
}

export async function createWorkItem(
  input: CreateWorkItemInput,
  client: CommandCenterDataClient = defaultClient,
): Promise<WorkItem> {
  const payload = normalizeCreateWorkItemInput(input);
  const { data, error } = await client
    .from("work_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as WorkItem;
}

export async function updateWorkItem(
  id: string,
  input: UpdateWorkItemInput,
  client: CommandCenterDataClient = defaultClient,
): Promise<WorkItem> {
  const { version, ...changes } = input;
  const patch = compactRecord({
    ...changes,
    title: changes.title?.trim(),
    description: changes.description === undefined
      ? undefined
      : changes.description?.trim() || null,
  });

  const { data, error } = await client
    .from("work_items")
    .update(patch)
    .eq("id", id)
    .eq("version", version)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new WorkItemConflictError();
  return data as WorkItem;
}

export async function addWorkItemComment(
  workItemId: string,
  body: string,
  client: CommandCenterDataClient = defaultClient,
): Promise<WorkItemComment> {
  const normalizedBody = body.trim();
  if (!normalizedBody) throw new Error("A comment is required.");

  const { data, error } = await client
    .from("work_item_comments")
    .insert({ work_item_id: workItemId, body: normalizedBody })
    .select("*")
    .single();

  if (error) throw error;
  return data as WorkItemComment;
}

export async function listWorkItemActivity(
  workItemId: string,
  client: CommandCenterDataClient = defaultClient,
): Promise<WorkItemEvent[]> {
  const { data, error } = await client
    .from("work_item_events")
    .select("*")
    .eq("work_item_id", workItemId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WorkItemEvent[];
}
