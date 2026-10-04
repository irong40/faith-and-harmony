import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { OfficeReportBody, OfficeReportSummary } from "@/lib/officeReports";

// `office_reports` is an agent office table, outside the generated CRM schema
// (the same as office_snapshot and office_inbox in useOffice.ts), so the typed
// client rejects its name. This untyped view is confined to this file.
const db = supabase as unknown as SupabaseClient;

export const OFFICE_REPORTS_KEY = ["office-reports"] as const;

/** The list, newest first, without the bodies. A year of weekly minutes is about 50 rows. */
export async function fetchOfficeReports(): Promise<OfficeReportSummary[]> {
  const { data, error } = await db
    .from("office_reports")
    .select("id, kind, report_date, title, summary, updated_at")
    .order("report_date", { ascending: false })
    .order("kind", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as OfficeReportSummary[];
}

export async function fetchOfficeReportBody(id: string): Promise<OfficeReportBody | null> {
  const { data, error } = await db
    .from("office_reports")
    .select("id, body_md, body_html, source_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as OfficeReportBody | null) ?? null;
}

// The desktop posts a report once, after the meeting, and again only if the
// file changes. Five minutes of staleness costs nothing here.
const STALE = 5 * 60_000;

export function useOfficeReports() {
  return useQuery({ queryKey: OFFICE_REPORTS_KEY, queryFn: fetchOfficeReports, staleTime: STALE, retry: 1 });
}

export function useOfficeReportBody(id: string | null) {
  return useQuery({
    queryKey: [...OFFICE_REPORTS_KEY, "body", id],
    queryFn: () => fetchOfficeReportBody(id as string),
    enabled: Boolean(id),
    staleTime: STALE,
    retry: 1,
  });
}
