import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { emitActivityEvent } from "@/components/admin/ActivityFeed";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  FolderOpen,
  RefreshCw,
  Send,
  CheckCircle,
  User,
  MapPin,
  Calendar,
  Camera,
  Video,
  FileText,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/admin/PageShell";
import { LoadingState, EmptyState } from "@/components/admin/PageState";

interface DroneDeliverable {
  id: string;
  name: string;
  description: string | null;
  file_count: number | null;
  total_size_bytes: number | null;
  download_url: string | null;
}

interface DroneJob {
  id: string;
  job_number: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  site_address: string | null;
  scheduled_date: string | null;
  delivery_status: string | null;
  delivery_sent_at: string | null;
  delivery_email_to: string | null;
  delivery_notes: string | null;
  delivery_drive_url: string | null;
  download_url: string | null;
  clients?: { id: string; name: string; company: string | null; email: string | null } | null;
  processing_templates?: { path_code: string | null; display_name: string | null } | null;
  drone_packages?: { name: string } | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// drone_deliverables has no file_type column, so the icon is derived from the
// deliverable name. The names are written by sync_drone_deliverables()
// (migration 20260728094000): Processed Output Folder, Orthophoto, Point Cloud,
// 3D Model, Client Drive Folder.
function getDeliverableIcon(name: string | null) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("drive") || n.includes("folder")) return <FolderOpen className="h-4 w-4" />;
  if (n.includes("ortho") || n.includes("photo") || n.includes("image")) return <Camera className="h-4 w-4" />;
  if (n.includes("video")) return <Video className="h-4 w-4" />;
  if (n.includes("report") || n.includes("pdf")) return <FileText className="h-4 w-4" />;
  return <Package className="h-4 w-4" />;
}

