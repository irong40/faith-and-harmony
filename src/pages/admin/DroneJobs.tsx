import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, RefreshCw, Plus, Eye, Camera, Calendar, CheckCircle, AlertTriangle, XCircle, Send, User } from "lucide-react";
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

export default function DroneJobs() {
  const { toast } = useToast();
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

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={10} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No drone jobs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
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

    </div>
  );
}
