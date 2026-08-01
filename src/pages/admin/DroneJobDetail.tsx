import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Edit, Send, Camera, Clock, Key, Copy, CheckCircle, ScanSearch, Settings2, Image as ImageIcon, AlertTriangle, ExternalLink, Link2, Calendar, DollarSign, FileText, ArrowRight, ListChecks, Trash2, Mail, Phone, MapPin, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import PageShell from "@/components/admin/PageShell";
import { LoadingState, EmptyState } from "@/components/admin/PageState";
import PaymentsPanel from "./components/PaymentsPanel";
import { Input } from "@/components/ui/input";
import ClientAutocomplete from "@/components/admin/ClientAutocomplete";
import QASummaryCard from "@/components/drone/QASummaryCard";
import QAAssetGrid from "@/components/drone/QAAssetGrid";
import AdminAssetUpload from "@/components/drone/AdminAssetUpload";
import type { Database, Json } from "@/integrations/supabase/types";
import type { DroneAsset, QAResults, ProcessingProfile } from "@/types/drone";
import { useQueryClient } from "@tanstack/react-query";

type DroneJobStatus = Database["public"]["Enums"]["drone_job_status"];

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
  client_id: string | null;
  processing_template_id: string | null;
  pilot_id: string | null;
  aircraft_id: string | null;
  pilot_notes: string | null;
  admin_notes: string | null;
  qa_score: number | null;
  qa_summary: Json | null;
  upload_token: string | null;
  upload_token_expires_at: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  delivery_token: string | null;
  delivery_token_created_at: string | null;
  download_url: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  drone_packages?: { id: string; name: string; code: string; price: number; edit_budget_minutes: number; processing_profile: Json | null } | null;
  service_requests?: { id: string; project_title: string | null } | null;
  clients?: { id: string; name: string; company: string | null; email: string | null; phone: string | null } | null;
  processing_templates?: { id: string; display_name: string | null; path_code: string | null; description: string | null; preset_name: string | null; lightroom_preset: string | null; output_format: string | null; qa_threshold: number | null } | null;
}

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

// Statuses visible in the progress stepper (admin happy path)
// Internal/automated statuses (ingested, paid, video_*, photos_delivered) are
// tracked but hidden from the stepper — they advance automatically.
const STATUS_ORDER: DroneJobStatus[] = [
  "intake", "scheduled", "captured", "uploaded", "processing", "qa", "delivered"
];

// Map internal statuses to the nearest stepper step so the indicator stays accurate
const STATUS_TO_STEP: Partial<Record<DroneJobStatus, DroneJobStatus>> = {
  ingested: "uploaded",
  complete: "uploaded",
  paid: "processing",
  review_pending: "qa",
  revision: "qa",
  video_grading: "processing",
  video_editing: "processing",
  video_exporting: "processing",
  photos_delivered: "delivered",
};

