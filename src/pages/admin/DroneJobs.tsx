import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, Plus, Eye, Camera, Calendar, CheckCircle, AlertTriangle, XCircle, Send, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AdminNav from "./components/AdminNav";
import type { Database } from "@/integrations/supabase/types";

type DroneJobStatus = Database["public"]["Enums"]["drone_job_status"];

interface ProcessingTemplate {
  id: string;
  path_code: string | null;
  display_name: string | null;
  preset_name: string;
}

interface PilotOption {
  id: string;
  full_name: string | null;
}

interface DroneJob {
  id: string;
  job_number: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  property_type: string;
  status: DroneJobStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  site_address: string | null;
  qa_score: number | null;
  created_at: string;
  client_id: string | null;
  pilot_id: string | null;
  processing_template_id: string | null;
  delivery_status: string | null;
  delivery_sent_at: string | null;
  customers?: { name: string; email: string } | null;
  drone_packages?: { name: string; code: string; price: number } | null;
  drone_assets?: { id: string }[];
  clients?: { name: string; company: string | null } | null;
  processing_templates?: { path_code: string | null; display_name: string | null; preset_name: string } | null;
  profiles?: { full_name: string | null } | null;
}

const DELIVERY_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_ready: { label: "Processing", color: "bg-slate-400 text-white" },
  ready: { label: "Ready to Send", color: "bg-blue-500 text-white" },
  sent: { label: "Sent", color: "bg-green-500 text-white" },
  delivery_confirmed: { label: "Confirmed", color: "bg-green-700 text-white" },
};

const STATUS_CONFIG: Record<DroneJobStatus, { label: string; color: string }> = {
  intake: { label: "Intake", color: "bg-slate-500" },
  scheduled: { label: "Scheduled", color: "bg-blue-500" },
  captured: { label: "Captured", color: "bg-indigo-500" },
  uploaded: { label: "Uploaded", color: "bg-purple-500" },
  ingested: { label: "Ingested", color: "bg-purple-600" },
  complete: { label: "Complete", color: "bg-teal-500" },
  paid: { label: "Paid", color: "bg-emerald-600" },
  processing: { label: "Processing", color: "bg-amber-500" },
  review_pending: { label: "Review Pending", color: "bg-violet-500" },
  qa: { label: "QA Review", color: "bg-orange-500" },
  revision: { label: "Revision", color: "bg-red-500" },
  video_grading: { label: "Video Grading", color: "bg-cyan-600" },
  video_editing: { label: "Video Editing", color: "bg-cyan-500" },
  video_exporting: { label: "Video Exporting", color: "bg-cyan-400" },
  delivered: { label: "Delivered", color: "bg-green-500" },
  photos_delivered: { label: "Photos Delivered", color: "bg-green-600" },
  failed: { label: "Failed", color: "bg-red-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-500" },
};

// ─── Bulk delete: the drone_jobs foreign-key map ────────────────────────────
//
// Hand-maintained on purpose, and it CANNOT be compile-checked: types.ts has
// not been regenerated since several of these tables landed. job_shot_items,
// site_visits, marketplace_leads, zeitview_jobs and opord_proposals are all
// absent from Database["public"]["Tables"], and the string "drone_job_id" does
// not appear anywhere in that file. Column names were verified 2026-07-27
// against the migration DDL and the types.ts Relationships blocks. The FK
// column name is NOT uniform: most tables use mission_id, four use job_id, and
// the two blocking tables use drone_job_id.
//
// If a future migration adds an FK to drone_jobs and does not add it here, the
// preview under-reports. The delete stays safe regardless — CASCADE and SET
// NULL happen in the database either way, and a missed NO ACTION link surfaces
// as a per-job "blocked" result rather than as a silent success.
interface FkRule {
  table: string;
  column: string;
  label: string;
}

/** ON DELETE CASCADE — these rows are destroyed along with the job. */
const CASCADE_TABLES: FkRule[] = [
  { table: "flight_logs", column: "mission_id", label: "Flight logs (FAA Part 107)" },
  { table: "drone_assets", column: "job_id", label: "Uploaded assets" },
  { table: "drone_deliverables", column: "job_id", label: "Deliverables" },
  { table: "processing_jobs", column: "mission_id", label: "Processing jobs" },
  { table: "processing_steps", column: "mission_id", label: "Processing steps" },
  { table: "site_visits", column: "job_id", label: "Site visits" },
  { table: "job_shot_items", column: "job_id", label: "Shot list items" },
  { table: "authorization_requests", column: "mission_id", label: "Authorization requests" },
  { table: "mission_authorizations", column: "mission_id", label: "Mission authorizations (LAANC)" },
  { table: "mission_equipment", column: "mission_id", label: "Mission equipment" },
  { table: "mission_weather_logs", column: "mission_id", label: "Weather logs" },
  { table: "delivery_log", column: "mission_id", label: "Delivery log" },
  { table: "video_assets", column: "mission_id", label: "Video assets" },
  { table: "vegetation_analysis_summary", column: "mission_id", label: "Vegetation summaries" },
  { table: "vegetation_detections", column: "mission_id", label: "Vegetation detections" },
];

