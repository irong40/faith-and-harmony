export type SyncMode = "dry_run" | "apply";
export type SyncSource = "obsidian" | "agent";

export interface SyncWorkProposal {
  source_ref: string;
  title: string;
  description: string | null;
  item_type: "task" | "approval" | "decision" | "risk" | "blocker";
  department: "executive" | "revenue" | "operations" | "finance" | "compliance" | "marketing" | "technology";
  priority: "low" | "normal" | "high" | "urgent";
  due_at: string | null;
}

export interface SyncDepartmentProposal {
  source_ref: string;
  department: SyncWorkProposal["department"];
  health: "healthy" | "watch" | "blocked";
  objective: string | null;
  summary: string;
  blockers: string[];
  report_path: string | null;
  reported_at: string;
}

export interface CommandCenterSyncPayload {
  mode: SyncMode;
  source: SyncSource;
  work_items: SyncWorkProposal[];
  department_updates: SyncDepartmentProposal[];
}

export type SyncValidation =
  | { valid: true; value: CommandCenterSyncPayload; issues: [] }
  | { valid: false; issues: string[] };

const itemTypes = new Set(["task", "approval", "decision", "risk", "blocker"]);
const departments = new Set(["executive", "revenue", "operations", "finance", "compliance", "marketing", "technology"]);
const priorities = new Set(["low", "normal", "high", "urgent"]);
const healthStates = new Set(["healthy", "watch", "blocked"]);
const topFields = new Set(["mode", "source", "work_items", "department_updates"]);
const workFields = new Set(["source_ref", "title", "description", "item_type", "department", "priority", "due_at"]);
const departmentFields = new Set(["source_ref", "department", "health", "objective", "summary", "blockers", "report_path", "reported_at"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unexpectedFields(value: Record<string, unknown>, allowed: Set<string>, prefix: string): string[] {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key} is not allowed`);
}

export function validateSyncPayload(input: unknown): SyncValidation {
  const issues: string[] = [];
  if (!record(input)) return { valid: false, issues: ["payload must be an object"] };
  issues.push(...unexpectedFields(input, topFields, "payload"));

  const mode = input.mode;
  const source = input.source;
  if (mode !== "dry_run" && mode !== "apply") issues.push("mode must be dry_run or apply");
  if (source !== "obsidian" && source !== "agent") issues.push("source must be obsidian or agent");
  if (!Array.isArray(input.work_items)) issues.push("work_items must be an array");
  if (!Array.isArray(input.department_updates)) issues.push("department_updates must be an array");

  const workItems: SyncWorkProposal[] = [];
  const workRefs = new Set<string>();
  if (Array.isArray(input.work_items)) {
    input.work_items.forEach((candidate, index) => {
      const prefix = `work_items[${index}]`;
      if (!record(candidate)) {
        issues.push(`${prefix} must be an object`);
        return;
      }
      issues.push(...unexpectedFields(candidate, workFields, prefix));
      const sourceRef = text(candidate.source_ref);
      const title = text(candidate.title);
      const itemType = text(candidate.item_type) || "task";
      const department = text(candidate.department);
      const priority = text(candidate.priority) || "normal";
      const dueAt = text(candidate.due_at) || null;
      if (!sourceRef) issues.push(`${prefix}.source_ref is required`);
      if (sourceRef && workRefs.has(sourceRef)) issues.push(`${prefix}.source_ref is duplicated`);
      if (!title) issues.push(`${prefix}.title is required`);
      if (!itemTypes.has(itemType)) issues.push(`${prefix}.item_type is invalid`);
      if (!departments.has(department)) issues.push(`${prefix}.department is invalid`);
      if (!priorities.has(priority)) issues.push(`${prefix}.priority is invalid`);
      if (dueAt && Number.isNaN(Date.parse(dueAt))) issues.push(`${prefix}.due_at must be ISO date time`);
      if (sourceRef) workRefs.add(sourceRef);
      workItems.push({
        source_ref: sourceRef,
        title,
        description: text(candidate.description) || null,
        item_type: itemType as SyncWorkProposal["item_type"],
        department: department as SyncWorkProposal["department"],
        priority: priority as SyncWorkProposal["priority"],
        due_at: dueAt,
      });
    });
  }

  const departmentUpdates: SyncDepartmentProposal[] = [];
  const reportRefs = new Set<string>();
  if (Array.isArray(input.department_updates)) {
    input.department_updates.forEach((candidate, index) => {
      const prefix = `department_updates[${index}]`;
      if (!record(candidate)) {
        issues.push(`${prefix} must be an object`);
        return;
      }
      issues.push(...unexpectedFields(candidate, departmentFields, prefix));
      const sourceRef = text(candidate.source_ref);
      const department = text(candidate.department);
      const health = text(candidate.health);
      const summary = text(candidate.summary);
      const reportedAt = text(candidate.reported_at);
      const blockers = Array.isArray(candidate.blockers)
        ? candidate.blockers.map(text).filter(Boolean)
        : [];
      if (!sourceRef) issues.push(`${prefix}.source_ref is required`);
      if (sourceRef && reportRefs.has(sourceRef)) issues.push(`${prefix}.source_ref is duplicated`);
      if (!departments.has(department)) issues.push(`${prefix}.department is invalid`);
      if (!healthStates.has(health)) issues.push(`${prefix}.health is invalid`);
      if (!summary) issues.push(`${prefix}.summary is required`);
      if (!reportedAt || Number.isNaN(Date.parse(reportedAt))) issues.push(`${prefix}.reported_at must be ISO date time`);
      if (sourceRef) reportRefs.add(sourceRef);
      departmentUpdates.push({
        source_ref: sourceRef,
        department: department as SyncDepartmentProposal["department"],
        health: health as SyncDepartmentProposal["health"],
        objective: text(candidate.objective) || null,
        summary,
        blockers,
        report_path: text(candidate.report_path) || null,
        reported_at: reportedAt,
      });
    });
  }

  if (issues.length) return { valid: false, issues };
  return {
    valid: true,
    issues: [],
    value: {
      mode: mode as SyncMode,
      source: source as SyncSource,
      work_items: workItems,
      department_updates: departmentUpdates,
    },
  };
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signSyncBody(body: string, timestamp: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifySyncSignature(
  body: string,
  timestamp: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!body || !timestamp || !signature || !secret) return false;
  const expected = await signSyncBody(body, timestamp, secret);
  return constantTimeEqual(expected.toLowerCase(), signature.toLowerCase());
}

export function isFreshSyncTimestamp(timestamp: string, now = Date.now(), toleranceMs = 5 * 60_000): boolean {
  const value = Number(timestamp);
  return Number.isFinite(value) && Math.abs(now - value) <= toleranceMs;
}

interface ExistingWork { source_ref: string; title: string }
interface ExistingDepartment { source_ref: string; summary: string }
interface SyncConflict { source_ref: string; existing: string; incoming: string }

export interface SyncWorkInsert extends SyncWorkProposal {
  source_system: SyncSource;
  status: "inbox";
}

export interface SyncDepartmentInsert extends SyncDepartmentProposal {
  source_system: SyncSource;
}

export interface SyncRunRecord {
  direction: "vault_to_crm";
  status: "succeeded" | "partial";
  proposed_count: number;
  applied_count: number;
  skipped_count: number;
  error: string | null;
  metadata: Record<string, unknown>;
  completed_at: string;
}

export interface SyncStore {
  findExistingWork(sourceRefs: string[]): Promise<ExistingWork[]>;
  findExistingDepartments(sourceRefs: string[]): Promise<ExistingDepartment[]>;
  insertWork(rows: SyncWorkInsert[]): Promise<void>;
  insertDepartments(rows: SyncDepartmentInsert[]): Promise<void>;
  recordRun(run: SyncRunRecord): Promise<void>;
}

export function planSync(
  payload: CommandCenterSyncPayload,
  existingWork: readonly ExistingWork[],
  existingDepartments: readonly ExistingDepartment[],
) {
  const workByRef = new Map(existingWork.map((item) => [item.source_ref, item]));
  const departmentByRef = new Map(existingDepartments.map((item) => [item.source_ref, item]));
  const work = { toInsert: [] as SyncWorkProposal[], skipped: [] as string[], conflicts: [] as SyncConflict[] };
  const departmentPlan = { toInsert: [] as SyncDepartmentProposal[], skipped: [] as string[], conflicts: [] as SyncConflict[] };

  for (const proposal of payload.work_items) {
    const existing = workByRef.get(proposal.source_ref);
    if (!existing) work.toInsert.push(proposal);
    else if (existing.title === proposal.title) work.skipped.push(proposal.source_ref);
    else work.conflicts.push({ source_ref: proposal.source_ref, existing: existing.title, incoming: proposal.title });
  }

  for (const proposal of payload.department_updates) {
    const existing = departmentByRef.get(proposal.source_ref);
    if (!existing) departmentPlan.toInsert.push(proposal);
    else if (existing.summary === proposal.summary) departmentPlan.skipped.push(proposal.source_ref);
    else departmentPlan.conflicts.push({ source_ref: proposal.source_ref, existing: existing.summary, incoming: proposal.summary });
  }

  return {
    apply: payload.mode === "apply",
    work,
    departments: departmentPlan,
    wouldApply: work.toInsert.length + departmentPlan.toInsert.length,
  };
}

export async function executeSync(payload: CommandCenterSyncPayload, store: SyncStore) {
  const [existingWork, existingDepartments] = await Promise.all([
    store.findExistingWork(payload.work_items.map((item) => item.source_ref)),
    store.findExistingDepartments(payload.department_updates.map((item) => item.source_ref)),
  ]);
  const plan = planSync(payload, existingWork, existingDepartments);
  const workRows = plan.work.toInsert.map((item): SyncWorkInsert => ({
    ...item,
    source_system: payload.source,
    status: "inbox",
  }));
  const departmentRows = plan.departments.toInsert.map((item): SyncDepartmentInsert => ({
    ...item,
    source_system: payload.source,
  }));

  if (plan.apply) {
    if (workRows.length) await store.insertWork(workRows);
    if (departmentRows.length) await store.insertDepartments(departmentRows);
  }

  const conflicts = [...plan.work.conflicts, ...plan.departments.conflicts];
  const applied = plan.apply ? workRows.length + departmentRows.length : 0;
  const proposed = payload.work_items.length + payload.department_updates.length;
  const skipped = plan.work.skipped.length + plan.departments.skipped.length;
  await store.recordRun({
    direction: "vault_to_crm",
    status: conflicts.length ? "partial" : "succeeded",
    proposed_count: proposed,
    applied_count: applied,
    skipped_count: skipped,
    error: conflicts.length ? `${conflicts.length} source conflict(s)` : null,
    metadata: {
      mode: payload.mode,
      source: payload.source,
      conflicts,
      would_apply: plan.wouldApply,
    },
    completed_at: new Date().toISOString(),
  });

  return {
    mode: payload.mode,
    applied,
    wouldApply: plan.wouldApply,
    skipped,
    conflicts,
    work: plan.work,
    departments: plan.departments,
  };
}
