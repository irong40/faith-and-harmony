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
import { ArrowLeft, RefreshCw, Edit, Send, Camera, Clock, Key, Copy, CheckCircle, ScanSearch, Zap, Settings2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import AdminNav from "./components/AdminNav";
import DroneJobForm from "./components/DroneJobForm";
import QASummaryCard from "@/components/drone/QASummaryCard";
import QAAssetGrid from "@/components/drone/QAAssetGrid";
import type { Database, Json } from "@/integrations/supabase/types";

type DroneJobStatus = Database["public"]["Enums"]["drone_job_status"];

interface DroneAsset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  qa_status: Database["public"]["Enums"]["qa_status"] | null;
  qa_score: number | null;
  qa_results: Json | null;
  sort_order: number | null;
  created_at: string;
  exif_data?: Json | null;
  camera_model?: string | null;
  capture_date?: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  gps_altitude?: number | null;
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
  pilot_notes: string | null;
  admin_notes: string | null;
  qa_score: number | null;
  qa_summary: Json | null;
  upload_token: string | null;
  upload_token_expires_at: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: { id: string; name: string; email: string; phone: string | null } | null;
  drone_packages?: { id: string; name: string; code: string; price: number; edit_budget_minutes: number; processing_profile: Json | null } | null;
  service_requests?: { id: string; project_title: string | null } | null;
}

const STATUS_CONFIG: Record<DroneJobStatus, { label: string; color: string }> = {
  intake: { label: "Intake", color: "bg-slate-500" },
  scheduled: { label: "Scheduled", color: "bg-blue-500" },
  captured: { label: "Captured", color: "bg-indigo-500" },
  uploaded: { label: "Uploaded", color: "bg-purple-500" },
  processing: { label: "Processing", color: "bg-amber-500" },
  review_pending: { label: "Review Pending", color: "bg-violet-500" },
  qa: { label: "QA Review", color: "bg-orange-500" },
  revision: { label: "Revision", color: "bg-red-500" },
  delivered: { label: "Delivered", color: "bg-green-500" },
  cancelled: { label: "Cancelled", color: "bg-gray-500" },
};

const STATUS_ORDER: DroneJobStatus[] = [
  "intake", "scheduled", "captured", "uploaded", "processing", "review_pending", "qa", "revision", "delivered"
];

export default function DroneJobDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
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

  const fetchJob = async () => {
    if (!id) return;
    setLoading(true);

    const [jobRes, assetsRes] = await Promise.all([
      supabase
        .from("drone_jobs")
        .select("*, customers(id, name, email, phone), drone_packages(id, name, code, price, edit_budget_minutes, processing_profile), service_requests(id, project_title)")
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
  }, [id]);

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
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground font-mono">{job.job_number}</h1>
                {getStatusBadge(job.status)}
              </div>
              <p className="text-sm text-muted-foreground">{job.property_address}</p>
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
                    className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isCurrent
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
                      <p>
                        {format(new Date(job.scheduled_date), "MMMM d, yyyy")}
                        {job.scheduled_time && ` at ${job.scheduled_time}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer & Package</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.customers ? (
                    <div>
                      <Label className="text-muted-foreground">Customer</Label>
                      <p className="font-medium">{job.customers.name}</p>
                      <p className="text-sm text-muted-foreground">{job.customers.email}</p>
                      {job.customers.phone && (
                        <p className="text-sm text-muted-foreground">{job.customers.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No customer assigned</p>
                  )}

                  {job.drone_packages && (
                    <div>
                      <Label className="text-muted-foreground">Package</Label>
                      <p className="font-medium">{job.drone_packages.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${job.drone_packages.price} • {job.drone_packages.edit_budget_minutes} min edit budget
                      </p>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Uploaded Assets</CardTitle>
                  <CardDescription>{assets.length} files uploaded</CardDescription>
                </div>
                <div className="flex gap-2">
                  {job.upload_token && job.upload_token_expires_at && new Date(job.upload_token_expires_at) > new Date() ? (
                    <Button variant="outline" size="sm" onClick={copyUploadLink}>
                      {tokenCopied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {tokenCopied ? "Copied!" : "Copy Upload Link"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={generateUploadToken} disabled={generatingToken}>
                      <Key className="mr-2 h-4 w-4" />
                      {generatingToken ? "Generating..." : "Generate Upload Link"}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={extractExifData} 
                    disabled={extractingExif || assets.length === 0}
                  >
                    <ScanSearch className="mr-2 h-4 w-4" />
                    {extractingExif ? "Extracting..." : "Extract EXIF"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Camera className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No assets uploaded yet</p>
                    <p className="text-sm">Generate an upload link and share with the pilot</p>
                  </div>
                ) : (
                  <QAAssetGrid assets={assets} onRefresh={fetchJob} />
                )}
              </CardContent>
            </Card>
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
                        {(job.drone_packages.processing_profile as any)?.lightroom_preset || "Default preset"}
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
                      const profile = job.drone_packages?.processing_profile as any;
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
                                  (asset as any).processing_status === "processed" 
                                    ? "default" 
                                    : "secondary"
                                }
                              >
                                {(asset as any).processing_status || "raw"}
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
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle>Delivery</CardTitle>
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
