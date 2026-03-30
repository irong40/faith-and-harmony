import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  FolderKanban,
  Rocket,
  Wrench,
  Eye,
  RefreshCw,
  CheckCircle,
  Pause,
  XCircle,
  Mail,
  MailX,
  Archive,
  ArchiveRestore
} from "lucide-react";

type ProjectStatus = 'kickoff' | 'in_progress' | 'review' | 'revision' | 'complete' | 'on_hold' | 'cancelled';

interface Project {
  id: string;
  project_number: string;
  title: string;
  status: ProjectStatus;
  description: string | null;
  admin_notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  archived_at: string | null;
  customer: { name: string; email: string; company_name: string | null } | null;
  service: { name: string; code: string } | null;
  proposal: { proposal_number: string; total: number } | null;
}

const statusConfig: Record<ProjectStatus, { label: string; icon: LucideIcon; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  kickoff: { label: "Kickoff", icon: Rocket, variant: "default" },
  in_progress: { label: "In Progress", icon: Wrench, variant: "secondary" },
  review: { label: "Review", icon: Eye, variant: "outline" },
  revision: { label: "Revision", icon: RefreshCw, variant: "secondary" },
  complete: { label: "Complete", icon: CheckCircle, variant: "default" },
  on_hold: { label: "On Hold", icon: Pause, variant: "outline" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" },
};

const allStatuses: ProjectStatus[] = ['kickoff', 'in_progress', 'review', 'revision', 'complete', 'on_hold', 'cancelled'];

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newStatus, setNewStatus] = useState<ProjectStatus | "">("");
  const [sendEmail, setSendEmail] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects", showArchived],
    queryFn: async () => {
      const q = supabase.from("projects").select(`*, customer:customers(name, email, company_name), service:services(name, code), proposal:proposals(proposal_number, total)`).order("created_at", { ascending: false });
      if (showArchived) { q.not("archived_at", "is", null); } else { q.is("archived_at", null); }
      const { data, error } = await q;
      if (error) throw error;
      return data as Project[];
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status, sendEmail, customMessage }: { 
      projectId: string; 
      status: ProjectStatus; 
      sendEmail: boolean;
      customMessage?: string;
    }) => {
      if (sendEmail) {
        // Call edge function to send email and update status
        const { error } = await supabase.functions.invoke("send-project-status-email", {
          body: { projectId, newStatus: status, customMessage },
        });
        if (error) throw error;
      } else {
        // Just update status without email
        const updateData: Record<string, unknown> = { status };
        if (status === 'complete') {
          updateData.completed_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from("projects")
          .update(updateData)
          .eq("id", projectId);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({
        title: variables.sendEmail ? "Status updated & email sent" : "Status updated",
        description: `Project moved to ${statusConfig[variables.status].label}`,
      });
      setShowStatusConfirm(false);
      setSelectedProject(null);
      setNewStatus("");
      setCustomMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, restore }: { id: string; restore: boolean }) => {
      const { error } = await supabase.from("projects").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: variables.restore ? "Project restored" : "Project archived" });
    },
    onError: (error) => { toast({ title: "Failed", description: error.message, variant: "destructive" }); },
  });

  // Filter projects
  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = 
      project.project_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.service?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Status counts
  const statusCounts = projects?.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const handleStatusChange = (status: ProjectStatus) => {
    setNewStatus(status);
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = () => {
    if (selectedProject && newStatus) {
      updateStatusMutation.mutate({
        projectId: selectedProject.id,
        status: newStatus,
        sendEmail,
        customMessage: customMessage || undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projects</h1>
              <p className="text-muted-foreground">Track service project progress</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)} className="gap-2">
              <Archive className="h-4 w-4" />
              {showArchived ? "Viewing Archived" : "Show Archived"}
            </Button>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {allStatuses.map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                className={`p-3 rounded-lg border transition-all ${
                  statusFilter === status 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">{statusCounts[status] || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : filteredProjects?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects?.map((project) => {
                  const config = statusConfig[project.status];
                  const Icon = config.icon;
                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.title}</p>
                          <p className="text-sm text-muted-foreground">{project.project_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.customer?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.customer?.company_name || project.customer?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.service?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {project.started_at 
                          ? format(new Date(project.started_at), "MMM d, yyyy")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                        >
                          View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate({ id: project.id, restore: showArchived })} title={showArchived ? "Restore" : "Archive"}>
                          {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              {selectedProject?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project Number</p>
                  <p className="font-medium">{selectedProject.project_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium">{selectedProject.service?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedProject.customer?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProject.customer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge variant={statusConfig[selectedProject.status].variant} className="gap-1 mt-1">
                    {(() => { const Icon = statusConfig[selectedProject.status].icon; return <Icon className="h-3 w-3" />; })()}
                    {statusConfig[selectedProject.status].label}
                  </Badge>
                </div>
              </div>

              {selectedProject.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedProject.description}</p>
                </div>
              )}

              {/* Status Change */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Change Status</p>
                <div className="flex flex-wrap gap-2">
                  {allStatuses.map((status) => {
                    const config = statusConfig[status];
                    const Icon = config.icon;
                    const isCurrent = status === selectedProject.status;
                    return (
                      <Button
                        key={status}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        disabled={isCurrent}
                        onClick={() => handleStatusChange(status)}
                        className="gap-1"
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Project Status</AlertDialogTitle>
            <AlertDialogDescription>
              Change status to <strong>{newStatus && statusConfig[newStatus]?.label}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Email toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {sendEmail ? (
                  <Mail className="h-4 w-4 text-primary" />
                ) : (
                  <MailX className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">Send status update email to customer</span>
              </div>
              <Button
                variant={sendEmail ? "default" : "outline"}
                size="sm"
                onClick={() => setSendEmail(!sendEmail)}
              >
                {sendEmail ? "Email On" : "Email Off"}
              </Button>
            </div>

            {/* Custom message */}
            {sendEmail && (
              <div>
                <label className="text-sm font-medium">Custom Message (optional)</label>
                <Textarea
                  placeholder="Add a personalized message to include in the email..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setNewStatus("");
              setCustomMessage("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
