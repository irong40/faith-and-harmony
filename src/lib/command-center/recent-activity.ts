import { supabase } from "@/integrations/supabase/client";

export interface WorkActivitySignal {
  id: string;
  work_item_id: string;
  event_type: string;
  created_at: string;
  work_items: { title: string } | null;
}

export interface GovernanceActivitySignal {
  id: string;
  event_type: string;
  summary: string;
  created_at: string;
}

export interface JobActivitySignal {
  id: string;
  job_number: string;
  status: string;
  updated_at: string;
}

export interface LeadActivitySignal {
  id: string;
  caller_name: string;
  qualification_status: string;
  updated_at: string;
}

export interface RecentActivitySources {
  work: readonly WorkActivitySignal[];
  governance: readonly GovernanceActivitySignal[];
  jobs: readonly JobActivitySignal[];
  leads: readonly LeadActivitySignal[];
}

export interface RecentActivityItem {
  id: string;
  title: string;
  detail: string;
  source: "work" | "governance" | "operations" | "revenue";
  occurredAt: string;
  href: string;
}

export interface RecentActivitySnapshot {
  items: RecentActivityItem[];
  errors: string[];
}

export interface RecentActivityLoaders {
  work: () => Promise<readonly WorkActivitySignal[]>;
  governance: () => Promise<readonly GovernanceActivitySignal[]>;
  jobs: () => Promise<readonly JobActivitySignal[]>;
  leads: () => Promise<readonly LeadActivitySignal[]>;
}

interface ActivityQueryResult {
  data: unknown[] | null;
  error: unknown | null;
}

interface ActivityQuery extends PromiseLike<ActivityQueryResult> {
  select(columns: string): ActivityQuery;
  order(column: string, options: { ascending: boolean }): ActivityQuery;
  limit(count: number): ActivityQuery;
}

interface ActivityClient { from(table: string): ActivityQuery }

const activityClient = supabase as unknown as ActivityClient;

async function recentRows<T>(table: string, columns: string, orderColumn: string): Promise<T[]> {
  const { data, error } = await activityClient
    .from(table)
    .select(columns)
    .order(orderColumn, { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as T[];
}

const defaultLoaders: RecentActivityLoaders = {
  work: () => recentRows<WorkActivitySignal>("work_item_events", "id, work_item_id, event_type, created_at, work_items(title)", "created_at"),
  governance: () => recentRows<GovernanceActivitySignal>("governance_log", "id, event_type, summary, created_at", "created_at"),
  jobs: () => recentRows<JobActivitySignal>("drone_jobs", "id, job_number, status, updated_at", "updated_at"),
  leads: () => recentRows<LeadActivitySignal>("leads", "id, caller_name, qualification_status, updated_at", "updated_at"),
};

function humanize(value: string): string {
  const text = value.replaceAll("_", " ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function mergeRecentActivity(sources: RecentActivitySources): RecentActivityItem[] {
  return [
    ...sources.work.map((event): RecentActivityItem => ({
      id: `work-${event.id}`,
      title: event.work_items?.title ?? "Company work updated",
      detail: `Work ${humanize(event.event_type).toLowerCase()}`,
      source: "work",
      occurredAt: event.created_at,
      href: `/admin/work?item=${event.work_item_id}`,
    })),
    ...sources.governance.map((event): RecentActivityItem => ({
      id: `governance-${event.id}`,
      title: event.summary,
      detail: humanize(event.event_type),
      source: "governance",
      occurredAt: event.created_at,
      href: "/admin/governance",
    })),
    ...sources.jobs.map((job): RecentActivityItem => ({
      id: `job-${job.id}`,
      title: `Job ${job.job_number}`,
      detail: `Moved to ${humanize(job.status).toLowerCase()}`,
      source: "operations",
      occurredAt: job.updated_at,
      href: `/admin/drone-jobs/${job.id}`,
    })),
    ...sources.leads.map((lead): RecentActivityItem => ({
      id: `lead-${lead.id}`,
      title: lead.caller_name,
      detail: `Lead ${humanize(lead.qualification_status).toLowerCase()}`,
      source: "revenue",
      occurredAt: lead.updated_at,
      href: "/admin/leads",
    })),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 12);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "object" && reason && "message" in reason) return String(reason.message);
  return "Activity source unavailable";
}

export async function loadRecentActivity(
  loaders: RecentActivityLoaders = defaultLoaders,
): Promise<RecentActivitySnapshot> {
  const [work, governance, jobs, leads] = await Promise.allSettled([
    loaders.work(),
    loaders.governance(),
    loaders.jobs(),
    loaders.leads(),
  ]);
  const results = [work, governance, jobs, leads];

  return {
    items: mergeRecentActivity({
      work: work.status === "fulfilled" ? work.value : [],
      governance: governance.status === "fulfilled" ? governance.value : [],
      jobs: jobs.status === "fulfilled" ? jobs.value : [],
      leads: leads.status === "fulfilled" ? leads.value : [],
    }),
    errors: results.flatMap((result) => result.status === "rejected" ? [errorMessage(result.reason)] : []),
  };
}
