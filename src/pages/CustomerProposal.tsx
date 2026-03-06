import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Check,
  X,
  MessageSquare,
  Loader2,
  Calendar,
  FileText,
} from "lucide-react";
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
import type { Json } from "@/integrations/supabase/types";

interface Deliverable {
  name: string;
  description: string;
}

interface PricingItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
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
  status: string;
  viewed_at: string | null;
  approved_at: string | null;
  declined_at: string | null;
  customer_notes: string | null;
  created_at: string;
  approval_token: string;
  client_name?: string;
  client_email?: string;
}

export default function CustomerProposal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");

  useEffect(() => {
    fetchProposal();
  }, [token]);

  const fetchProposal = async () => {
    if (!token) return;

    const { data, error } = await supabase
      .from("proposals")
      .select(`
        *,
        service_requests!inner(client_name, client_email)
      `)
      .eq("approval_token", token)
      .maybeSingle();

    if (error) {
      console.error("Fetch error:", error);
      toast({
        title: "Proposal not found",
        description: "This proposal link may be invalid or expired.",
        variant: "destructive",
      });
    } else if (data) {
      const deliverables = Array.isArray(data.deliverables)
        ? (data.deliverables as unknown as Deliverable[])
        : [];
      const pricingItems = Array.isArray(data.pricing_items)
        ? (data.pricing_items as unknown as PricingItem[])
        : [];

      const serviceRequest = data.service_requests as { client_name: string; client_email: string };

      setProposal({
        ...data,
        deliverables,
        pricing_items: pricingItems,
        client_name: serviceRequest?.client_name,
        client_email: serviceRequest?.client_email,
      });

      // Mark as viewed if not already
      if (!data.viewed_at && data.status === "sent") {
        await supabase
          .from("proposals")
          .update({ viewed_at: new Date().toISOString(), status: "viewed" })
          .eq("id", data.id);
      }
    }

    setLoading(false);
  };

  const sendResponseEmail = async (
    action: 'approved' | 'declined' | 'revision_requested',
    customerNotes?: string
  ) => {
    if (!proposal || !proposal.client_name || !proposal.client_email) {
      console.error("Missing client info for email");
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-proposal-response-email', {
        body: {
          action,
          proposal: {
            proposal_number: proposal.proposal_number,
            title: proposal.title,
            total: proposal.total,
            approval_token: proposal.approval_token,
          },
          client: {
            name: proposal.client_name,
            email: proposal.client_email,
          },
          customerNotes,
        },
      });

      if (error) {
        console.error("Failed to send response email:", error);
      }
    } catch (err) {
      console.error("Error sending response email:", err);
    }
  };

  const handleApprove = async () => {
    if (!proposal) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("proposals")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", proposal.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve proposal",
        variant: "destructive",
      });
    } else {
      setProposal({ ...proposal, status: "approved", approved_at: new Date().toISOString() });
      toast({
        title: "Proposal Approved!",
        description: "Thank you! We'll be in touch soon to get started.",
      });
      
      // Send notification emails
      await sendResponseEmail('approved');
      
      // Auto-send the invoice created by database trigger
      // Poll for invoice creation with retry logic
      const sendInvoiceEmail = async (retries = 5, delay = 300) => {
        for (let i = 0; i < retries; i++) {
          const { data: invoice, error } = await supabase
            .from("invoices")
            .select("id")
            .eq("proposal_id", proposal.id)
            .single();
          
          if (invoice) {
            const { error: sendError } = await supabase.functions.invoke("send-service-invoice-email", {
              body: { invoiceId: invoice.id },
            });
            if (sendError) {
              console.error("Failed to send invoice email:", sendError);
            }
            return;
          }
          
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        console.warn("Invoice not found after polling - email not sent");
      };
      
      // Fire and forget - don't block the UI
      sendInvoiceEmail().catch(err => console.error("Invoice email error:", err));
    }

    setActionLoading(false);
  };

  const handleDecline = async () => {
    if (!proposal) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("proposals")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        customer_notes: declineReason || null,
      })
      .eq("id", proposal.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to decline proposal",
        variant: "destructive",
      });
    } else {
      setProposal({ ...proposal, status: "declined", declined_at: new Date().toISOString() });
      toast({
        title: "Proposal Declined",
        description: "Thank you for your feedback.",
      });
      
      // Send notification emails
      await sendResponseEmail('declined', declineReason || undefined);
    }

    setShowDeclineDialog(false);
    setActionLoading(false);
  };

  const handleRequestRevision = async () => {
    if (!proposal || !revisionNotes.trim()) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("proposals")
      .update({
        status: "revision_requested",
        customer_notes: revisionNotes,
      })
      .eq("id", proposal.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit revision request",
        variant: "destructive",
      });
    } else {
      setProposal({ ...proposal, status: "revision_requested", customer_notes: revisionNotes });
      toast({
        title: "Revision Requested",
        description: "We'll review your feedback and send an updated proposal.",
      });
      
      // Send notification emails
      await sendResponseEmail('revision_requested', revisionNotes);
    }

    setShowRevisionDialog(false);
    setActionLoading(false);
  };

  const isExpired = proposal && new Date(proposal.valid_until) < new Date();
  const canTakeAction =
    proposal &&
    !isExpired &&
    !["approved", "declined", "expired"].includes(proposal.status);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Proposal Not Found</h2>
            <p className="text-muted-foreground">
              This proposal link may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#2b0a3d] text-white py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#dfae62]">
            Sentinel Aerial Inspections
          </h1>
          <p className="text-white/80 text-sm mt-1">Aerial Inspection Services</p>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Status Banner */}
        {proposal.status === "approved" && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span>This proposal was approved on {new Date(proposal.approved_at!).toLocaleDateString()}</span>
          </div>
        )}
        {proposal.status === "declined" && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <X className="h-5 w-5" />
            <span>This proposal was declined on {new Date(proposal.declined_at!).toLocaleDateString()}</span>
          </div>
        )}
        {isExpired && proposal.status !== "approved" && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>This proposal expired on {new Date(proposal.valid_until).toLocaleDateString()}</span>
          </div>
        )}

        {/* Proposal Card */}
        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{proposal.proposal_number}</p>
                <h2 className="text-2xl font-bold">{proposal.title}</h2>
              </div>
              <Badge
                variant={
                  proposal.status === "approved"
                    ? "default"
                    : proposal.status === "declined"
                    ? "destructive"
                    : "secondary"
                }
                className="w-fit"
              >
                {proposal.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Scope of Work */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Scope of Work</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {proposal.scope_of_work}
              </p>
            </section>

            {/* Deliverables */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Deliverables</h3>
              <ul className="space-y-3">
                {proposal.deliverables.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Pricing */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Pricing</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Description</th>
                      <th className="text-center px-4 py-3 font-medium">Qty</th>
                      <th className="text-center px-4 py-3 font-medium">Unit</th>
                      <th className="text-right px-4 py-3 font-medium">Rate</th>
                      <th className="text-right px-4 py-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.pricing_items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="text-center px-4 py-3">{item.quantity}</td>
                        <td className="text-center px-4 py-3 capitalize">{item.unit}</td>
                        <td className="text-right px-4 py-3">${(item.rate ?? 0).toLocaleString()}</td>
                        <td className="text-right px-4 py-3">
                          ${((item.quantity ?? 0) * (item.rate ?? 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr className="border-t">
                      <td colSpan={4} className="text-right px-4 py-2 font-medium">
                        Subtotal:
                      </td>
                      <td className="text-right px-4 py-2">
                        ${(proposal.subtotal ?? 0).toLocaleString()}
                      </td>
                    </tr>
                    {(proposal.discount ?? 0) > 0 && (
                      <tr>
                        <td colSpan={4} className="text-right px-4 py-2 font-medium">
                          Discount:
                        </td>
                        <td className="text-right px-4 py-2 text-green-600">
                          -${(proposal.discount ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t">
                      <td colSpan={4} className="text-right px-4 py-3 font-bold text-lg">
                        Total:
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-lg text-primary">
                        ${(proposal.total ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Valid Until */}
            <section className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Valid until: {new Date(proposal.valid_until).toLocaleDateString()}
              </span>
            </section>

            {/* Terms */}
            {proposal.terms_and_conditions && (
              <section>
                <h3 className="text-lg font-semibold mb-3">Terms & Conditions</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {proposal.terms_and_conditions}
                </p>
              </section>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {canTakeAction && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Ready to proceed?</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve Proposal
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRevisionDialog(true)}
                  disabled={actionLoading}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setShowDeclineDialog(true)}
                  disabled={actionLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#2b0a3d] text-white py-6 mt-12">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <p className="text-[#dfae62] font-semibold">Sentinel Aerial Inspections</p>
          <p className="text-sm text-white/60 mt-1">info@faithandharmonyllc.com</p>
          <p className="text-xs text-white/40 mt-2">
            &copy; {new Date().getFullYear()} Faith &amp; Harmony LLC DBA Sentinel Aerial Inspections. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              We're sorry this proposal doesn't meet your needs. Please let us know why
              (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for declining (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Decline Proposal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revision Dialog */}
      <AlertDialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Tell us what changes you'd like to see in the proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Describe the changes you'd like..."
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestRevision}
              disabled={!revisionNotes.trim()}
            >
              Submit Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