/**
 * ON DELETE NO ACTION — any link here makes the DELETE raise an FK error.
 *
 * Not exhaustive, and cannot be. Two known gaps:
 *   - zeitview_jobs has RLS enabled with ZERO policies, so this scan reads it
 *     as empty with no error and can never see a Zeitview link.
 *   - drone_jobs.processing_job_id -> processing_jobs.id is NO ACTION while
 *     processing_jobs.mission_id -> drone_jobs.id is CASCADE, so deleting job A
 *     can be rejected by a DIFFERENT job B that reuses A's processing run. That
 *     is a second-order path no flat FK list can express.
 * Both surface at delete time as a per-job "blocked" result, and since the row
 * is now deleted BEFORE its storage files, a rejection leaves the job wholly
 * intact. A pg_constraint-introspecting SECURITY DEFINER RPC is the real fix.
 */
const BLOCKING_TABLES: FkRule[] = [
  { table: "marketplace_leads", column: "drone_job_id", label: "Marketplace lead" },
  { table: "zeitview_jobs", column: "drone_job_id", label: "Zeitview job" },
];

/** ON DELETE SET NULL — these rows survive, they only lose the job reference. */
const SET_NULL_TABLES: FkRule[] = [
  { table: "payments", column: "job_id", label: "Payments" },
  { table: "job_reports", column: "job_id", label: "Job reports" },
  { table: "mission_costings", column: "mission_id", label: "Mission costings" },
  { table: "opord_proposals", column: "mission_id", label: "OPORD proposals" },
  { table: "safety_audit_log", column: "mission_id", label: "Safety audit log" },
];

/** flight_logs is the FAA Part 107 record — the dialog shouts about this one. */
const FAA_RECORD_TABLE = "flight_logs";

interface ImpactCount {
  table: string;
  label: string;
  /**
   * Row count, or null for UNKNOWN — the probe errored and nothing was read.
   *
   * null is load-bearing. The first cut of this dialog dropped failed probes
   * from the array entirely, which made "counted, and it was zero" and "could
   * not be counted at all" render identically: an absent entry became an
   * affirmative zero, the summary said "Nothing else is affected", and the FAA
   * banner stayed silent. Failed probes now stay in the array as null and
   * every consumer has to decide what to do with that.
   */
  count: number | null;
}

interface ImpactScan {
  cascade: ImpactCount[];
  setNull: ImpactCount[];
  /** job id -> labels of the NO ACTION links that will block its delete */
  blockedBy: Record<string, string[]>;
  /** false when a NO ACTION link check failed — `blockedBy` is then incomplete */
  blockingChecked: boolean;
  /** checks that could not be completed — never folded into a zero */
  warnings: string[];
}

/** Every rule, counted as unknown. Used when the scan cannot run at all. */
function unknownCounts(rules: FkRule[]): ImpactCount[] {
  return rules.map((r) => ({ table: r.table, label: r.label, count: null }));
}

/**
 * True when any part of the scan failed, so no figure in the preview can be
 * trusted — including the absence of a figure. Guards every all-clear.
 */
function isScanIncomplete(scan: ImpactScan): boolean {
  return (
    !scan.blockingChecked ||
    scan.cascade.length !== CASCADE_TABLES.length ||
    scan.setNull.length !== SET_NULL_TABLES.length ||
    scan.cascade.some((c) => c.count === null) ||
    scan.setNull.some((c) => c.count === null)
  );
}

/**
 * PostgREST serialises `.in()` into the query string, so one probe over the
 * whole selection is a request line that grows ~39 bytes per job id. Past a
 * couple of hundred ids that crosses the 8 KB request-line limit common to
 * Kong/nginx and ALL 22 probes fail at once — the preview would go blank
 * exactly when the batch is largest. Chunking keeps every request small.
 */
const ID_CHUNK_SIZE = 80;

function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + ID_CHUNK_SIZE));
  }
  return chunks;
}

type BulkDeleteStatus = "deleted" | "blocked" | "error" | "skipped";

