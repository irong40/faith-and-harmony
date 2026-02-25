import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import N8nHealthIndicator from "@/components/pipeline/N8nHealthIndicator";
import ComplianceAlertsCard from "@/components/admin/ComplianceAlertsCard";
import ActivityFeed from "@/components/admin/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { format, isToday } from "date-fns";
import {
  Activity,
  CalendarClock,
  Cog,
  Send,
  Users,
} from "lucide-react";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface MissionRow {
  id: string;
  job_number: string;
  site_address: string | null;
  property_address: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  delivery_status: string | null;
  pilot_id: string | null;
  clients: { name: string } | null;
  customers: { name: string } | null;
  profiles: { full_name: string | null } | null;
}

interface ProcessingRow {
  id: string;
  mission_id: string;
  status: string;
  path_code: string | null;
  started_at: string | null;
  drone_jobs: {
    job_number: string;
    site_address: string | null;
    property_address: string;
  } | null;
}

// -------------------------------------------------------
// Status badge helper
// -------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  intake: "bg-slate-500",
  scheduled: "bg-blue-500",
  captured: "bg-indigo-500",
  uploaded: "bg-purple-500",
  processing: "bg-amber-500",
  review_pending: "bg-violet-500",
  qa: "bg-orange-500",
  revision: "bg-red-500",
  complete: "bg-teal-500",
  delivered: "bg-green-500",
  failed: "bg-red-700",
  cancelled: "bg-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-gray-400";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge className={`${color} text-white capitalize text-xs`}>{label}</Badge>;
}

