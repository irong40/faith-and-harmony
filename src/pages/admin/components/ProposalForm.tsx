import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Plus, Trash2, Wand2, Loader2, Send } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { MarketRatesPanel } from "@/components/proposal/MarketRatesPanel";

type ServiceRequest = Tables<"service_requests">;

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

interface ProposalFormProps {
  serviceRequest: ServiceRequest;
  serviceName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_TERMS = `Payment Terms:
- 50% deposit required to begin work
- Remaining 50% due upon project completion
- Payment due within 14 days of invoice

Revision Policy:
- Up to 2 rounds of revisions included
- Additional revisions billed at hourly rate

Timeline:
- Work will begin upon receipt of deposit
- Estimated completion dates are subject to client feedback turnaround

Ownership:
- Full ownership transfers upon final payment
- Faith & Harmony LLC retains portfolio rights`;

export default function ProposalForm({
  serviceRequest,
  serviceName,
  onSuccess,
  onCancel,
}: ProposalFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState(
    `${serviceName} Proposal for ${serviceRequest.company_name || serviceRequest.client_name}`
  );
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    { name: "", description: "" },
  ]);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([
    { description: "", quantity: 1, unit: "item", rate: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [adminNotes, setAdminNotes] = useState("");

  const subtotal = pricingItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );
  const total = subtotal - discount;

  const generateProposal = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: { serviceRequest, serviceName },
      });

      if (error) throw error;

      if (data.title) setTitle(data.title);
      if (data.scope_of_work) setScopeOfWork(data.scope_of_work);
      if (data.deliverables?.length) setDeliverables(data.deliverables);
      if (data.pricing_items?.length) setPricingItems(data.pricing_items);
      if (data.terms_and_conditions) setTerms(data.terms_and_conditions);

      toast({ title: "Proposal generated", description: "Review and adjust pricing" });
    } catch (error: any) {
      console.error("Generate error:", error);
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const addDeliverable = () => {
    setDeliverables([...deliverables, { name: "", description: "" }]);
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const updateDeliverable = (index: number, field: keyof Deliverable, value: string) => {
    const updated = [...deliverables];
    updated[index][field] = value;
    setDeliverables(updated);
  };

  const addPricingItem = (newItem?: PricingItem) => {
    if (newItem) {
      setPricingItems([...pricingItems, newItem]);
    } else {
      setPricingItems([...pricingItems, { description: "", quantity: 1, unit: "item", rate: 0 }]);
    }
  };

  const handleAddPricingItemClick = () => {
    addPricingItem();
  };

  const removePricingItem = (index: number) => {
    setPricingItems(pricingItems.filter((_, i) => i !== index));
  };

  const updatePricingItem = (
    index: number,
    field: keyof PricingItem,
    value: string | number
  ) => {
    const updated = [...pricingItems];
    if (field === "quantity" || field === "rate") {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setPricingItems(updated);
  };

  const generateToken = () => {
    return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  };

  const handleSave = async (sendEmail: boolean = false) => {
    if (!title || !scopeOfWork || deliverables.length === 0 || pricingItems.length === 0) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (sendEmail) {
      setSending(true);
    } else {
      setLoading(true);
    }

    try {
      // Generate proposal number
      const { data: numberData, error: numberError } = await supabase.rpc(
        "generate_proposal_number"
      );
      if (numberError) throw numberError;

      const proposalData = {
        service_request_id: serviceRequest.id,
        proposal_number: numberData as string,
        title,
        scope_of_work: scopeOfWork,
        deliverables: deliverables as unknown as Json,
        pricing_items: pricingItems as unknown as Json,
        subtotal,
        discount,
        total,
        valid_until: validUntil,
        terms_and_conditions: terms,
        admin_notes: adminNotes,
        approval_token: generateToken(),
        status: (sendEmail ? "sent" : "draft") as "draft" | "sent",
        sent_at: sendEmail ? new Date().toISOString() : null,
      };

      const { data: proposal, error } = await supabase
        .from("proposals")
        .insert(proposalData)
        .select()
        .single();

      if (error) throw error;

      // Update service request status
      await supabase
        .from("service_requests")
        .update({ status: "quoted" })
        .eq("id", serviceRequest.id);

      if (sendEmail) {
        // Send email
        const { error: emailError } = await supabase.functions.invoke(
          "send-proposal-email",
          {
            body: {
              proposal: {
                proposal_number: proposal.proposal_number,
                title: proposal.title,
                total: proposal.total,
                valid_until: proposal.valid_until,
                approval_token: proposal.approval_token,
              },
              client: {
                name: serviceRequest.client_name,
                email: serviceRequest.client_email,
                company_name: serviceRequest.company_name,
              },
              deliverables,
            },
          }
        );

        if (emailError) throw emailError;

        toast({ title: "Proposal sent", description: "Email sent to client" });
      } else {
        toast({ title: "Proposal saved as draft" });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* AI Generate Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={generateProposal}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          {generating ? "Generating..." : "Generate with AI"}
        </Button>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Proposal Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter proposal title"
        />
      </div>

      {/* Scope of Work */}
      <div className="space-y-2">
        <Label htmlFor="scope">Scope of Work *</Label>
        <Textarea
          id="scope"
          value={scopeOfWork}
          onChange={(e) => setScopeOfWork(e.target.value)}
          placeholder="Describe the scope of work..."
          rows={6}
        />
      </div>

      {/* Deliverables */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Deliverables *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addDeliverable}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {deliverables.map((item, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Deliverable name"
                value={item.name}
                onChange={(e) => updateDeliverable(index, "name", e.target.value)}
              />
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateDeliverable(index, "description", e.target.value)}
              />
            </div>
            {deliverables.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDeliverable(index)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Market Rates Reference Panel */}
      <MarketRatesPanel onAddPricingItem={addPricingItem} />

      {/* Pricing Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Pricing Items *</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddPricingItemClick}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {pricingItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updatePricingItem(index, "description", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updatePricingItem(index, "quantity", e.target.value)}
                  min={1}
                />
              </div>
              <div className="col-span-2">
                <Select
                  value={item.unit}
                  onValueChange={(v) => updatePricingItem(index, "unit", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => updatePricingItem(index, "rate", e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="col-span-1">
                {pricingItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePricingItem(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Discount:</span>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="w-32 text-right"
              min={0}
            />
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Valid Until */}
      <div className="space-y-2">
        <Label htmlFor="validUntil">Valid Until *</Label>
        <Input
          id="validUntil"
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
        />
      </div>

      {/* Terms */}
      <div className="space-y-2">
        <Label htmlFor="terms">Terms & Conditions</Label>
        <Textarea
          id="terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={8}
        />
      </div>

      {/* Admin Notes */}
      <div className="space-y-2">
        <Label htmlFor="adminNotes">Admin Notes (internal)</Label>
        <Textarea
          id="adminNotes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Internal notes..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleSave(false)}
          disabled={loading || sending}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={() => handleSave(true)}
          disabled={loading || sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Save & Send
        </Button>
      </div>
    </div>
  );
}