interface BulkDeleteResult {
  jobId: string;
  jobNumber: string;
  status: BulkDeleteStatus;
  message?: string;
}

/**
 * The impact scan reads tables that are missing from the generated types, so it
 * goes through one deliberately narrow untyped view of the client rather than
 * sprinkling `as never` at every call site (cf. Leads.tsx).
 */
interface UntypedTable {
  select: (
    columns: string,
    options?: { count: "exact"; head: boolean },
  ) => {
    in: (
      column: string,
      values: string[],
    ) => PromiseLike<{
      data: Record<string, unknown>[] | null;
      count: number | null;
      error: { message: string } | null;
    }>;
  };
}

const untypedFrom = (table: string): UntypedTable =>
  supabase.from(table as never) as unknown as UntypedTable;

/** Pure, and therefore unit-testable — mirrors toggleLeadSelection in Leads.tsx. */
export function toggleJobSelection(selected: Set<string>, jobId: string): Set<string> {
  const next = new Set(selected);
  if (next.has(jobId)) {
    next.delete(jobId);
  } else {
    next.add(jobId);
  }
  return next;
}

/**
 * Typed-confirmation token for the bulk path. DroneJobDetail makes you type the
 * job number for a single delete; bulk is more dangerous, so the token names the
 * exact number of jobs and changes if the selection shifts underneath the user.
 */
export function bulkDeleteConfirmToken(count: number): string {
  return `DELETE ${count} JOB${count === 1 ? "" : "S"}`;
}