// -------------------------------------------------------
// Metric Card
// -------------------------------------------------------
function MetricCard({
  label,
  value,
  icon: Icon,
  to,
  loading,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  to?: string;
  loading: boolean;
  accent?: string;
}) {
  const inner = (
    <Card className={`hover:border-primary/40 transition-colors ${to ? "cursor-pointer" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-2xl font-bold ${accent ? "text-blue-600" : ""}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

// -------------------------------------------------------
// Main Dashboard
// -------------------------------------------------------
export default function Dashboard() {
  // Active missions (not cancelled/delivered)
  const { data: activeMissions, isLoading: activeMissionsLoading } = useQuery({
    queryKey: ["dashboard-active-missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_jobs")
        .select("id, job_number, site_address, property_address, scheduled_date, scheduled_time, status, delivery_status, pilot_id, clients(name), customers(name), profiles(full_name)")
        .not("status", "in", '("delivered","cancelled")')
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data || []) as MissionRow[];
    },
    staleTime: 60_000,
  });

  // Pending deliveries
  const { data: pendingDeliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ["pending-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_jobs")
        .select("id")
        .eq("delivery_status", "ready");
      if (error) throw error;
      return data || [];
    },
  });

  // Processing queue
  const { data: processingJobs, isLoading: processingLoading } = useQuery({
    queryKey: ["dashboard-processing-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processing_jobs")
        .select("id, mission_id, status, path_code, started_at, drone_jobs(job_number, site_address, property_address)")
        .in("status", ["queued", "running"])
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as ProcessingRow[];
    },
    staleTime: 30_000,
  });

  // -------------------------------------------------------
  // Derived data
  // -------------------------------------------------------
  const todaysMissions = (activeMissions || []).filter(
    (m) => m.scheduled_date && isToday(new Date(m.scheduled_date))
  );

  // Group active missions by pilot
  const missionsByPilot = (activeMissions || []).reduce(
    (acc, m) => {
      const pilotName = m.profiles?.full_name || (m.pilot_id ? "Assigned Pilot" : "Unassigned");
      const key = m.pilot_id || "__unassigned__";
      if (!acc[key]) acc[key] = { name: pilotName, missions: [] };
      acc[key].missions.push(m);
      return acc;
    },
    {} as Record<string, { name: string; missions: MissionRow[] }>
  );

  const activeMissionCount = activeMissions?.length ?? 0;
  const pendingDeliveryCount = pendingDeliveries?.length ?? 0;
  const processingCount = processingJobs?.length ?? 0;
  const globalLoading = activeMissionsLoading || deliveriesLoading || processingLoading;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Mission Control</h1>
            <N8nHealthIndicator />
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time overview of all missions, pipeline, and team activity
          </p>
        </div>

        {/* Row 1 — Key Metrics */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <MetricCard
            label="Active Missions"
            value={activeMissionCount}
            icon={Activity}
            to="/admin/drone-jobs"
            loading={activeMissionsLoading}
          />
          <MetricCard
            label="Pending Deliveries"
            value={pendingDeliveryCount}
            icon={Send}
            to="/admin/drone-jobs?delivery=ready"
            loading={deliveriesLoading}
            accent="text-blue-500"
          />
          <MetricCard
            label="Processing Queue"
            value={processingCount}
            icon={Cog}
            to="/admin/pipeline"
            loading={processingLoading}
          />
          <MetricCard
            label="Today's Missions"
            value={todaysMissions.length}
            icon={CalendarClock}
            loading={activeMissionsLoading}
          />
        </div>

        {/* Row 2 — Today's Schedule */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeMissionsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : todaysMissions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No missions scheduled today</p>
            ) : (
              <div className="space-y-2">
                {todaysMissions.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <Link to={`/admin/drone-jobs/${m.id}`} className="font-mono text-sm font-semibold hover:underline text-primary">
                        {m.job_number}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.site_address || m.property_address}
                        {m.clients?.name || m.customers?.name ? ` · ${m.clients?.name || m.customers?.name}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.scheduled_time && (
                        <span className="text-xs text-muted-foreground">
                          {m.scheduled_time.slice(0, 5)}
                        </span>
                      )}
                      {m.profiles?.full_name && (
                        <Badge variant="outline" className="text-xs">{m.profiles.full_name}</Badge>
                      )}
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 3 + Row 4 — Active Missions by Pilot + Processing Queue */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Active Missions by Pilot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Missions by Pilot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeMissionsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : activeMissionCount === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No active missions</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(missionsByPilot).map(([key, { name, missions }]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          to={key === "__unassigned__" ? "/admin/drone-jobs" : `/admin/drone-jobs?pilot=${key}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {name}
                        </Link>
                        <Badge variant="secondary" className="text-xs">{missions.length}</Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-muted">
                        {missions.slice(0, 3).map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                            <Link to={`/admin/drone-jobs/${m.id}`} className="font-mono hover:underline text-primary truncate max-w-[120px]">
                              {m.job_number}
                            </Link>
                            <span className="text-muted-foreground truncate">{m.site_address || m.property_address}</span>
                            <StatusBadge status={m.status} />
                          </div>
                        ))}
                        {missions.length > 3 && (
                          <Link
                            to={`/admin/drone-jobs?pilot=${key}`}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            +{missions.length - 3} more
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Processing Queue
                </CardTitle>
                <Link to="/admin/pipeline" className="text-xs text-muted-foreground hover:underline">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {processingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !processingJobs || processingJobs.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No jobs currently processing</p>
              ) : (
                <div className="space-y-2">
                  {processingJobs.map((pj) => (
                    <div key={pj.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card text-sm">
                      <div className="min-w-0">
                        <Link
                          to={`/admin/drone-jobs/${pj.mission_id}`}
                          className="font-mono text-xs font-semibold hover:underline text-primary"
                        >
                          {pj.drone_jobs?.job_number || pj.mission_id.slice(0, 8)}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {pj.drone_jobs?.site_address || pj.drone_jobs?.property_address || ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {pj.path_code && (
                          <Badge variant="outline" className="text-xs font-mono">{pj.path_code}</Badge>
                        )}
                        <Badge className={`text-xs ${pj.status === "running" ? "bg-amber-500 text-white" : "bg-slate-400 text-white"}`}>
                          {pj.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 5 — Activity Feed + Compliance Alerts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityFeed />
          <ComplianceAlertsCard />
        </div>
      </main>
    </div>
  );
}