function JobEditForm({ job, onSuccess, onCancel }: { job: DroneJob; onSuccess: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    client_id: job.clients?.id || job.client_id || "",
    processing_template_id: job.processing_template_id || "",
    site_address: job.site_address || job.property_address || "",
    scheduled_date: job.scheduled_date || "",
    scheduled_time: job.scheduled_time || "",
    pilot_id: job.pilot_id || "",
    aircraft_id: job.aircraft_id || "",
    pilot_notes: job.pilot_notes || "",
    admin_notes: job.admin_notes || "",
  });

  const [templates, setTemplates] = useState<{ id: string; path_code: string | null; display_name: string | null; preset_name: string }[]>([]);
  const [pilots, setPilots] = useState<{ id: string; full_name: string | null }[]>([]);
  const [aircraft, setAircraft] = useState<{ id: string; model: string; nickname: string | null }[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      const [tmplRes, pilotRoleRes, aircraftRes] = await Promise.all([
        supabase.from("processing_templates").select("id, path_code, display_name, preset_name").eq("active", true).order("path_code"),
        supabase.from("user_roles").select("user_id").eq("role", "pilot"),
        supabase.from("aircraft").select("id, model, nickname").eq("status", "active").order("model"),
      ]);
      if (tmplRes.data) setTemplates(tmplRes.data);
      if (aircraftRes.data) setAircraft(aircraftRes.data);
      if (pilotRoleRes.data && pilotRoleRes.data.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", pilotRoleRes.data.map(r => r.user_id))
          .order("full_name");
        if (profileData) setPilots(profileData);
      }
    };
    loadOptions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("drone_jobs")
      .update({
        client_id: editData.client_id || null,
        processing_template_id: editData.processing_template_id || null,
        site_address: editData.site_address,
        property_address: editData.site_address,
        scheduled_date: editData.scheduled_date || null,
        scheduled_time: editData.scheduled_time || null,
        pilot_id: editData.pilot_id || null,
        aircraft_id: editData.aircraft_id || null,
        pilot_notes: editData.pilot_notes || null,
        admin_notes: editData.admin_notes || null,
      })
      .eq("id", job.id);

    if (error) {
      toast({ title: "Error updating job", description: error.message, variant: "destructive" });
    } else {
      onSuccess();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <Label>Client</Label>
        <ClientAutocomplete
          value={editData.client_id}
          onChange={(id) => setEditData({ ...editData, client_id: id })}
        />
      </div>

      <div className="space-y-2">
        <Label>Job Type</Label>
        <Select
          value={editData.processing_template_id}
          onValueChange={(v) => setEditData({ ...editData, processing_template_id: v === "none" ? "" : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select job type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.path_code ? `${t.path_code} – ` : ""}{t.display_name || t.preset_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Site Address *</Label>
        <Input
          value={editData.site_address}
          onChange={(e) => setEditData({ ...editData, site_address: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Scheduled Date</Label>
          <Input
            type="date"
            value={editData.scheduled_date}
            onChange={(e) => setEditData({ ...editData, scheduled_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input
            type="time"
            value={editData.scheduled_time}
            onChange={(e) => setEditData({ ...editData, scheduled_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Pilot</Label>
          <Select
            value={editData.pilot_id || "unassigned"}
            onValueChange={(v) => setEditData({ ...editData, pilot_id: v === "unassigned" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {pilots.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Aircraft</Label>
          <Select
            value={editData.aircraft_id || "unassigned"}
            onValueChange={(v) => setEditData({ ...editData, aircraft_id: v === "unassigned" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {aircraft.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.model}{a.nickname ? ` (${a.nickname})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pilot Notes</Label>
        <Textarea
          value={editData.pilot_notes}
          onChange={(e) => setEditData({ ...editData, pilot_notes: e.target.value })}
          placeholder="Access instructions, weather considerations..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Admin Notes</Label>
        <Textarea
          value={editData.admin_notes}
          onChange={(e) => setEditData({ ...editData, admin_notes: e.target.value })}
          placeholder="Internal notes..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Update Job"}
        </Button>
      </div>
    </form>
  );
}

export default function DroneJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [job, setJob] = useState<DroneJob | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [assets, setAssets] = useState<DroneAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<DroneJobStatus>("intake");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [runningQA, setRunningQA] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [extractingExif, setExtractingExif] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [sendingBalanceInvoice, setSendingBalanceInvoice] = useState(false);
  const queryClient = useQueryClient();

  const sendBalanceInvoice = async () => {
    if (!job) return;
    setSendingBalanceInvoice(true);

    const { data, error } = await supabase.functions.invoke("create-balance-invoice", {
      body: { job_id: job.id },
    });

    if (error) {
      toast({
        title: "Failed to send balance invoice",
        description: error.message,
        variant: "destructive",
      });
    } else if (data?.error) {
      toast({
        title: "Balance invoice error",
        description: data.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Balance invoice sent" });
      queryClient.invalidateQueries({ queryKey: ["payments", job.id] });
    }
    setSendingBalanceInvoice(false);
  };

  const fetchJob = async () => {
    if (!id) return;
    setLoading(true);

    const [jobRes, assetsRes] = await Promise.all([
      supabase
        .from("drone_jobs")
        .select("*, drone_packages(id, name, code, price, edit_budget_minutes, processing_profile), service_requests(id, project_title), clients(id, name, company, email, phone), processing_templates(id, display_name, path_code, description, preset_name, lightroom_preset, output_format, qa_threshold)")
        .eq("id", id)
        .single(),
      supabase
        .from("drone_assets")
        .select("*")
        .eq("job_id", id)
        .order("sort_order"),
    ]);

    if (jobRes.error) {
      toast({ title: "Error loading job", description: jobRes.error.message, variant: "destructive" });
    } else {
      setJob(jobRes.data);
      setNewStatus(jobRes.data.status);
      setDeliveryNotes(jobRes.data.delivery_notes || "");
    }

    if (assetsRes.data) {
      setAssets(assetsRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchJob();
    checkCalendarConnection();
  }, [id, user]);

  const checkCalendarConnection = async () => {
    if (!user) return;
    const { data } = await supabase.functions.invoke("google-calendar-auth", {
      body: { action: "check-connection", user_id: user.id },
    });
    if (data) {
      setCalendarConnected(data.connected && !data.expired);
    }
  };

  const syncToCalendar = async () => {
    if (!job || !user) return;
    setSyncingCalendar(true);

    const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action: "sync", job_id: job.id, user_id: user.id },
    });

    if (error) {
      toast({
        title: "Calendar sync failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (data?.error) {
      toast({
        title: "Calendar sync failed",
        description: data.error === "Not connected to Google Calendar"
          ? "Connect Google Calendar in Settings first"
          : data.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Synced to Google Calendar",
        description: data?.event_link ? "Event created successfully" : undefined,
      });
      fetchJob();
    }
    setSyncingCalendar(false);
  };

  const handleStatusChange = async (status: DroneJobStatus) => {
    if (!job) return;
    const { error } = await supabase
      .from("drone_jobs")
      .update({ status })
      .eq("id", job.id);

    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    } else {
      setNewStatus(status);
      setJob({ ...job, status });
      toast({ title: "Status updated" });
    }
  };

  const generateUploadToken = async () => {
    if (!job) return;
    setGeneratingToken(true);

    const { data, error } = await supabase.functions.invoke("drone-job-token", {
      body: { action: "generate", job_id: job.id },
    });

    if (error) {
      toast({ title: "Error generating token", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Upload token generated" });
      fetchJob();
    }
    setGeneratingToken(false);
  };

  const copyUploadLink = () => {
    if (!job?.upload_token) return;
    const url = `${window.location.origin}/drone-upload/${job.upload_token}`;
    navigator.clipboard.writeText(url);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const runQAAnalysis = async () => {
    if (!job || assets.length === 0) return;
    setRunningQA(true);

    for (const asset of assets) {
      if (asset.qa_status !== "pending") continue;

      const { error } = await supabase.functions.invoke("drone-qa-analyze", {
        body: { asset_id: asset.id },
      });

      if (error) {
        toast({ title: `QA failed for ${asset.file_name}`, description: error.message, variant: "destructive" });
      }
    }

    // Run batch analysis
    await supabase.functions.invoke("drone-batch-qa", {
      body: { job_id: job.id },
    });

    toast({ title: "QA analysis complete" });
    fetchJob();
    setRunningQA(false);
  };

  const extractExifData = async () => {
    if (!job || assets.length === 0) return;
    setExtractingExif(true);

    const { data, error } = await supabase.functions.invoke("drone-extract-exif", {
      body: { job_id: job.id },
    });

    if (error) {
      toast({ title: "EXIF extraction failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "EXIF extraction complete",
        description: `Processed ${data?.processed || 0} assets`
      });
      fetchJob();
    }
    setExtractingExif(false);
  };

  const sendDelivery = async () => {
    const recipientEmail = job?.clients?.email;
    if (!job || !recipientEmail) return;
    setSending(true);

    const { error } = await supabase.functions.invoke("drone-delivery-email", {
      body: {
        job_id: job.id,
        // The function destructures `custom_message` (drone-delivery-email
        // index.ts:40). Sending `delivery_notes` meant the admin's note was
        // silently dropped from the client email AND written back as null,
        // erasing whatever note was already on the job.
        custom_message: deliveryNotes || undefined,
      },
    });

    if (error) {
      toast({ title: "Delivery failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Delivery sent successfully" });
      fetchJob();
    }
    setSending(false);
  };

  const deleteJob = async () => {
    if (!job) return;
    setDeleting(true);

    // Best-effort: remove uploaded files from storage (DB rows cascade on delete).
    const paths = assets
      .flatMap((a) => [a.file_path, (a as { thumbnail_path?: string | null }).thumbnail_path])
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("drone-jobs").remove(paths);
      if (storageError) {
        // Non-fatal — keep going so the job row still gets removed.
        console.warn("Storage cleanup failed:", storageError.message);
      }
    }

    const { error } = await supabase.from("drone_jobs").delete().eq("id", job.id);

    if (error) {
      const blocked = /foreign key|violates/i.test(error.message);
      toast({
        title: "Couldn't delete job",
        description: blocked
          ? "This job is still linked to another record (e.g. a marketplace lead). Unlink it first, then try again."
          : error.message,
        variant: "destructive",
      });
      setDeleting(false);
      return;
    }

    toast({ title: "Job deleted", description: `${job.job_number} and its files were removed.` });
    setDeleteOpen(false);
    navigate("/admin/missions");
  };

  if (loading) {
    return (
      <PageShell title="Mission" icon={Camera} width="full">
        <LoadingState variant="detail" rows={6} label="Loading mission" />
      </PageShell>
    );
  }

  if (!job) {
    return (
      <PageShell title="Mission" icon={Camera} width="full">
        <EmptyState
          icon={Camera}
          title="Mission not found"
          description="This mission may have been deleted."
          action={
            <Link to="/admin/missions">
              <Button variant="outline">Back to missions</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  const getStatusBadge = (status: DroneJobStatus) => {
    const config = STATUS_CONFIG[status];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <PageShell
      title={
        <span className="flex flex-wrap items-center gap-3">
          <span className="font-mono">{job.job_number}</span>
          {getStatusBadge(job.status)}
        </span>
      }
      description={job.property_address}
      breadcrumbs={[
        { label: "Missions", href: "/admin/missions" },
        { label: job.job_number },
      ]}
      width="full"
      actions={
        <>
          <Button onClick={fetchJob} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsEditOpen(true)} variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            onClick={() => { setDeleteConfirm(""); setDeleteOpen(true); }}
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </>
      }
    >
        {/* Status Progress */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between overflow-x-auto gap-2">
              {STATUS_ORDER.map((step, index) => {
                const displayStatus = STATUS_TO_STEP[job.status] ?? job.status;
                const currentIndex = STATUS_ORDER.indexOf(displayStatus);
                const isPast = index < currentIndex;
                const isCurrent = index === currentIndex;
                const config = STATUS_CONFIG[step];
                // Show actual status label when it differs from the stepper step
                const actualConfig = STATUS_CONFIG[job.status];
                const showActualLabel = isCurrent && displayStatus !== job.status;

                return (
                  <div
                    key={step}
                    className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium ${isCurrent
                      ? `${actualConfig.color} text-white`
                      : isPast
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground"
                      }`}
                  >
                    {showActualLabel ? actualConfig.label : config.label}
                  </div>
                );
              })}
            </div>
            {/* Manual status setter — always available */}
            {(() => {
              const needsAttention =
                job.status === "failed" || job.status === "cancelled" || job.status === "revision";
              return (
                <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className={`text-sm ${needsAttention ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                    {needsAttention ? "Needs attention — set status manually:" : "Set status manually"}
                  </span>
                  <Select value={job.status} onValueChange={(v) => handleStatusChange(v as DroneJobStatus)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Next step — context-aware guidance so actions aren't scattered across tabs */}
        {(() => {
          const hasAssets = assets.length > 0;
          const hasQA = !!job.qa_summary;
          const goto = (tab: string) => () => setActiveTab(tab);
          let step: { title: string; hint: string; buttons: React.ReactNode } | null = null;

          switch (job.status) {
            case "intake":
              step = {
                title: "Schedule this job",
                hint: "Set the client, job type, date, pilot and aircraft to get started.",
                buttons: (
                  <>
                    <Button size="sm" onClick={() => setIsEditOpen(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit & Schedule
                    </Button>
                    <Button size="sm" variant="outline" onClick={generateUploadToken} disabled={generatingToken}>
                      <Key className="mr-2 h-4 w-4" />
                      {job.upload_token ? "Regenerate Upload Link" : "Generate Upload Link"}
                    </Button>
                  </>
                ),
              };
              break;
            case "scheduled":
              step = {
                title: "Get the files from the field",
                hint: job.upload_token
                  ? "Share the upload link, or add the shoot to your calendar."
                  : "Generate an upload link, or add the shoot to your calendar.",
                buttons: (
                  <>
                    {job.upload_token ? (
                      <Button size="sm" onClick={copyUploadLink}>
                        <Copy className="mr-2 h-4 w-4" />
                        {tokenCopied ? "Copied!" : "Copy Upload Link"}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={generateUploadToken} disabled={generatingToken}>
                        <Key className="mr-2 h-4 w-4" />
                        Generate Upload Link
                      </Button>
                    )}
                    {job.scheduled_date && calendarConnected && (
                      <Button size="sm" variant="outline" onClick={syncToCalendar} disabled={syncingCalendar}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {job.google_event_id ? "Update Calendar" : "Add to Calendar"}
                      </Button>
                    )}
                  </>
                ),
              };
              break;
            case "captured":
            case "uploaded":
            case "ingested":
              step = hasQA
                ? {
                    title: "Ready to process",
                    hint: "QA is done. Review results and process the photos in WebODM.",
                    buttons: (
                      <Button size="sm" onClick={goto("processing")}>
                        Go to Processing
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ),
                  }
                : {
                    title: hasAssets ? "Run quality analysis" : "Upload the captured files",
                    hint: hasAssets
                      ? "Files are in. Run QA before processing."
                      : "Add the pilot's photos/videos, then run QA.",
                    buttons: (
                      <Button size="sm" onClick={goto(hasAssets ? "qa" : "assets")}>
                        {hasAssets ? "Go to QA" : "Go to Assets"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ),
                  };
              break;
            case "qa":
            case "review_pending":
            case "revision":
              step = {
                title: "Review needed",
                hint: "This job is waiting on your review before it can move forward.",
                buttons: (
                  <Button size="sm" onClick={goto(job.status === "review_pending" ? "processing" : "qa")}>
                    Review Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ),
              };
              break;
            case "processing":
            case "video_grading":
            case "video_editing":
            case "video_exporting":
              step = {
                title: "Processing in progress",
                hint: "Check processing status, or upload the finished deliverables when ready.",
                buttons: (
                  <Button size="sm" variant="outline" onClick={goto("processing")}>
                    View Processing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ),
              };
              break;
            case "complete":
              step = {
                title: "Wrap up & deliver",
                hint: "Send the balance invoice and deliver the final files to the client.",
                buttons: (
                  <>
                    <Button size="sm" onClick={goto("billing")}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Billing
                    </Button>
                    <Button size="sm" variant="outline" onClick={goto("delivery")}>
                      Delivery
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                ),
              };
              break;
            case "paid":
            case "delivered":
            case "photos_delivered":
              step = {
                title: "Delivered",
                hint: "Share the customer portal link or resend the delivery email.",
                buttons: (
                  <Button size="sm" variant="outline" onClick={goto("delivery")}>
                    Go to Delivery
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ),
              };
              break;
          }

          if (!step) return null;
          return (
            <Card className="mb-6 border-primary/30 bg-primary/[0.03]">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <ListChecks className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next step</p>
                    <p className="font-semibold leading-tight">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.hint}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">{step.buttons}</div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">
              Assets ({assets.length})
            </TabsTrigger>
            <TabsTrigger value="qa">QA</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Client & Contact */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Client & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {job.clients ? (
                    <div className="space-y-1">
                      <button
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => {/* TODO Phase 2: open client edit */}}
                      >
                        {job.clients.name}
                      </button>
                      {job.clients.company && <p className="text-muted-foreground">{job.clients.company}</p>}
                      {job.clients.email && (
                        <a href={`mailto:${job.clients.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {job.clients.email}
                        </a>
                      )}
                      {job.clients.phone && (
                        <a href={`tel:${job.clients.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {job.clients.phone}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No client assigned</p>
                  )}

                  {job.service_requests && (
                    <div className="border-t pt-3">
                      <Label className="text-xs text-muted-foreground">Service Request</Label>
                      <Link to="/admin/service-requests" className="block text-primary hover:underline">
                        {job.service_requests.project_title || "View Request"}
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule & Location */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Schedule & Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="font-medium">{job.property_address}</p>
                    {[job.property_city, job.property_state, job.property_zip].filter(Boolean).length > 0 && (
                      <p className="text-muted-foreground">
                        {[job.property_city, job.property_state, job.property_zip].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {job.site_address && job.site_address !== job.property_address && (
                      <p className="mt-1 text-xs text-muted-foreground">Site: {job.site_address}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Property Type</Label>
                    <p className="capitalize">{job.property_type}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Scheduled</Label>
                    {job.scheduled_date ? (
                      <>
                        <div className="flex items-center gap-2">
                          <p>
                            {format(new Date(job.scheduled_date), "MMMM d, yyyy")}
                            {job.scheduled_time && ` at ${job.scheduled_time}`}
                          </p>
                          {job.google_event_id && (
                            <span title="Synced to calendar">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={syncToCalendar}
                          disabled={syncingCalendar || !calendarConnected}
                          title={!calendarConnected ? "Connect Google Calendar in Settings" : undefined}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {syncingCalendar ? "Syncing..." : job.google_event_id ? "Update Calendar" : "Add to Calendar"}
                        </Button>
                        {!calendarConnected && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <Link to="/admin/settings" className="text-primary hover:underline">
                              Connect Google Calendar
                            </Link>{" "}
                            to sync events
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">Not scheduled</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Job Type & Package */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    Job Type & Package
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {job.processing_templates ? (
                    <div>
                      <div className="flex items-center gap-2">
                        {job.processing_templates.path_code && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                            {job.processing_templates.path_code}
                          </span>
                        )}
                        <p className="font-medium">{job.processing_templates.display_name}</p>
                      </div>
                      {job.processing_templates.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{job.processing_templates.description}</p>
                      )}
                    </div>
                  ) : job.drone_packages ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Package (legacy)</Label>
                      <p className="font-medium">{job.drone_packages.name}</p>
                      <p className="text-muted-foreground">
                        ${job.drone_packages.price} • {job.drone_packages.edit_budget_minutes} min edit budget
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No job type assigned</p>
                  )}
                  <div className="border-t pt-3">
                    <Label className="text-xs text-muted-foreground">Assets</Label>
                    <p>
                      {assets.length} file{assets.length !== 1 ? "s" : ""} uploaded
                      {job.qa_score != null && <> · QA {job.qa_score}%</>}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            {(job.pilot_notes || job.admin_notes) && (
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {job.pilot_notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Pilot Notes</Label>
                      <p className="whitespace-pre-wrap text-sm">{job.pilot_notes}</p>
                    </div>
                  )}
                  {job.admin_notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                      <p className="whitespace-pre-wrap text-sm">{job.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>


          {/* Assets Tab */}
          <TabsContent value="assets">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Upload Card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Upload Files
                  </CardTitle>
                  <CardDescription>
                    Drag and drop photos or videos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminAssetUpload jobId={job.id} onUploadComplete={fetchJob} />
                </CardContent>
              </Card>

              {/* Assets Grid */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Uploaded Assets</CardTitle>
                    <CardDescription>{assets.length} files</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={extractExifData}
                    disabled={extractingExif || assets.length === 0}
                  >
                    <ScanSearch className="mr-2 h-4 w-4" />
                    {extractingExif ? "Extracting..." : "Extract EXIF"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {assets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="mx-auto h-10 w-10 mb-3 opacity-50" />
                      <p>No assets uploaded yet</p>
                      <p className="text-sm">Use the upload panel to add files</p>
                    </div>
                  ) : (
                    <QAAssetGrid
                      assets={assets}
                      onRefresh={fetchJob}
                      qaThreshold={job.processing_templates?.qa_threshold}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* QA Tab */}
          <TabsContent value="qa">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Quality Analysis</h2>
                <Button
                  onClick={runQAAnalysis}
                  disabled={runningQA || assets.length === 0}
                >
                  {runningQA ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Run QA Analysis
                    </>
                  )}
                </Button>
              </div>

              {job.qa_summary ? (
                <QASummaryCard
                  summary={job.qa_summary}
                  editBudgetMinutes={job.drone_packages?.edit_budget_minutes || 60}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No QA analysis yet</p>
                    <p className="text-sm">Upload assets and run QA analysis to see results</p>
                  </CardContent>
                </Card>
              )}

              {assets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Quality Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <QAAssetGrid
                      assets={assets}
                      onRefresh={fetchJob}
                      showQADetails
                      qaThreshold={job.processing_templates?.qa_threshold}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing">
            <div className="space-y-6">
              {/* Manual processing — WebODM happens off-platform */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Processing
                  </CardTitle>
                  <CardDescription>
                    Photos are processed in WebODM off-platform. Use the profile below as your settings
                    reference, then mark the job complete when the deliverables are ready to upload.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(job.status === "complete" || job.status === "delivered" || job.status === "photos_delivered") ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Processing marked complete.
                    </div>
                  ) : (
                    <Button onClick={() => handleStatusChange("complete")}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Processing Complete
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Premium Review Approval UI */}
              {job.status === "review_pending" && (
                <Card className="border-violet-500/50 bg-violet-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-violet-600">
                      <AlertTriangle className="h-5 w-5" />
                      Premium Package Review Required
                    </CardTitle>
                    <CardDescription>
                      Sky replacement candidates require your approval before delivery
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Sky Replacement Candidates */}
                    {(() => {
                      const candidates = assets.filter(asset => {
                        const qaResults = asset.qa_results as unknown as QAResults;
                        return qaResults?.issues?.some((issue) =>
                          issue.type === "sky_quality" ||
                          issue.recommended_action?.includes("sky") ||
                          issue.category === "sky"
                        ) || qaResults?.recommendation === "warning";
                      });

                      if (candidates.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            No specific sky replacement candidates flagged. Review all assets if needed.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <Label className="text-muted-foreground">
                            {candidates.length} asset{candidates.length !== 1 ? "s" : ""} flagged for sky replacement review
                          </Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {candidates.slice(0, 8).map((asset) => {
                              const { data } = supabase.storage
                                .from("drone-uploads")
                                .getPublicUrl(asset.file_path);
                              return (
                                <div key={asset.id} className="relative group">
                                  <img
                                    src={data.publicUrl}
                                    alt={asset.file_name}
                                    className="w-full h-24 object-cover rounded-lg border"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs text-center px-1 truncate">
                                      {asset.file_name}
                                    </span>
                                  </div>
                                  {asset.qa_score && (
                                    <Badge
                                      variant="secondary"
                                      className="absolute top-1 right-1 text-xs"
                                    >
                                      {asset.qa_score}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {candidates.length > 8 && (
                            <p className="text-xs text-muted-foreground">
                              +{candidates.length - 8} more candidates
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Approval Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                      <Button
                        onClick={async () => {
                          await handleStatusChange("processing");
                          toast({
                            title: "Approved",
                            description: "Job will continue to delivery processing"
                          });
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve & Continue Delivery
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          await handleStatusChange("revision");
                          toast({
                            title: "Revision requested",
                            description: "Job marked for revision"
                          });
                        }}
                        className="flex-1"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Request Revision
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processing Profile Card — prefer processing_templates, fallback to legacy drone_packages.processing_profile */}
              {(job.processing_templates || job.drone_packages?.processing_profile) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5" />
                      Processing Profile
                    </CardTitle>
                    <CardDescription>
                      {job.processing_templates
                        ? (job.processing_templates.display_name || job.processing_templates.preset_name || "Template")
                        : (job.drone_packages?.processing_profile as unknown as ProcessingProfile)?.lightroom_preset || "Default preset"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {job.processing_templates ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {job.processing_templates.path_code && (
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Path Code</p>
                            <Badge variant="outline" className="font-mono">{job.processing_templates.path_code}</Badge>
                          </div>
                        )}
                        <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                          <p className="text-sm font-medium text-muted-foreground">Lightroom Preset</p>
                          <p className="font-mono text-sm">{job.processing_templates.lightroom_preset || job.processing_templates.preset_name}</p>
                        </div>
                        {job.processing_templates.output_format && (
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Output Format</p>
                            <p className="text-sm">{job.processing_templates.output_format}</p>
                          </div>
                        )}
                        {job.processing_templates.qa_threshold !== null && (
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">QA Threshold</p>
                            <p className="text-sm">{job.processing_templates.qa_threshold}%</p>
                          </div>
                        )}
                        {job.processing_templates.description && (
                          <div className="md:col-span-2 lg:col-span-3 space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Description</p>
                            <p className="text-sm">{job.processing_templates.description}</p>
                          </div>
                        )}
                      </div>
                    ) : (() => {
                      const profile = job.drone_packages?.processing_profile as unknown as ProcessingProfile;
                      if (!profile) return null;

                      return (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Lightroom Preset</p>
                            <p className="font-mono text-sm">{profile.lightroom_preset}</p>
                          </div>
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Auto Corrections</p>
                            <div className="flex flex-wrap gap-1">
                              {profile.lens_correction && <Badge variant="secondary" className="text-xs">Lens</Badge>}
                              {profile.horizon_straighten && <Badge variant="secondary" className="text-xs">Horizon</Badge>}
                              {profile.sky_enhance && <Badge variant="secondary" className="text-xs">Sky Enhance</Badge>}
                            </div>
                          </div>
                          {profile.exposure_balance && (
                            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                              <p className="text-sm font-medium text-muted-foreground">Exposure Balance</p>
                              <div className="text-sm space-y-1">
                                <p>Shadows: {profile.exposure_balance.shadows > 0 ? '+' : ''}{profile.exposure_balance.shadows}</p>
                                <p>Highlights: {profile.exposure_balance.highlights > 0 ? '+' : ''}{profile.exposure_balance.highlights}</p>
                                {profile.exposure_balance.whites && (
                                  <p>Whites: {profile.exposure_balance.whites > 0 ? '+' : ''}{profile.exposure_balance.whites}</p>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Output Formats</p>
                            <div className="flex flex-wrap gap-1">
                              {profile.output_formats?.map((fmt: string) => (
                                <Badge key={fmt} variant="outline" className="text-xs">{fmt}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Quality</p>
                            <p className="text-sm">
                              {profile.jpg_quality}% JPEG
                              {profile.resize_max_px && ` • ${profile.resize_max_px}px max`}
                            </p>
                          </div>
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Vibrance Boost</p>
                            <p className="text-sm">+{profile.vibrance_boost || 0}</p>
                          </div>
                          {profile.sky_replace && profile.sky_replace !== false && (
                            <div className="space-y-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <p className="text-sm font-medium text-amber-600 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Sky Replacement
                              </p>
                              <p className="text-sm">
                                {profile.sky_replace === "manual_review" ? "Manual review required" : "Auto-replace enabled"}
                              </p>
                            </div>
                          )}
                          {profile.labeling?.enabled && (
                            <div className="space-y-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Photo Labeling
                              </p>
                              <div className="flex flex-wrap gap-1 text-xs">
                                {profile.labeling.include_compass && <Badge variant="secondary">Compass</Badge>}
                                {profile.labeling.include_date && <Badge variant="secondary">Date</Badge>}
                                {profile.labeling.include_address && <Badge variant="secondary">Address</Badge>}
                              </div>
                            </div>
                          )}
                          {profile.review_gate && (
                            <div className="md:col-span-2 lg:col-span-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-sm font-medium text-purple-600">Premium Review Gate Active</p>
                              <p className="text-sm text-muted-foreground">This job requires manual approval before delivery</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Edit Budget Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Processing Status</CardTitle>
                  <CardDescription>Track post-processing progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {job.drone_packages && (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">Edit Budget</p>
                          <p className="text-sm text-muted-foreground">
                            {job.drone_packages.edit_budget_minutes} minutes allocated
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    {/* Asset Processing Status */}
                    {assets.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Asset Processing Status</Label>
                        <div className="grid gap-2">
                          {assets.map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-center justify-between p-2 rounded border bg-card"
                            >
                              <span className="text-sm font-mono truncate max-w-[200px]">
                                {asset.file_name}
                              </span>
                              <Badge
                                variant={
                                  asset.processing_status === "processed"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {asset.processing_status || "raw"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            {/* Balance Invoice Button */}
            {job.status === "complete" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Balance Invoice
                  </CardTitle>
                  <CardDescription>
                    Send the balance invoice to the client via Square
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={sendBalanceInvoice}
                    disabled={sendingBalanceInvoice}
                  >
                    {sendingBalanceInvoice ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Send Balance Invoice
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Payments Panel */}
            <PaymentsPanel jobId={job.id} />
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4">
            {/* Open Delivery Review + Create Report */}
            <div className="flex justify-end gap-2">
              <Link to={`/admin/reports/new?job_id=${job.id}`}>
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Report
                </Button>
              </Link>
              <Link to={`/admin/missions/${job.id}/delivery`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Delivery Review
                </Button>
              </Link>
            </div>

            {/* Customer Portal Link Card - show if delivered */}
            {job.delivery_token && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Customer Portal
                  </CardTitle>
                  <CardDescription>
                    Customers can view and download their photos anytime
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-muted rounded-lg font-mono text-sm truncate">
                      {window.location.origin}/my-jobs/{job.delivery_token}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/my-jobs/${job.delivery_token}`);
                        toast({ title: "Portal link copied!" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(`/my-jobs/${job.delivery_token}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  {job.delivery_token_created_at && (
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(job.delivery_token_created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Send Delivery Card */}
            <Card>
              <CardHeader>
                <CardTitle>Send Delivery Email</CardTitle>
                <CardDescription>
                  {job.delivered_at
                    ? `Delivered on ${format(new Date(job.delivered_at), "MMMM d, yyyy 'at' h:mm a")}`
                    : "Send final deliverables to customer"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!job.clients?.email ? (
                  <p className="text-muted-foreground">No client email on file</p>
                ) : (
                  <>
                    <div>
                      <Label>Delivery Notes</Label>
                      <Textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="Add a personal message for the customer..."
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Sending to: {job.clients?.email}
                      </p>
                      <Button onClick={sendDelivery} disabled={sending || assets.length === 0}>
                        {sending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : job.delivered_at ? (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Resend Delivery
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Delivery
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job {job.job_number}</DialogTitle>
          </DialogHeader>
          <JobEditForm
            job={job}
            onSuccess={() => {
              setIsEditOpen(false);
              fetchJob();
              toast({ title: "Job updated successfully" });
            }}
            onCancel={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete / clean-up confirmation */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {job.job_number}?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently removes the mission, its {assets.length} uploaded file
              {assets.length !== 1 ? "s" : ""}, QA results, processing records, and any reports. Payments stay on
              record but are unlinked. This can't be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-semibold text-foreground">{job.job_number}</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={job.job_number}
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteJob}
                disabled={deleting || deleteConfirm.trim() !== job.job_number}
              >
                {deleting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Job
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