export default function DeliveryReview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [job, setJob] = useState<DroneJob | null>(null);
  const [deliverables, setDeliverables] = useState<DroneDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<Set<string>>(new Set());
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    const [jobRes, delRes] = await Promise.all([
      supabase
        .from("drone_jobs")
        .select("*, clients(id, name, company, email), processing_templates(path_code, display_name), drone_packages(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("drone_deliverables")
        // NOTE: there is no `file_type` column on drone_deliverables. Selecting
        // it made PostgREST return 400 for every mission, and the old
        // `if (delRes.data)` swallowed the error — the list looked "empty"
        // rather than broken. Keep this select aligned with the real columns.
        .select("id, name, description, file_count, total_size_bytes, download_url")
        .eq("job_id", id)
        .order("created_at"),
    ]);

    if (jobRes.error) {
      toast({ title: "Error loading job", description: jobRes.error.message, variant: "destructive" });
    } else {
      setJob(jobRes.data as DroneJob);
      setDeliveryNotes(jobRes.data.delivery_notes || "");
    }

    if (delRes.error) {
      toast({
        title: "Error loading deliverables",
        description: delRes.error.message,
        variant: "destructive",
      });
    } else if (delRes.data) {
      setDeliverables(delRes.data);
      // Pre-select all deliverables
      setSelectedDeliverableIds(new Set(delRes.data.map((d) => d.id)));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const toggleDeliverable = (delivId: string) => {
    setSelectedDeliverableIds((prev) => {
      const next = new Set(prev);
      if (next.has(delivId)) {
        next.delete(delivId);
      } else {
        next.add(delivId);
      }
      return next;
    });
  };

  const driveUrl = job?.delivery_drive_url || job?.download_url;
  const clientEmail = job?.clients?.email;
  const clientName = job?.clients?.name;
  const siteLabel = job?.site_address || job?.property_address;
  const jobType = job?.processing_templates?.display_name || job?.drone_packages?.name || "—";

  const handleSendToClient = async () => {
    if (!job || !clientEmail) return;
    setSending(true);

    const { error } = await supabase.functions.invoke("drone-delivery-email", {
      body: {
        job_id: job.id,
        deliverable_ids: Array.from(selectedDeliverableIds),
        custom_message: deliveryNotes || undefined,
        download_url: driveUrl || undefined,
      },
    });

    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    await emitActivityEvent({
      event_type: "delivery_sent",
      entity_type: "delivery",
      entity_id: job.id,
      summary: `Delivery sent to ${clientName || clientEmail} for ${siteLabel}`,
      metadata: { job_number: job.job_number, client_email: clientEmail },
    });

    toast({ title: "Delivery sent", description: `Email sent to ${clientEmail}` });
    setSending(false);
    setSendDialogOpen(false);
    fetchData();
  };

  const handleMarkDelivered = async () => {
    if (!job) return;
    setMarkingDelivered(true);

    const { error } = await supabase
      .from("drone_jobs")
      .update({
        delivery_status: "sent",
        delivery_sent_at: new Date().toISOString(),
        delivery_notes: deliveryNotes || null,
        delivery_token: crypto.randomUUID().replace(/-/g, ""),
        delivery_token_created_at: new Date().toISOString(),
        status: "delivered",
      })
      .eq("id", job.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await emitActivityEvent({
        event_type: "delivery_confirmed",
        entity_type: "delivery",
        entity_id: job.id,
        summary: `Delivery confirmed for ${siteLabel}`,
        metadata: { job_number: job.job_number },
      });
      toast({ title: "Marked as delivered" });
      fetchData();
    }
    setMarkingDelivered(false);
  };

  const handleSendBalanceInvoice = async () => {
    if (!job) return;
    setSendingInvoice(true);

    const { data, error } = await supabase.functions.invoke("create-balance-invoice", {
      body: { job_id: job.id },
    });

    if (error || data?.error) {
      toast({
        title: "Balance invoice failed",
        description: error?.message || data?.error,
        variant: "destructive",
      });
    } else {
      await emitActivityEvent({
        event_type: "invoice_sent",
        entity_type: "invoice",
        entity_id: job.id,
        summary: `Balance invoice sent for ${siteLabel}`,
        metadata: { job_number: job.job_number, client_email: clientEmail },
      });
      toast({
        title: "Balance invoice sent",
        description: clientEmail ? `Invoice sent to ${clientEmail}` : "Invoice created",
      });
    }
    setSendingInvoice(false);
  };

  if (loading) {
    return (
      <PageShell title="Delivery Review" icon={Send} width="wide">
        <LoadingState variant="detail" rows={4} label="Loading delivery review" />
      </PageShell>
    );
  }

  if (!job) {
    return (
      <PageShell title="Delivery Review" icon={Send} width="wide">
        <EmptyState
          icon={Send}
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

  const isSent = job.delivery_status === "sent" || job.delivery_status === "delivery_confirmed";

  return (
    <PageShell
      title={
        <span className="flex flex-wrap items-center gap-3">
          <span className="font-mono">{job.job_number}</span>
          <Badge
            className={
              isSent
                ? "bg-green-500 text-white"
                : job.delivery_status === "ready"
                  ? "bg-blue-500 text-white"
                  : "bg-slate-500 text-white"
            }
          >
            {isSent
              ? "Sent"
              : job.delivery_status === "ready"
                ? "Ready to Send"
                : "Not Ready"}
          </Badge>
        </span>
      }
      description="Delivery review"
      breadcrumbs={[
        { label: "Missions", href: "/admin/missions" },
        { label: job.job_number, href: `/admin/missions/${job.id}` },
        { label: "Delivery" },
      ]}
      width="wide"
      actions={
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column — mission summary + deliverables */}
          <div className="space-y-6 lg:col-span-2">
            {/* Mission Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Mission Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Site</p>
                    <p className="font-medium">{siteLabel}</p>
                    {job.property_city && (
                      <p className="text-sm text-muted-foreground">
                        {[job.property_city, job.property_state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{clientName || "—"}</p>
                    {clientEmail && (
                      <p className="text-sm text-muted-foreground">{clientEmail}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Package className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Job Type</p>
                    <p className="font-medium">{jobType}</p>
                    {job.processing_templates?.path_code && (
                      <Badge variant="outline" className="text-xs font-mono mt-1">
                        {job.processing_templates.path_code}
                      </Badge>
                    )}
                  </div>
                </div>

                {job.scheduled_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fly Date</p>
                      <p className="font-medium">
                        {format(new Date(job.scheduled_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drive Folder */}
            {driveUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Drive Folder
                  </CardTitle>
                  <CardDescription>Deliverables uploaded by the pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Open Google Drive Folder
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Deliverables List */}
            <Card>
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
                <CardDescription>
                  {deliverables.length === 0
                    ? "No deliverables found — pipeline may still be uploading"
                    : `${deliverables.length} item${deliverables.length !== 1 ? "s" : ""} — select which to include in the delivery email`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deliverables.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Package className="mx-auto h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">No deliverables yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliverables.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          id={d.id}
                          checked={selectedDeliverableIds.has(d.id)}
                          onCheckedChange={() => toggleDeliverable(d.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getDeliverableIcon(d.name)}
                            <Label
                              htmlFor={d.id}
                              className="font-medium cursor-pointer truncate"
                            >
                              {d.name}
                            </Label>
                          </div>
                          {d.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{d.description}</p>
                          )}
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {d.file_count && <span>{d.file_count} files</span>}
                            {d.total_size_bytes && <span>{formatBytes(d.total_size_bytes)}</span>}
                          </div>
                        </div>
                        {d.download_url && (
                          <a
                            href={d.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — delivery actions */}
          <div className="space-y-6">
            {/* Delivery Status */}
            {isSent && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    Delivery Sent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {job.delivery_sent_at && (
                    <p className="text-muted-foreground">
                      Sent {format(new Date(job.delivery_sent_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                  {job.delivery_email_to && (
                    <p className="text-muted-foreground">To: {job.delivery_email_to}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Delivery Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Notes</CardTitle>
                <CardDescription>Optional message included in the client email</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Add a personal note for your client..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setSendDialogOpen(true)}
                disabled={!clientEmail || (!driveUrl && deliverables.length === 0)}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSent ? "Resend to Client" : "Send to Client"}
              </Button>

              {!clientEmail && (
                <p className="text-xs text-muted-foreground text-center">
                  No client email on file — assign a client with an email to send
                </p>
              )}

              {!isSent && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleMarkDelivered}
                  disabled={markingDelivered}
                >
                  {markingDelivered ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Mark Delivered (no email)
                </Button>
              )}

              <div className="border-t border-border pt-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSendBalanceInvoice}
                  disabled={sendingInvoice || !clientEmail}
                >
                  {sendingInvoice ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Send Balance Invoice
                </Button>
                {!clientEmail && (
                  <p className="mt-2 text-xs text-muted-foreground text-center">
                    Assign a client with an email to invoice
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Send Confirmation Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Delivery Email</DialogTitle>
            <DialogDescription>
              This will send a Sentinel-branded email with the Drive folder link to your client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{clientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium truncate max-w-[220px]">
                  Your Deliverables — {siteLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deliverables:</span>
                <span className="font-medium">{selectedDeliverableIds.size} selected</span>
              </div>
              {driveUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Drive link:</span>
                  <span className="text-green-600 font-medium">Included</span>
                </div>
              )}
            </div>

            {deliveryNotes && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground text-xs mb-1">Note to client:</p>
                <p className="text-sm">{deliveryNotes}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSendToClient} disabled={sending}>
              {sending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
