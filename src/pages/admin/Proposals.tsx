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
  Archive,
  ArchiveRestore,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Printer,
  TrendingDown,
  Link2,
  Camera,
  Receipt,
} from "lucide-react";
import AdminNav from "./components/AdminNav";
import { useNavigate } from "react-router-dom";
import { ProposalPDFView } from "@/components/proposal/ProposalPDFView";
import { getMarketRateFromDiscounted } from "@/data/market-rates";
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
  archived_at: string | null;
  service_request_id: string;
  service_requests: {
    client_name: string;
    client_email: string;
    company_name: string | null;
    metadata?: Record<string, unknown>;
    services: { name: string } | null;
  } | null;
  invoices: { status: string }[] | null;
}

interface LinkedRecords {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    total: number;
    view_token: string;
  } | null;
  droneJob: {
    id: string;
    job_number: string;
    status: string;
    scheduled_date: string | null;
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
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals", showArchived],
    queryFn: async () => {
      const q = supabase.from("proposals").select("*, service_requests(client_name, client_email, company_name, metadata, services(name)), invoices(status)").order("created_at", { ascending: false });
      if (showArchived) { q.not("archived_at", "is", null); } else { q.is("archived_at", null); }
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Proposal[];
    },
  });

  // Fetch linked invoice and drone job when a proposal is selected
  const { data: linkedRecords } = useQuery({
    queryKey: ["proposal-links", selectedProposal?.id, selectedProposal?.service_request_id],
    queryFn: async (): Promise<LinkedRecords> => {
      if (!selectedProposal) return { invoice: null, droneJob: null };

      // Fetch linked invoice
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, view_token")
        .eq("proposal_id", selectedProposal.id)
        .maybeSingle();

      // Fetch linked drone job (via service_request_id)
      const { data: droneJob } = await supabase
        .from("drone_jobs")
        .select("id, job_number, status, scheduled_date")
        .eq("service_request_id", selectedProposal.service_request_id)
        .maybeSingle();

      return { 
        invoice: invoice as LinkedRecords["invoice"], 
        droneJob: droneJob as LinkedRecords["droneJob"] 
      };
    },
    enabled: !!selectedProposal,
  });

  // Calculate market rate and discount info for a proposal
  const getDiscountInfo = (proposal: Proposal) => {
    const metadata = proposal.service_requests?.metadata || {};
    const orgType = ((metadata as Record<string, unknown>).organizationType as string || '').toLowerCase();
    const isNonprofit = orgType.includes('nonprofit') || 
                        orgType.includes('church') || 
                        orgType.includes('ministry') ||
                        orgType.includes('501c');
    
    const discountPercent = isNonprofit ? 20 : 10;
    const marketRate = getMarketRateFromDiscounted(proposal.subtotal, isNonprofit);
    
    return { isNonprofit, discountPercent, marketRate };
  };

  // Print proposal as PDF
  const handlePrintProposal = (proposal: Proposal) => {
    const discountInfo = getDiscountInfo(proposal);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Popup blocked", description: "Please allow popups to print", variant: "destructive" });
      return;
    }

    const deliverables = (proposal.deliverables || []).map(d => ({
      name: d.description || '',
      description: ''
    }));

    const pricingItems = (proposal.pricing_items || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate
    }));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Proposal - ${proposal.proposal_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #e5e5e5; }
            .logo { font-size: 24px; font-weight: bold; color: #7c3aed; }
            .proposal-number { font-size: 14px; color: #666; }
            .client-section { background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .client-section h3 { font-size: 12px; color: #666; margin-bottom: 4px; }
            .client-section p { font-size: 16px; font-weight: 500; }
            h1 { font-size: 24px; margin-bottom: 16px; }
            h2 { font-size: 16px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; margin: 24px 0 12px; }
            .scope { white-space: pre-wrap; line-height: 1.6; color: #555; }
            .deliverables { list-style: disc; margin-left: 20px; }
            .deliverables li { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e5e5; }
            th { background: #f5f5f5; font-size: 12px; text-transform: uppercase; }
            .text-right { text-align: right; }
            .totals { margin-top: 16px; text-align: right; }
            .totals p { margin-bottom: 4px; }
            .totals .total { font-size: 20px; font-weight: bold; color: #7c3aed; }
            .market-badge { background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 8px; display: inline-block; margin-bottom: 16px; font-size: 14px; }
            .terms { font-size: 12px; color: #666; white-space: pre-wrap; line-height: 1.5; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #888; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Sentinel Aerial Inspections</div>
              <p style="font-size: 12px; color: #666;">Professional Services Proposal</p>
            </div>
            <div style="text-align: right;">
              <div class="proposal-number">${proposal.proposal_number}</div>
              <p style="font-size: 12px; color: #666;">${format(new Date(proposal.created_at), "MMMM d, yyyy")}</p>
            </div>
          </div>

          <div class="client-section">
            <h3>Prepared For</h3>
            <p>${proposal.service_requests?.client_name || 'Client'}</p>
            ${proposal.service_requests?.company_name ? `<p style="font-size: 14px; color: #666;">${proposal.service_requests.company_name}</p>` : ''}
          </div>

          <div class="market-badge">
            ${discountInfo.discountPercent}% Below Market Rate${discountInfo.isNonprofit ? ' (Nonprofit)' : ''}
          </div>

          <h1>${proposal.title}</h1>

          <h2>Scope of Work</h2>
          <p class="scope">${proposal.scope_of_work}</p>

          <h2>Deliverables</h2>
          <ul class="deliverables">
            ${deliverables.map(d => `<li>${d.name}</li>`).join('')}
          </ul>

          <h2>Investment</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th>Unit</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${pricingItems.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td class="text-right">$${item.rate.toLocaleString()}</td>
                  <td class="text-right">$${(item.quantity * item.rate).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <p style="color: #888; text-decoration: line-through;">Market Rate: $${discountInfo.marketRate.toLocaleString()}</p>
            <p>Subtotal: $${proposal.subtotal.toLocaleString()}</p>
            ${proposal.discount > 0 ? `<p style="color: #16a34a;">Additional Discount: -$${proposal.discount.toLocaleString()}</p>` : ''}
            <p class="total">Total: $${proposal.total.toLocaleString()}</p>
          </div>

          <p style="margin-top: 16px; font-size: 12px; color: #666;">Valid until ${format(new Date(proposal.valid_until), "MMMM d, yyyy")}</p>

          ${proposal.terms_and_conditions ? `
            <h2>Terms & Conditions</h2>
            <p class="terms">${proposal.terms_and_conditions}</p>
          ` : ''}

          <div class="footer">
            <p>Sentinel Aerial Inspections | sentinelaerialinspections.com</p>
            <p>Thank you for considering us for your project.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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

  const archiveMutation = useMutation({
    mutationFn: async ({ id, restore }: { id: string; restore: boolean }) => {
      const { error } = await supabase.from("proposals").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: showArchived ? "Proposal restored" : "Proposal archived" });
      setDeleteProposal(null);
    },
    onError: (error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
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
          <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)} className="gap-2">
            <Archive className="h-4 w-4" />
            {showArchived ? "Viewing Archived" : "Show Archived"}
          </Button>
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
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading proposals...
                    </TableCell>
                  </TableRow>
                ) : filteredProposals?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                      <TableCell>
                        {(() => {
                          const { isNonprofit, discountPercent } = getDiscountInfo(proposal);
                          return (
                            <Badge 
                              variant="outline" 
                              className={isNonprofit 
                                ? "bg-green-500/10 text-green-400 border-green-500/30" 
                                : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              }
                            >
                              {discountPercent}% off{isNonprofit && " (Nonprofit)"}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(proposal.total ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{format(new Date(proposal.valid_until), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(proposal.status)}>
                          {statusConfig[proposal.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const invoiceStatus = proposal.invoices?.[0]?.status;
                          if (!invoiceStatus) return <span className="text-muted-foreground text-xs">—</span>;
                          const statusClasses: Record<string, string> = {
                            draft: "bg-muted text-muted-foreground",
                            sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                            paid: "bg-green-500/20 text-green-400 border-green-500/30",
                            overdue: "bg-red-500/20 text-red-400 border-red-500/30",
                            cancelled: "bg-orange-500/20 text-orange-400 border-orange-500/30",
                          };
                          return (
                            <Badge variant="outline" className={statusClasses[invoiceStatus] || ""}>
                              {invoiceStatus.charAt(0).toUpperCase() + invoiceStatus.slice(1)}
                            </Badge>
                          );
                        })()}
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
                            title={showArchived ? "Restore" : "Archive"}
                          >
                            {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
                {(() => {
                  const discountInfo = getDiscountInfo(selectedProposal);
                  return (
                    <div className="mt-4 space-y-2">
                      {/* Market Rate Comparison */}
                      <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDown className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-500">
                            {discountInfo.discountPercent}% Below Market Rate
                            {discountInfo.isNonprofit && ' (Nonprofit)'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Market Rate:</span>
                          <span className="line-through text-muted-foreground">
                            ${discountInfo.marketRate.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <p className="text-sm">Subtotal: ${(selectedProposal.subtotal ?? 0).toLocaleString()}</p>
                        {(selectedProposal.discount ?? 0) > 0 && (
                          <p className="text-sm text-green-500">Additional Discount: -${(selectedProposal.discount ?? 0).toLocaleString()}</p>
                        )}
                        <p className="text-lg font-bold">Total: ${(selectedProposal.total ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}
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

              {/* Linked Records Section */}
              {selectedProposal.status === 'approved' && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Linked Records
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Invoice Card */}
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Invoice</p>
                            {linkedRecords?.invoice ? (
                              <>
                                <p className="font-mono font-medium">
                                  {linkedRecords.invoice.invoice_number}
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {linkedRecords.invoice.status}
                                </Badge>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Not yet created
                              </p>
                            )}
                          </div>
                          {linkedRecords?.invoice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate("/admin/invoices")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Drone Job Card (only for AERIAL services) */}
                    {selectedProposal.service_requests?.services?.name === 'Aerial Photography' && (
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Drone Job</p>
                              {linkedRecords?.droneJob ? (
                                <>
                                  <p className="font-mono font-medium">
                                    {linkedRecords.droneJob.job_number}
                                  </p>
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {linkedRecords.droneJob.status}
                                  </Badge>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Not yet created
                                </p>
                              )}
                            </div>
                            {linkedRecords?.droneJob && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/drone-jobs/${linkedRecords.droneJob!.id}`)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handlePrintProposal(selectedProposal)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print / PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/proposal/${selectedProposal.approval_token}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Customer Page
                </Button>
                {linkedRecords?.invoice && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/invoice/${linkedRecords.invoice!.view_token}`, "_blank")}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    View Invoice
                  </Button>
                )}
                {linkedRecords?.droneJob && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/admin/drone-jobs/${linkedRecords.droneJob!.id}`)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    View Drone Job
                  </Button>
                )}
                <Button onClick={() => resendMutation.mutate(selectedProposal)} disabled={resendMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Resend Proposal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive/Restore Confirmation */}
      <AlertDialog open={!!deleteProposal} onOpenChange={() => setDeleteProposal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{showArchived ? "Restore" : "Archive"} Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              {showArchived
                ? `This will restore proposal ${deleteProposal?.proposal_number} back to your active proposals.`
                : `This will archive proposal ${deleteProposal?.proposal_number}. You can restore it later from the archived view.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProposal && archiveMutation.mutate({ id: deleteProposal.id, restore: showArchived })}
            >
              {showArchived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