export default function DroneJobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<DroneJob[]>([]);
  const [templates, setTemplates] = useState<ProcessingTemplate[]>([]);
  const [pilots, setPilots] = useState<PilotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [pilotFilter, setPilotFilter] = useState<string>(searchParams.get("pilot") || "all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>(searchParams.get("delivery") || "all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  /** Explicit sign-off required when the impact scan came back incomplete. */
  const [ackUnverified, setAckUnverified] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [impact, setImpact] = useState<ImpactScan | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkDeleteResult[]>([]);

  const fetchJobs = async () => {
    setLoading(true);
    const [jobsRes, templatesRes, pilotsRes] = await Promise.all([
      supabase
        .from("drone_jobs")
        .select("*, customers(name, email), drone_packages(name, code, price), drone_assets(id), clients(name, company), processing_templates(path_code, display_name, preset_name), delivery_status, delivery_sent_at, pilot_id, profiles(full_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("processing_templates")
        .select("id, path_code, display_name, preset_name")
        .eq("active", true)
        .order("path_code"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .not("full_name", "is", null)
        .order("full_name"),
    ]);

    const { data, error } = jobsRes;

    if (error) {
      toast({
        title: "Error loading drone jobs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setJobs(data || []);
    }
    if (templatesRes.data) setTemplates(templatesRes.data);
    if (pilotsRes.data) setPilots(pilotsRes.data as PilotOption[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const searchLower = searchTerm.toLowerCase();
    const clientName = job.clients?.name || job.customers?.name || "";
    const pilotName = job.profiles?.full_name || "";
    const matchesSearch =
      searchTerm === "" ||
      job.job_number.toLowerCase().includes(searchLower) ||
      job.property_address.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower) ||
      pilotName.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesTemplate =
      templateFilter === "all" || job.processing_template_id === templateFilter;
    const matchesDelivery =
      deliveryFilter === "all" || (job.delivery_status ?? "not_ready") === deliveryFilter;
    const matchesPilot =
      pilotFilter === "all" ||
      (pilotFilter === "__unassigned__" ? !job.pilot_id : job.pilot_id === pilotFilter);
    const matchesDateFrom =
      !dateFrom || !job.scheduled_date || job.scheduled_date >= dateFrom;
    const matchesDateTo =
      !dateTo || !job.scheduled_date || job.scheduled_date <= dateTo;

    return matchesSearch && matchesStatus && matchesTemplate && matchesDelivery && matchesPilot && matchesDateFrom && matchesDateTo;
  });

  // ─── Bulk delete ──────────────────────────────────────────────────────────
  //
  // Selection deliberately survives a filter change, so the confirm dialog
  // lists every job number it is about to delete. Nothing is deleted that the
  // operator has not seen named.
  const selectedJobs = jobs.filter((j) => selectedIds.has(j.id));
  const blockedJobs = selectedJobs.filter((j) => (impact?.blockedBy[j.id]?.length ?? 0) > 0);
  const deletableJobs = selectedJobs.filter((j) => (impact?.blockedBy[j.id]?.length ?? 0) === 0);
  const confirmToken = bulkDeleteConfirmToken(deletableJobs.length);

  // Three buckets, not two: counted-and-positive, counted-and-zero (silent),
  // and UNKNOWN. Unknown is never merged into either of the others.
  const cascadeDestroyed = (impact?.cascade ?? []).filter(
    (c): c is ImpactCount & { count: number } => c.count !== null && c.count > 0,
  );
  const cascadeUnknown = (impact?.cascade ?? []).filter((c) => c.count === null);
  const setNullAffected = (impact?.setNull ?? []).filter(
    (c): c is ImpactCount & { count: number } => c.count !== null && c.count > 0,
  );
  const setNullUnknown = (impact?.setNull ?? []).filter((c) => c.count === null);
  const scanIncomplete = impact !== null && isScanIncomplete(impact);

  // null means "could not be read", and that has to reach the banner as an
  // alarm. `?? 0` here was what silenced the FAA warning on a failed probe.
  const faaLogCount = impact?.cascade.find((c) => c.table === FAA_RECORD_TABLE)?.count ?? null;
  const faaUnknown = impact !== null && faaLogCount === null;

  const allVisibleSelected =
    filteredJobs.length > 0 && filteredJobs.every((j) => selectedIds.has(j.id));

  const toggleAllVisible = (checked: boolean) => {
    const next = new Set(selectedIds);
    for (const job of filteredJobs) {
      if (checked) next.add(job.id);
      else next.delete(job.id);
    }
    setSelectedIds(next);
  };

  /**
   * Counts what a delete of `ids` would take with it. Every query's error is
   * captured as a warning — an unreadable table is reported as unknown, never
   * folded into a reassuring zero.
   */
  const scanImpact = async (ids: string[]): Promise<ImpactScan> => {
    const warnings: string[] = [];
    const chunks = chunkIds(ids);

    // Note the return type: ImpactCount, never null. A failed probe comes back
    // with count: null and STAYS in the array, so the renderer can tell an
    // empty table apart from an unreadable one.
    const countRule = async (rule: FkRule): Promise<ImpactCount> => {
      let total = 0;
      for (const chunk of chunks) {
        const { count, error } = await untypedFrom(rule.table)
          .select("id", { count: "exact", head: true })
          .in(rule.column, chunk);
        if (error) {
          warnings.push(`${rule.label} (${rule.table}) could not be counted: ${error.message}`);
          return { table: rule.table, label: rule.label, count: null };
        }
        if (count === null) {
          // No error, but PostgREST returned no Content-Range. That is still
          // "not counted" — `count ?? 0` here would be the same lie by a
          // quieter route.
          warnings.push(
            `${rule.label} (${rule.table}) returned no count — the database did not report a row count.`,
          );
          return { table: rule.table, label: rule.label, count: null };
        }
        total += count;
      }
      return { table: rule.table, label: rule.label, count: total };
    };

    const scanBlocking = async (
      rule: FkRule,
    ): Promise<{ links: [string, string][]; ok: boolean }> => {
      const links: [string, string][] = [];
      for (const chunk of chunks) {
        const { data, error } = await untypedFrom(rule.table)
          .select(rule.column)
          .in(rule.column, chunk);
        if (error) {
          warnings.push(
            `${rule.label} (${rule.table}) link check failed: ${error.message}. ` +
              "Jobs linked there will be rejected by the database instead, and reported per job.",
          );
          return { links: [], ok: false };
        }
        for (const row of data ?? []) {
          const value = row[rule.column];
          if (typeof value === "string") links.push([value, rule.label]);
        }
      }
      return { links, ok: true };
    };

    const [cascade, setNull, blockingResults] = await Promise.all([
      Promise.all(CASCADE_TABLES.map(countRule)),
      Promise.all(SET_NULL_TABLES.map(countRule)),
      Promise.all(BLOCKING_TABLES.map(scanBlocking)),
    ]);

    const blockedBy: Record<string, string[]> = {};
    for (const [jobId, label] of blockingResults.flatMap((r) => r.links)) {
      blockedBy[jobId] = [...(blockedBy[jobId] ?? []), label];
    }

    return {
      cascade,
      setNull,
      blockedBy,
      blockingChecked: blockingResults.every((r) => r.ok),
      warnings,
    };
  };

  const openBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setDeleteConfirm("");
    setAckUnverified(false);
    setBulkResults([]);
    setImpact(null);
    setDeleteOpen(true);
    setScanning(true);
    try {
      setImpact(await scanImpact(ids));
    } catch (err) {
      // A thrown scan is a failed scan. Every table comes back UNKNOWN rather
      // than absent, so the dialog cannot render an all-clear: an empty
      // cascade array would have printed "Nothing else is affected".
      setImpact({
        cascade: unknownCounts(CASCADE_TABLES),
        setNull: unknownCounts(SET_NULL_TABLES),
        blockedBy: {},
        blockingChecked: false,
        warnings: [
          `Impact scan failed: ${err instanceof Error ? err.message : String(err)}. ` +
            "Nothing below is verified.",
        ],
      });
    } finally {
      setScanning(false);
    }
  };

  const runBulkDelete = async () => {
    if (deletableJobs.length === 0) return;
    setDeleting(true);

    const targetIds = deletableJobs.map((j) => j.id);

    // The list query only selects drone_assets(id), so the storage keys have to
    // be fetched here — deleting without them orphans every uploaded file.
    // drone_assets has file_path (a storage key) and thumbnail_url (a URL, not
    // a key), so only file_path can be handed to storage.remove().
    const pathsByJob = new Map<string, string[]>();
    const { data: assetRows, error: assetError } = await supabase
      .from("drone_assets")
      .select("job_id, file_path")
      .in("job_id", targetIds);

    if (assetError) {
      toast({
        title: "Couldn't list stored files",
        description: `${assetError.message} — the jobs will still be deleted, but their uploaded files stay in storage.`,
        variant: "destructive",
      });
    } else {
      for (const row of assetRows ?? []) {
        if (!row.file_path) continue;
        pathsByJob.set(row.job_id, [...(pathsByJob.get(row.job_id) ?? []), row.file_path]);
      }
    }

    // Jobs excluded up front are reported too, so the tally always adds up.
    const outcomes: BulkDeleteResult[] = blockedJobs.map((job) => ({
      jobId: job.id,
      jobNumber: job.job_number,
      status: "skipped",
      message: `Left in place — still linked to: ${(impact?.blockedBy[job.id] ?? []).join(", ")}.`,
    }));

    for (const job of deletableJobs) {
      const paths = pathsByJob.get(job.id) ?? [];

      // ROW FIRST, then storage. Storage removal is irreversible and the DELETE
      // can still be rejected by a NO ACTION foreign key the scan could not see
      // (zeitview_jobs is RLS-invisible to this session; drone_jobs
      // .processing_job_id is a second-order path no client-side scan models).
      // Removing files first meant an FK-rejected job lost its uploads for good
      // while the UI reported that nothing had happened. Deleting the row first
      // makes a rejection a true no-op — the pre-fetched `pathsByJob` above is
      // exactly why the keys are still available after the row is gone.
      const { error } = await supabase.from("drone_jobs").delete().eq("id", job.id);

      if (error) {
        const blocked = /foreign key|violates/i.test(error.message);
        outcomes.push({
          jobId: job.id,
          jobNumber: job.job_number,
          status: blocked ? "blocked" : "error",
          message: blocked
            ? "Rejected — still linked to another record (a marketplace lead, a Zeitview job, or another job reusing its processing run). Nothing was deleted and its uploaded files are untouched. Unlink it first, then retry."
            : `${error.message} — nothing was deleted and its uploaded files are untouched.`,
        });
        continue;
      }

      let storageNote: string | undefined;
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from("drone-jobs").remove(paths);
        if (storageError) {
          // Non-fatal: the row is already gone, so say plainly what was left.
          console.warn(`Storage cleanup failed for ${job.job_number}:`, storageError.message);
          storageNote = `Row deleted, but ${paths.length} file${paths.length !== 1 ? "s" : ""} were left in storage (${storageError.message}).`;
        }
      }

      outcomes.push({
        jobId: job.id,
        jobNumber: job.job_number,
        status: "deleted",
        message: storageNote,
      });
    }

    const deleted = outcomes.filter((o) => o.status === "deleted");
    const failed = outcomes.filter((o) => o.status === "blocked" || o.status === "error");
    const skipped = outcomes.filter((o) => o.status === "skipped");

    setBulkResults(outcomes);

    if (failed.length === 0 && skipped.length === 0) {
      toast({
        title: `${deleted.length} job${deleted.length !== 1 ? "s" : ""} deleted`,
      });
    } else {
      toast({
        title: `${deleted.length} of ${outcomes.length} jobs deleted`,
        description:
          [
            failed.length > 0 ? `${failed.length} failed` : null,
            skipped.length > 0 ? `${skipped.length} skipped (blocked by links)` : null,
          ]
            .filter(Boolean)
            .join(", ") + ". Per-job detail is listed above the table.",
        variant: "destructive",
      });
    }

    // Anything that survived stays selected so the operator can act on it.
    setSelectedIds(new Set(outcomes.filter((o) => o.status !== "deleted").map((o) => o.jobId)));

    // This page is plain useState, so fetchJobs() is its own refresh. The caches
    // that genuinely hold drone_jobs-derived data live in sibling react-query
    // hooks — those are the keys worth invalidating.
    if (deleted.length > 0) {
      // Dashboard.tsx pins dashboard-active-missions at staleTime 60_000 and
      // App.tsx builds a bare QueryClient, so without these two the admin
      // landing page serves deleted jobs from cache for a full minute.
      queryClient.invalidateQueries({ queryKey: ["dashboard-active-missions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["pilot-missions"] });
      queryClient.invalidateQueries({ queryKey: ["weather-held-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-reports"] });
      queryClient.invalidateQueries({ queryKey: ["mission-costings"] });
      for (const o of deleted) {
        queryClient.removeQueries({ queryKey: ["pilot-mission", o.jobId] });
        queryClient.removeQueries({ queryKey: ["mission-equipment", o.jobId] });
        queryClient.removeQueries({ queryKey: ["mission-authorization", o.jobId] });
        queryClient.removeQueries({ queryKey: ["mission-weather-log", o.jobId] });
      }
    }

    setDeleting(false);
    setDeleteOpen(false);
    setDeleteConfirm("");
    setAckUnverified(false);
    await fetchJobs();
  };

  const getStatusBadge = (status: DroneJobStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const getQAIndicator = (score: number | null) => {
    if (score === null) return null;
    if (score >= 75) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (score >= 50) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  // Summary counts
  const activeCount = jobs.filter(j => !["delivered", "cancelled"].includes(j.status)).length;
  const scheduledThisWeek = jobs.filter(j => {
    if (!j.scheduled_date) return false;
    const date = new Date(j.scheduled_date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return date >= now && date <= weekFromNow && j.status === "scheduled";
  }).length;
  const awaitingQA = jobs.filter(j => j.status === "qa").length;
  const deliveredCount = jobs.filter(j => j.status === "delivered").length;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/drone/drone-logo-original.jpg"
              alt="Drone Services"
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Drone Jobs</h1>
              <p className="text-sm text-muted-foreground">Manage aerial photography jobs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchJobs} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate("/admin/jobs/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Camera className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{activeCount}</div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{scheduledThisWeek}</div>
                <div className="text-sm text-muted-foreground">Due This Week</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{awaitingQA}</div>
                <div className="text-sm text-muted-foreground">Awaiting QA</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{deliveredCount}</div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters — Row 1 */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by job #, address, client, or pilot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pilotFilter} onValueChange={setPilotFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by pilot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pilots</SelectItem>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {pilots.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Filters — Row 2 */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Job Types</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.path_code ? `${t.path_code} – ` : ""}{t.display_name || t.preset_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery</SelectItem>
              <SelectItem value="ready">Ready to Send</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivery_confirmed">Confirmed</SelectItem>
              <SelectItem value="not_ready">Not Ready</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-36 text-sm"
              title="From date"
            />
            <span className="text-muted-foreground text-sm shrink-0">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-36 text-sm"
              title="To date"
            />
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border bg-muted p-3">
            <span className="text-sm font-medium">
              {selectedIds.size} job{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button size="sm" variant="destructive" onClick={openBulkDelete} disabled={deleting}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={deleting}
            >
              Clear selection
            </Button>
          </div>
        )}

        {/* Per-job outcome of the last bulk delete */}
        {bulkResults.length > 0 && (
          <div className="mb-3 space-y-1 rounded-md border bg-card p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">Last bulk delete</span>
              <Button size="sm" variant="ghost" onClick={() => setBulkResults([])}>
                Dismiss
              </Button>
            </div>
            {bulkResults.map((r) => (
              <div key={r.jobId} className="flex flex-wrap items-center gap-2 text-sm">
                {r.status === "deleted" ? (
                  <Badge className="bg-green-600 text-white">Deleted</Badge>
                ) : r.status === "skipped" ? (
                  <Badge className="bg-amber-500 text-white">Skipped</Badge>
                ) : r.status === "blocked" ? (
                  <Badge className="bg-amber-600 text-white">Blocked</Badge>
                ) : (
                  <Badge className="bg-red-600 text-white">Failed</Badge>
                )}
                <span className="font-mono text-xs">{r.jobNumber}</span>
                {r.message && <span className="text-xs text-muted-foreground">{r.message}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                    aria-label="Select all visible jobs"
                    disabled={filteredJobs.length === 0}
                  />
                </TableHead>
                <TableHead>Job #</TableHead>
                <TableHead>Property / Site</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead className="hidden lg:table-cell">Pilot</TableHead>
                <TableHead className="hidden xl:table-cell">Job Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Delivery</TableHead>
                <TableHead className="hidden sm:table-cell">QA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No drone jobs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id} data-state={selectedIds.has(job.id) ? "selected" : undefined}>
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selectedIds.has(job.id)}
                        onCheckedChange={() => setSelectedIds(toggleJobSelection(selectedIds, job.id))}
                        aria-label={`Select job ${job.job_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {job.job_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {job.site_address || job.property_address}
                      </div>
                      {!job.site_address && (
                        <div className="text-sm text-muted-foreground">
                          {[job.property_city, job.property_state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {job.clients?.name || job.customers?.name || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {job.profiles?.full_name ? (
                        <button
                          onClick={() => setPilotFilter(job.pilot_id ?? "all")}
                          className="flex items-center gap-1.5 text-sm hover:underline text-primary"
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {job.profiles.full_name}
                        </button>
                      ) : (
                        <span className="text-sm text-amber-600 font-medium">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {job.processing_templates ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          {job.processing_templates.path_code && (
                            <Badge variant="outline" className="text-xs font-mono py-0">
                              {job.processing_templates.path_code}
                            </Badge>
                          )}
                          {job.processing_templates.display_name || job.processing_templates.preset_name}
                        </span>
                      ) : job.drone_packages ? (
                        <span className="text-sm">{job.drone_packages.name}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {job.scheduled_date
                        ? format(new Date(job.scheduled_date), "MMM d")
                        : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(() => {
                        const ds = job.delivery_status ?? "not_ready";
                        const cfg = DELIVERY_STATUS_CONFIG[ds] ?? DELIVERY_STATUS_CONFIG.not_ready;
                        if (ds === "ready") {
                          return (
                            <Link to={`/admin/drone-jobs/${job.id}/delivery`}>
                              <Badge className={`${cfg.color} cursor-pointer hover:opacity-80`}>
                                <Send className="mr-1 h-3 w-3" />
                                {cfg.label}
                              </Badge>
                            </Link>
                          );
                        }
                        return (
                          <div className="space-y-0.5">
                            <Badge className={cfg.color}>{cfg.label}</Badge>
                            {job.delivery_sent_at && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(job.delivery_sent_at), "MMM d")}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {getQAIndicator(job.qa_score)}
                        {job.qa_score !== null && (
                          <span className="text-sm font-medium">{job.qa_score}</span>
                        )}
                        {job.drone_assets && job.drone_assets.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({job.drone_assets.length} assets)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/admin/drone-jobs/${job.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Bulk delete confirmation — pre-flight impact preview + typed confirm */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""}?
            </DialogTitle>
          </DialogHeader>

          {scanning ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Checking what else this would affect...
            </div>
          ) : (
            <div className="space-y-4">
              {/* FAA Part 107 records — shouts on a real count AND on unknown.
                  Silence here is reserved for a check that succeeded and
                  returned zero; a failed check is the loudest case, not the
                  quietest, because the cascade runs either way. */}
              {faaUnknown && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-destructive">
                        Unknown number of FAA Part 107 flight logs — the check did not complete.
                      </p>
                      <p className="text-muted-foreground">
                        Flight logs are regulatory records and this delete destroys them whether or
                        not they could be counted. Assume they exist: cancel and retry the scan, or
                        export first.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {faaLogCount !== null && faaLogCount > 0 && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-destructive">
                        {faaLogCount} FAA Part 107 flight log{faaLogCount !== 1 ? "s" : ""} will be
                        destroyed.
                      </p>
                      <p className="text-muted-foreground">
                        Flight logs are regulatory records. Export them before deleting if you are
                        still inside your retention window.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Jobs the database will refuse to delete */}
              {blockedJobs.length > 0 && (
                <div className="rounded-md border border-amber-500 bg-amber-500/10 p-3">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {blockedJobs.length} job{blockedJobs.length !== 1 ? "s" : ""} cannot be deleted
                    and {blockedJobs.length !== 1 ? "have" : "has"} been excluded
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {blockedJobs.map((job) => (
                      <li key={job.id}>
                        <span className="font-mono">{job.job_number}</span> — linked to{" "}
                        {(impact?.blockedBy[job.id] ?? []).join(", ")}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Unlink these first. The rest of the batch will still go ahead.
                  </p>
                </div>
              )}

              {/* Checks that did not complete. Destructive styling, not amber:
                  an unverified impact is a reason to stop, and it sits ABOVE
                  the figures it invalidates. */}
              {(scanIncomplete || (impact?.warnings.length ?? 0) > 0) && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                  <p className="text-sm font-semibold text-destructive">
                    Impact could not be fully verified
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The figures below are incomplete. Every line marked{" "}
                    <span className="font-mono">unknown</span> may hold records that this delete
                    will still destroy — the database cascade does not depend on what this preview
                    managed to read.
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-destructive">
                    {(impact?.warnings ?? []).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CASCADE — itemised. Unknown rows are listed first and loudest. */}
              <div>
                <p className="mb-1 text-sm font-medium">
                  Permanently destroyed alongside the jobs
                  {blockedJobs.length > 0 && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      (counted across all {selectedJobs.length} selected, including the{" "}
                      {blockedJobs.length} excluded above)
                    </span>
                  )}
                </p>
                {cascadeUnknown.length === 0 && cascadeDestroyed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing else is affected — all {CASCADE_TABLES.length} linked tables were
                    checked and every one came back empty.
                  </p>
                ) : (
                  <ul className="space-y-0.5 text-sm">
                    {cascadeUnknown.map((c) => (
                      <li key={c.table} className="flex justify-between gap-4">
                        <span className="font-semibold text-destructive">{c.label}</span>
                        <span className="font-mono text-destructive">unknown</span>
                      </li>
                    ))}
                    {cascadeDestroyed.map((c) => (
                      <li key={c.table} className="flex justify-between gap-4">
                        <span
                          className={
                            c.table === FAA_RECORD_TABLE
                              ? "font-semibold text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {c.label}
                        </span>
                        <span className="font-mono">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* SET NULL — kept, but orphaned */}
              {(setNullAffected.length > 0 || setNullUnknown.length > 0) && (
                <div>
                  <p className="mb-1 text-sm font-medium">Kept on record, but unlinked</p>
                  <ul className="space-y-0.5 text-sm">
                    {setNullUnknown.map((c) => (
                      <li key={c.table} className="flex justify-between gap-4">
                        <span className="font-semibold text-destructive">{c.label}</span>
                        <span className="font-mono text-destructive">unknown</span>
                      </li>
                    ))}
                    {setNullAffected.map((c) => (
                      <li key={c.table} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="font-mono">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exactly which jobs go — selection can outlive a filter change */}
              <div>
                <p className="mb-1 text-sm font-medium">
                  Jobs to delete ({deletableJobs.length})
                </p>
                <div className="max-h-24 overflow-y-auto rounded border p-2 font-mono text-xs">
                  {deletableJobs.length === 0 ? (
                    <span className="font-sans text-muted-foreground">None.</span>
                  ) : (
                    deletableJobs.map((job) => <div key={job.id}>{job.job_number}</div>)
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Counts cover the tables this admin session is allowed to read. A table restricted to
                service-role access returns an empty result rather than an error, so a link there is
                invisible here and the database rejects the delete instead — reported per job
                afterwards, and nothing is removed for a job that gets rejected. This can&apos;t be
                undone.
              </p>

              {/* An unverified impact must cost the operator a deliberate act,
                  not just a scroll past a warning. */}
              {scanIncomplete && (
                <div className="flex items-start gap-2 rounded-md border border-destructive p-3">
                  <Checkbox
                    id="bulk-delete-ack"
                    checked={ackUnverified}
                    onCheckedChange={(checked) => setAckUnverified(checked === true)}
                    className="mt-0.5"
                    disabled={deletableJobs.length === 0}
                  />
                  <Label
                    htmlFor="bulk-delete-ack"
                    className="text-xs font-normal leading-snug text-muted-foreground"
                  >
                    I understand the impact preview is incomplete, and that this delete may destroy
                    records — including FAA Part 107 flight logs — that were never counted here.
                  </Label>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bulk-delete-confirm">
                  Type{" "}
                  <span className="font-mono font-semibold text-foreground">{confirmToken}</span> to
                  confirm
                </Label>
                <Input
                  id="bulk-delete-confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  autoComplete="off"
                  disabled={deletableJobs.length === 0}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={runBulkDelete}
                  disabled={
                    deleting ||
                    deletableJobs.length === 0 ||
                    deleteConfirm.trim() !== confirmToken ||
                    (scanIncomplete && !ackUnverified)
                  }
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete {deletableJobs.length} Job{deletableJobs.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
