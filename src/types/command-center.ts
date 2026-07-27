export const WORK_ITEM_TYPES = [
  "task",
  "approval",
  "decision",
  "risk",
  "blocker",
] as const;

export const WORK_ITEM_STATUSES = [
  "inbox",
  "planned",
  "in_progress",
  "waiting",
  "blocked",
  "needs_approval",
  "done",
  "cancelled",
] as const;

export const WORK_ITEM_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const DEPARTMENTS = [
  "executive",
  "revenue",
  "operations",
  "finance",
  "compliance",
  "marketing",
  "technology",
] as const;

export const OWNER_ACTION_STATUSES = ["blocked", "needs_approval"] as const;

export const DEPARTMENT_HEALTH = ["healthy", "watch", "blocked"] as const;
export const SYNC_DIRECTIONS = ["vault_to_crm", "crm_to_vault"] as const;
export const SYNC_STATUSES = ["running", "succeeded", "partial", "failed"] as const;

export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];
export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];
export type Department = (typeof DEPARTMENTS)[number];
export type DepartmentHealth = (typeof DEPARTMENT_HEALTH)[number];
export type SyncDirection = (typeof SYNC_DIRECTIONS)[number];
export type SyncStatus = (typeof SYNC_STATUSES)[number];
export type SourceSystem = "crm" | "obsidian" | "agent" | "manual";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  item_type: WorkItemType;
  department: Department;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  owner_id: string | null;
  created_by: string | null;
  due_at: string | null;
  completed_at: string | null;
  source_system: SourceSystem;
  source_ref: string | null;
  parent_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkItemEvent {
  id: string;
  work_item_id: string;
  event_type: string;
  actor_id: string | null;
  data: JsonValue;
  created_at: string;
}

export interface WorkItemComment {
  id: string;
  work_item_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface WorkItemLink {
  id: string;
  work_item_id: string;
  target_type: string;
  target_ref: string;
  label: string;
  created_at: string;
}

export interface DepartmentUpdate {
  id: string;
  department: Department;
  health: DepartmentHealth;
  objective: string | null;
  summary: string;
  blockers: string[];
  report_path: string | null;
  source_system: SourceSystem;
  source_ref: string | null;
  reported_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncRun {
  id: string;
  direction: SyncDirection;
  status: SyncStatus;
  proposed_count: number;
  applied_count: number;
  skipped_count: number;
  error: string | null;
  metadata: JsonValue;
  started_at: string;
  completed_at: string | null;
}

export interface WorkItemFilters {
  departments?: readonly Department[];
  types?: readonly WorkItemType[];
  statuses?: readonly WorkItemStatus[];
  priorities?: readonly WorkItemPriority[];
  ownerId?: string | null;
  sourceSystem?: SourceSystem;
  dueBefore?: string;
}

export interface CreateWorkItemInput {
  title: string;
  description?: string | null;
  item_type?: WorkItemType;
  department: Department;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  owner_id?: string | null;
  due_at?: string | null;
  source_system?: SourceSystem;
  source_ref?: string | null;
  parent_id?: string | null;
}

export interface UpdateWorkItemInput extends Partial<Omit<CreateWorkItemInput, "source_system" | "source_ref">> {
  version: number;
}

export function isTerminalWorkStatus(status: WorkItemStatus): boolean {
  return status === "done" || status === "cancelled";
}

export function isOwnerActionStatus(status: WorkItemStatus): boolean {
  return OWNER_ACTION_STATUSES.some((candidate) => candidate === status);
}
