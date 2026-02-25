import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
import { ArrowLeft, RefreshCw, Edit, Send, Camera, Clock, Key, Copy, CheckCircle, ScanSearch, Zap, Settings2, Image as ImageIcon, AlertTriangle, ExternalLink, Link2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import AdminNav from "./components/AdminNav";
import DroneJobForm from "./components/DroneJobForm";
import QASummaryCard from "@/components/drone/QASummaryCard";
import QAAssetGrid from "@/components/drone/QAAssetGrid";
import AdminAssetUpload from "@/components/drone/AdminAssetUpload";
import type { Database, Json } from "@/integrations/supabase/types";
import type { DroneAsset, QAResults, ProcessingProfile } from "@/types/drone";
import { useMissionSteps, useProcessingJob, useTriggerPipeline, useResumeManualEdit } from "@/hooks/usePipeline";
import type { ProcessingJobStep } from "@/hooks/usePipeline";
import PipelineStepRow from "@/components/pipeline/PipelineStepRow";
import PipelineStepper from "@/components/pipeline/PipelineStepper";

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
  customers?: { id: string; name: string; email: string; phone: string | null } | null;
  drone_packages?: { id: string; name: string; code: string; price: number; edit_budget_minutes: number; processing_profile: Json | null } | null;
  service_requests?: { id: string; project_title: string | null } | null;
  clients?: { id: string; name: string; company: string | null; email: string | null; phone: string | null } | null;
  processing_templates?: { id: string; display_name: string | null; path_code: string | null; description: string | null } | null;
}

const STATUS_CONFIG: Record<DroneJobStatus, { label: string; color: string }> = {
  intake: { label: "Intake", color: "bg-slate-500" },
  scheduled: { label: "Scheduled", color: "bg-blue-500" },
  captured: { label: "Captured", color: "bg-indigo-500" },
  uploaded: { label: "Uploaded", color: "bg-purple-500" },
  complete: { label: "Complete", color: "bg-teal-500" },
  processing: { label: "Processing", color: "bg-amber-500" },
  review_pending: { label: "Review Pending", color: "bg-violet-500" },
  qa: { label: "QA Review", color: "bg-orange-500" },
  revision: { label: "Revision", color: "bg-red-500" },
  delivered: { label: "Delivered", color: "bg-green-500" },
  failed: { label: "Failed", color: "bg-red-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-500" },
};

const STATUS_ORDER: DroneJobStatus[] = [
  "intake", "scheduled", "captured", "uploaded", "complete", "processing", "review_pending", "qa", "revision", "delivered"
];

function PipelineSteps({ missionId }: { missionId: string | undefined }) {
  const { data: steps = [] } = useMissionSteps(missionId);
  if (steps.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Legacy Pipeline Steps
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PipelineStepRow steps={steps} />
      </CardContent>
    </Card>
  );
}

