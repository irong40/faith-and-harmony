import { supabase } from "@/integrations/supabase/client";
import {
  DEPARTMENTS,
  type Department,
  type DepartmentHealth,
  type DepartmentUpdate,
} from "@/types/command-center";

interface DepartmentQueryResult {
  data: unknown | null;
  error: unknown | null;
}

interface DepartmentQuery extends PromiseLike<DepartmentQueryResult> {
  select(columns?: string): DepartmentQuery;
  order(column: string, options: { ascending: boolean }): DepartmentQuery;
}

export interface DepartmentDataClient {
  from(table: string): DepartmentQuery;
}

const defaultClient = supabase as unknown as DepartmentDataClient;

export type DepartmentReportState = DepartmentHealth | "stale" | "missing";

export function latestDepartmentUpdates(updates: readonly DepartmentUpdate[]): DepartmentUpdate[] {
  const latest = new Map<Department, DepartmentUpdate>();

  for (const update of updates) {
    const current = latest.get(update.department);
    if (!current || update.reported_at > current.reported_at) {
      latest.set(update.department, update);
    }
  }

  return DEPARTMENTS.flatMap((department) => {
    const update = latest.get(department);
    return update ? [update] : [];
  });
}

export function getDepartmentReportState(
  update: DepartmentUpdate | undefined,
  now = new Date(),
  staleAfterHours = 48,
): DepartmentReportState {
  if (!update) return "missing";
  const age = now.getTime() - new Date(update.reported_at).getTime();
  if (age > staleAfterHours * 60 * 60 * 1000) return "stale";
  return update.health;
}

export async function listDepartmentUpdates(
  client: DepartmentDataClient = defaultClient,
): Promise<DepartmentUpdate[]> {
  const { data, error } = await client
    .from("department_updates")
    .select("*")
    .order("reported_at", { ascending: false });

  if (error) throw error;
  return latestDepartmentUpdates((data ?? []) as DepartmentUpdate[]);
}
