import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Search,
  Eye,
  Send,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import AdminNav from "./components/AdminNav";
import type { Database } from "@/integrations/supabase/types";

type ProposalStatus = Database["public"]["Enums"]["proposal_status"];

interface Deliverable {
  description: string;
}

interface PricingItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

interface Proposal {
  id: string;
  proposal_number: string;
  title: string;
  scope_of_work: string;
  deliverables: Deliverable[];
  pricing_items: PricingItem[];
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string;
  terms_and_conditions: string | null;
  status: ProposalStatus;
  approval_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  declined_at: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  service_requests: {
    client_name: string;
    client_email: string;
    company_name: string | null;
    services: { name: string } | null;
  } | null;
}

const statusConfig: Record<ProposalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  sent: { label: "Sent", variant: "default", icon: <Send className="h-3 w-3" /> },
  viewed: { label: "Viewed", variant: "outline", icon: <Eye className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: "Declined", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  revision_requested: { label: "Revision Requested", variant: "outline", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function Proposals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [deleteProposal, setDeleteProposal] = useState<Proposal | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, service_requests(client_name, client_email, company_name, services(name))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Proposal[];
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (proposal: Proposal) => {
      if (!proposal.service_requests) throw new Error("No service request found");

      const { error: fnError } = await supabase.functions.invoke("send-proposal-email", {
        body: {
          proposal: {
            id: proposal.id,
            proposal_number: proposal.proposal_number,
            title: proposal.title,
            scope_of_work: proposal.scope_of_work,
            total: proposal.total,
            valid_until: proposal.valid_until,
            approval_token: proposal.approval_token,
          },
          client: {
            name: proposal.service_requests.client_name,
            email: proposal.service_requests.client_email,
            company: proposal.service_requests.company_name,
          },
          deliverables: proposal.deliverables,
        },
      });

      if (fnError) throw fnError;

      const { error } = await supabase
        .from("proposals")
        .update({ sent_at: new Date().toISOString(), status: "sent" })
        .eq("id", proposal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Proposal resent successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to resend proposal", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Proposal deleted" });
      setDeleteProposal(null);
    },
    onError: (error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const filteredProposals = proposals?.filter((proposal) => {
    const matchesSearch =
      proposal.proposal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.service_requests?.client_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = proposals?.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  const getStatusBadgeClass = (status: ProposalStatus) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "declined": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "sent": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "viewed": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "expired": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "revision_requested": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Proposals</h1>
          <p className="text-muted-foreground">Manage and track customer proposals</p>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {Object.entries(statusConfig).map(([status, config]) => (
            <Card
              key={status}
              className={`cursor-pointer transition-all ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search proposals..."
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
              {Object.entries(statusConfig).map(([status, config]) => (
                <SelectItem key={status} value={status}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Proposals Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading proposals...
                    </TableCell>
                  </TableRow>
                ) : filteredProposals?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No proposals found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProposals?.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-mono text-sm">{proposal.proposal_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{proposal.service_requests?.client_name}</p>
                          {proposal.service_requests?.company_name && (
                            <p className="text-sm text-muted-foreground">{proposal.service_requests.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{proposal.title}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${(proposal.total ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{format(new Date(proposal.valid_until), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(proposal.status)}>
                          {statusConfig[proposal.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(proposal.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedProposal(proposal)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => resendMutation.mutate(proposal)}
                            disabled={resendMutation.isPending}
                            title="Resend Proposal"
                          >
                            <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteProposal(proposal)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Proposal {selectedProposal?.proposal_number}
              <Badge className={selectedProposal ? getStatusBadgeClass(selectedProposal.status) : ""}>
                {selectedProposal && statusConfig[selectedProposal.status].label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedProposal.service_requests?.client_name}</p>
                  {selectedProposal.service_requests?.company_name && (
                    <p className="text-sm">{selectedProposal.service_requests.company_name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium">{selectedProposal.service_requests?.services?.name || "N/A"}</p>
                </div>
              </div>

              {/* Title & Scope */}
              <div>
                <h3 className="font-semibold mb-2">{selectedProposal.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProposal.scope_of_work}</p>
              </div>

              {/* Deliverables */}
              <div>
                <h4 className="font-medium mb-2">Deliverables</h4>
                <ul className="list-disc list-inside space-y-1">
                  {selectedProposal.deliverables?.map((d, i) => (
                    <li key={i} className="text-sm">{d.description}</li>
                  ))}
                </ul>
              </div>

              {/* Pricing */}
              <div>
                <h4 className="font-medium mb-2">Pricing</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProposal.pricing_items?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">${(item.rate ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(item.total ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 space-y-1 text-right">
                  <p className="text-sm">Subtotal: ${(selectedProposal.subtotal ?? 0).toLocaleString()}</p>
                  {(selectedProposal.discount ?? 0) > 0 && (
                    <p className="text-sm text-green-500">Discount: -${(selectedProposal.discount ?? 0).toLocaleString()}</p>
                  )}
                  <p className="text-lg font-bold">Total: ${(selectedProposal.total ?? 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Terms */}
              {selectedProposal.terms_and_conditions && (
                <div>
                  <h4 className="font-medium mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedProposal.terms_and_conditions}
                  </p>
                </div>
              )}

              {/* Customer Notes */}
              {selectedProposal.customer_notes && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Customer Notes</h4>
                  <p className="text-sm">{selectedProposal.customer_notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Valid Until</p>
                  <p>{format(new Date(selectedProposal.valid_until), "MMM d, yyyy")}</p>
                </div>
                {selectedProposal.sent_at && (
                  <div>
                    <p className="text-muted-foreground">Sent</p>
                    <p>{format(new Date(selectedProposal.sent_at), "MMM d, yyyy")}</p>
                  </div>
                )}
                {selectedProposal.viewed_at && (
                  <div>
                    <p className="text-muted-foreground">Viewed</p>
                    <p>{format(new Date(selectedProposal.viewed_at), "MMM d, yyyy")}</p>
                  </div>
                )}
                {selectedProposal.approved_at && (
                  <div>
                    <p className="text-muted-foreground">Approved</p>
                    <p>{format(new Date(selectedProposal.approved_at), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.open(`/proposal/${selectedProposal.approval_token}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Customer Page
                </Button>
                <Button onClick={() => resendMutation.mutate(selectedProposal)} disabled={resendMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Resend Proposal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProposal} onOpenChange={() => setDeleteProposal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete proposal {deleteProposal?.proposal_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProposal && deleteMutation.mutate(deleteProposal.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