function ProcessingJobCard({ missionId, processingTemplateId }: {
  missionId: string;
  processingTemplateId: string | null;
}) {
  const { toast } = useToast();
  const { data: processingJob, isLoading } = useProcessingJob(missionId);
  const triggerPipeline = useTriggerPipeline();
  const resumeManualEdit = useResumeManualEdit();

  const handleStartProcessing = async () => {
    if (!processingTemplateId) {
      toast({
        title: "No processing template",
        description: "Assign a processing template to this job before starting.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await triggerPipeline.mutateAsync({
        missionId,
        processingTemplateId,
      });

      if ((result as { conflict?: boolean }).conflict) {
        toast({
          title: "Job already active",
          description: "A pipeline job for this mission is already running.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Pipeline started", description: "Processing job created and sent to n8n." });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to start pipeline", description: message, variant: "destructive" });
    }
  };

  const handleMarkEditComplete = async (stepName: string, notes?: string) => {
    if (!processingJob) return;
    try {
      await resumeManualEdit.mutateAsync({
        processingJobId: processingJob.id,
        stepName,
        notes,
      });
      toast({ title: "Pipeline resumed", description: "Manual edit marked complete. Continuing..." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Resume failed", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
          <p className="text-sm">Loading pipeline status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!processingJob) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Start Processing
          </CardTitle>
          <CardDescription>
            No active pipeline job for this mission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStartProcessing}
            disabled={triggerPipeline.isPending || !processingTemplateId}
            className="w-full sm:w-auto"
          >
            {triggerPipeline.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Start Processing Pipeline
              </>
            )}
          </Button>
          {!processingTemplateId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Assign a processing template in the Overview tab first.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const steps = (processingJob.steps ?? []) as ProcessingJobStep[];
  const statusBadgeClass =
    processingJob.status === 'complete'
      ? 'bg-green-100 text-green-700'
      : processingJob.status === 'failed'
        ? 'bg-red-100 text-red-700'
        : processingJob.status === 'running'
          ? 'bg-blue-100 text-blue-700'
          : processingJob.status === 'awaiting_manual_edit'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-600';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pipeline Status
          </CardTitle>
          <Badge variant="secondary" className={statusBadgeClass}>
            {processingJob.status.replace('_', ' ')}
          </Badge>
        </div>
        {processingJob.started_at && (
          <CardDescription>
            Started {format(new Date(processingJob.started_at), "MMM d 'at' h:mm a")}
            {processingJob.completed_at && (
              <> &middot; Completed {format(new Date(processingJob.completed_at), "MMM d 'at' h:mm a")}</>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {processingJob.error_message && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 font-mono">
            {processingJob.error_message}
          </div>
        )}
        <PipelineStepper
          steps={steps}
          currentStep={processingJob.current_step}
          processingJobId={processingJob.id}
          onMarkEditComplete={handleMarkEditComplete}
        />
      </CardContent>
    </Card>
  );
}

export default function DroneJobDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [job, setJob] = useState<DroneJob | null>(null);
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
  const [triggeringProcessing, setTriggeringProcessing] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const fetchJob = async () => {
    if (!id) return;
    setLoading(true);

    const [jobRes, assetsRes] = await Promise.all([
      supabase
        .from("drone_jobs")
        .select("*, customers(id, name, email, phone), drone_packages(id, name, code, price, edit_budget_minutes, processing_profile), service_requests(id, project_title), clients(id, name, company, email, phone), processing_templates(id, display_name, path_code, description)")
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

  const triggerProcessingWebhook = async () => {
    if (!job) return;
    setTriggeringProcessing(true);

    // Manually trigger batch-qa which will send the webhook if configured
    const { error } = await supabase.functions.invoke("drone-batch-qa", {
      body: { job_id: job.id },
    });

    if (error) {
      toast({ title: "Failed to trigger processing", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Processing triggered", description: "Job sent to n8n processing workflow" });
      fetchJob();
    }
    setTriggeringProcessing(false);
  };

  const sendDelivery = async () => {
    if (!job || !job.customers?.email) return;
    setSending(true);

    const { error } = await supabase.functions.invoke("drone-delivery-email", {
      body: {
        job_id: job.id,
        delivery_notes: deliveryNotes,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="container mx-auto px-4 py-8">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Job not found</p>
        </main>
      </div>
    );
  }

  const getStatusBadge = (status: DroneJobStatus) => {
    const config = STATUS_CONFIG[status];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/drone-jobs">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <img
                src="/assets/drone/drone-logo-original.jpg"
                alt="Drone Services"
                className="h-10 w-10 object-contain"
              />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground font-mono">{job.job_number}</h1>
                  {getStatusBadge(job.status)}
                </div>
                <p className="text-sm text-muted-foreground">{job.property_address}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchJob} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setIsEditOpen(true)} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>

        {/* Status Progress */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between overflow-x-auto gap-2">
              {STATUS_ORDER.map((status, index) => {
                const currentIndex = STATUS_ORDER.indexOf(job.status);
                const isPast = index < currentIndex;
                const isCurrent = index === currentIndex;
                const config = STATUS_CONFIG[status];

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition-colors ${isCurrent
                      ? `${config.color} text-white`
                      : isPast
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">
              Assets ({assets.length})
            </TabsTrigger>
            <TabsTrigger value="qa">QA</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{job.property_address}</p>
                    <p className="text-sm text-muted-foreground">
                      {[job.property_city, job.property_state, job.property_zip].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Property Type</Label>
                    <p className="capitalize">{job.property_type}</p>
                  </div>
                  {job.scheduled_date && (
                    <div>
                      <Label className="text-muted-foreground">Scheduled</Label>
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
                        {syncingCalendar
                          ? "Syncing..."
                          : job.google_event_id
                            ? "Update Calendar"
                            : "Add to Calendar"}
                      </Button>
                      {!calendarConnected && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Link to="/admin/settings" className="text-primary hover:underline">
                            Connect Google Calendar
                          </Link> to sync events
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client & Job Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.clients ? (
                    <div>
                      <Label className="text-muted-foreground">Client</Label>
                      <button
                        className="block text-left hover:underline font-medium text-primary"
                        onClick={() => {/* TODO Phase 2: open client edit */}}
                      >
                        {job.clients.name}
                      </button>
                      {job.clients.company && (
                        <p className="text-sm text-muted-foreground">{job.clients.company}</p>
                      )}
                      {job.clients.email && (
                        <p className="text-sm text-muted-foreground">{job.clients.email}</p>
                      )}
                      {job.clients.phone && (
                        <p className="text-sm text-muted-foreground">{job.clients.phone}</p>
                      )}
                    </div>
                  ) : job.customers ? (
                    <div>
                      <Label className="text-muted-foreground">Customer (legacy)</Label>
                      <p className="font-medium">{job.customers.name}</p>
                      <p className="text-sm text-muted-foreground">{job.customers.email}</p>
                      {job.customers.phone && (
                        <p className="text-sm text-muted-foreground">{job.customers.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No client assigned</p>
                  )}

                  {job.processing_templates ? (
                    <div>
                      <Label className="text-muted-foreground">Job Type</Label>
                      <div className="flex items-center gap-2">
                        {job.processing_templates.path_code && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                            {job.processing_templates.path_code}
                          </span>
                        )}
                        <p className="font-medium">{job.processing_templates.display_name}</p>
                      </div>
                      {job.processing_templates.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.processing_templates.description}
                        </p>
                      )}
                    </div>
                  ) : job.drone_packages ? (
                    <div>
                      <Label className="text-muted-foreground">Package (legacy)</Label>
                      <p className="font-medium">{job.drone_packages.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${job.drone_packages.price} • {job.drone_packages.edit_budget_minutes} min edit budget
                      </p>
                    </div>
                  ) : null}

                  {job.site_address && (
                    <div>
                      <Label className="text-muted-foreground">Site Address</Label>
                      <p className="font-medium">{job.site_address}</p>
                    </div>
                  )}

                  {job.service_requests && (
                    <div>
                      <Label className="text-muted-foreground">Service Request</Label>
                      <Link
                        to={`/admin/service-requests`}
                        className="text-primary hover:underline text-sm"
                      >
                        {job.service_requests.project_title || "View Request"}
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(job.pilot_notes || job.admin_notes) && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {job.pilot_notes && (
                      <div>
                        <Label className="text-muted-foreground">Pilot Notes</Label>
                        <p className="text-sm whitespace-pre-wrap">{job.pilot_notes}</p>
                      </div>
                    )}
                    {job.admin_notes && (
                      <div>
                        <Label className="text-muted-foreground">Admin Notes</Label>
                        <p className="text-sm whitespace-pre-wrap">{job.admin_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
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
                    <QAAssetGrid assets={assets} onRefresh={fetchJob} />
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
                    <QAAssetGrid assets={assets} onRefresh={fetchJob} showQADetails />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing">
            <div className="space-y-6">
              {/* New processing_jobs stepper */}
              {id && (
                <ProcessingJobCard
                  missionId={id}
                  processingTemplateId={job.processing_template_id}
                />
              )}

              {/* Legacy processing_steps (kept for backward compat) */}
              <PipelineSteps missionId={id} />
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

              {/* Processing Profile Card */}
              {job.drone_packages?.processing_profile && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Processing Profile
                      </CardTitle>
                      <CardDescription>
                        {(job.drone_packages.processing_profile as unknown as ProcessingProfile)?.lightroom_preset || "Default preset"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerProcessingWebhook}
                      disabled={triggeringProcessing || assets.length === 0}
                    >
                      {triggeringProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Send to Processing
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const profile = job.drone_packages?.processing_profile as unknown as ProcessingProfile;
                      if (!profile) return null;

                      return (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {/* Lightroom Settings */}
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Lightroom Preset</p>
                            <p className="font-mono text-sm">{profile.lightroom_preset}</p>
                          </div>

                          {/* Corrections */}
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Auto Corrections</p>
                            <div className="flex flex-wrap gap-1">
                              {profile.lens_correction && (
                                <Badge variant="secondary" className="text-xs">Lens</Badge>
                              )}
                              {profile.horizon_straighten && (
                                <Badge variant="secondary" className="text-xs">Horizon</Badge>
                              )}
                              {profile.sky_enhance && (
                                <Badge variant="secondary" className="text-xs">Sky Enhance</Badge>
                              )}
                            </div>
                          </div>

                          {/* Exposure Balance */}
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

                          {/* Output Settings */}
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Output Formats</p>
                            <div className="flex flex-wrap gap-1">
                              {profile.output_formats?.map((fmt: string) => (
                                <Badge key={fmt} variant="outline" className="text-xs">{fmt}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Quality Settings */}
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Quality</p>
                            <p className="text-sm">
                              {profile.jpg_quality}% JPEG
                              {profile.resize_max_px && ` • ${profile.resize_max_px}px max`}
                            </p>
                          </div>

                          {/* Vibrance */}
                          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-muted-foreground">Vibrance Boost</p>
                            <p className="text-sm">+{profile.vibrance_boost || 0}</p>
                          </div>

                          {/* Sky Replacement (Premium) */}
                          {profile.sky_replace && profile.sky_replace !== false && (
                            <div className="space-y-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <p className="text-sm font-medium text-amber-600 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Sky Replacement
                              </p>
                              <p className="text-sm">
                                {profile.sky_replace === "manual_review"
                                  ? "Manual review required"
                                  : "Auto-replace enabled"}
                              </p>
                            </div>
                          )}

                          {/* Labeling (Construction) */}
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

                          {/* Review Gate (Premium) */}
                          {profile.review_gate && (
                            <div className="md:col-span-2 lg:col-span-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-sm font-medium text-purple-600">
                                Premium Review Gate Active
                              </p>
                              <p className="text-sm text-muted-foreground">
                                This job requires manual approval before delivery
                              </p>
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

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4">
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
                {!job.customers?.email ? (
                  <p className="text-muted-foreground">No customer email on file</p>
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
                        Sending to: {job.customers.email}
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
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job {job.job_number}</DialogTitle>
          </DialogHeader>
          <DroneJobForm
            initialData={{
              id: job.id,
              customer_id: job.customers?.id,
              package_id: job.drone_packages?.id,
              property_address: job.property_address,
              property_city: job.property_city || "",
              property_state: job.property_state || "",
              property_zip: job.property_zip || "",
              property_type: job.property_type,
              scheduled_date: job.scheduled_date || "",
              scheduled_time: job.scheduled_time || "",
              pilot_notes: job.pilot_notes || "",
              admin_notes: job.admin_notes || "",
            }}
            onSuccess={() => {
              setIsEditOpen(false);
              fetchJob();
              toast({ title: "Job updated successfully" });
            }}
            onCancel={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
