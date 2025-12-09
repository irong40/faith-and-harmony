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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, Eye, Edit, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Tables, Enums } from "@/integrations/supabase/types";
import AdminNav from "./components/AdminNav";
import ServiceRequestForm from "./components/ServiceRequestForm";

type ServiceRequest = Tables<"service_requests"> & {
  services?: { name: string; code: string } | null;
};

const STATUS_OPTIONS: { value: Enums<"request_status">; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "scoping", label: "Scoping", color: "bg-purple-500" },
  { value: "quoted", label: "Quoted", color: "bg-orange-500" },
  { value: "closed", label: "Closed", color: "bg-green-500" },
  { value: "declined", label: "Declined", color: "bg-red-500" },
];

export default function ServiceRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select("*, services(name, code)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      searchTerm === "" ||
      req.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.project_title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openDetail = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const openEdit = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsEditOpen(true);
  };

  const handleFormSuccess = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setSelectedRequest(null);
    fetchRequests();
  };

  const openDelete = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    setDeleteLoading(true);

    const { error } = await supabase
      .from("service_requests")
      .delete()
      .eq("id", selectedRequest.id);

    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Service request deleted" });
      fetchRequests();
    }

    setDeleteLoading(false);
    setIsDeleteOpen(false);
    setSelectedRequest(null);
  };

  const getStatusBadge = (status: string | null) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${statusOption?.color || "bg-muted"} text-white`}>
        {statusOption?.label || status || "Unknown"}
      </Badge>
    );
  };

  const formatMetadata = (metadata: unknown) => {
    if (!metadata || typeof metadata !== "object") return null;
    const entries = Object.entries(metadata as Record<string, unknown>);
    if (entries.length === 0) return null;
    return (
      <div className="space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <div key={key}>
            <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
            <span className="text-muted-foreground">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Requests</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all service requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Request
          </Button>
          <Button onClick={fetchRequests} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        </div>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_OPTIONS.map((status) => {
            const count = requests.filter((r) => r.status === status.value).length;
            return (
              <div
                key={status.value}
                className="rounded-lg border border-border bg-card p-4 text-center"
              >
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-sm text-muted-foreground">{status.label}</div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No service requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="whitespace-nowrap">
                      {request.created_at
                        ? format(new Date(request.created_at), "MMM d, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{request.client_name}</div>
                      <div className="text-sm text-muted-foreground">{request.client_email}</div>
                    </TableCell>
                    <TableCell>
                      {request.services?.name || "—"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {request.project_title || "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetail(request)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(request)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(request)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Client Name</Label>
                  <p className="font-medium">{selectedRequest.client_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.client_email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedRequest.client_phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contact Method</Label>
                  <p className="font-medium capitalize">
                    {selectedRequest.preferred_contact_method || "Email"}
                  </p>
                </div>
                {selectedRequest.company_name && (
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">{selectedRequest.company_name}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Service</Label>
                  <p className="font-medium">{selectedRequest.services?.name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Budget</Label>
                  <p className="font-medium">{selectedRequest.budget_range || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              {selectedRequest.project_title && (
                <div>
                  <Label className="text-muted-foreground">Project Title</Label>
                  <p className="font-medium">{selectedRequest.project_title}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Project Description</Label>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                  {selectedRequest.project_description}
                </p>
              </div>

              {formatMetadata(selectedRequest.metadata) && (
                <div>
                  <Label className="text-muted-foreground">Additional Details</Label>
                  <div className="mt-1 rounded-md bg-muted p-3">
                    {formatMetadata(selectedRequest.metadata)}
                  </div>
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Submitted: {selectedRequest.created_at
                  ? format(new Date(selectedRequest.created_at), "MMMM d, yyyy 'at' h:mm a")
                  : "N/A"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Service Request</DialogTitle>
          </DialogHeader>
          <ServiceRequestForm
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Service Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <ServiceRequestForm
              initialData={selectedRequest}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the service request from{" "}
              <strong>{selectedRequest?.client_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
