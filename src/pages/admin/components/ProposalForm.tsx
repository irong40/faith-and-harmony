import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Wand2, Loader2, Send, Calculator, Printer } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { MarketRatesPanel } from "@/components/proposal/MarketRatesPanel";
import { ProposalPDFView } from "@/components/proposal/ProposalPDFView";
import {
  suggestPricingFromScope,
  calculateDiscountedRate,
  getMarketRateFromDiscounted,
} from "@/data/market-rates";

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
  serviceCode?: string;
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
- Faith & Harmony LLC DBA Sentinel Aerial Inspections retains portfolio rights`;

export default function ProposalForm({
  serviceRequest,
  serviceName,
  serviceCode = "WEBSITE",
  onSuccess,
  onCancel,
}: ProposalFormProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [calculating, setCalculating] = useState(false);

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

  // Client type and market rate tracking
  const [clientType, setClientType] = useState<'standard' | 'nonprofit'>('standard');
  const [marketRateSubtotal, setMarketRateSubtotal] = useState(0);

  const subtotal = pricingItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );
  const total = subtotal - discount;
  const discountPercent = clientType === 'nonprofit' ? 20 : 10;

  // Auto-detect nonprofit status from metadata
  useEffect(() => {
    const metadata = serviceRequest.metadata as Record<string, unknown> | null;
    if (metadata) {
      const orgType = (metadata.organizationType as string || '').toLowerCase();
      if (
        orgType.includes('nonprofit') ||
        orgType.includes('non-profit') ||
        orgType.includes('church') ||
        orgType.includes('ministry') ||
        orgType.includes('501c')
      ) {
        setClientType('nonprofit');
      }
    }
  }, [serviceRequest]);

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
    } catch (error: unknown) {
      console.error("Generate error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Generation failed",
        description: message,
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

  // Calculate from market rates
  const calculateFromMarketRates = () => {
    if (!scopeOfWork.trim()) {
      toast({
        title: "Missing scope",
        description: "Please fill in the scope of work first",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);

    try {
      const isNonprofit = clientType === 'nonprofit';
      const suggestions = suggestPricingFromScope(serviceCode, scopeOfWork, isNonprofit);

      if (suggestions.length === 0) {
        toast({
          title: "No rates found",
          description: "Could not find matching market rates for this service type",
          variant: "destructive",
        });
        setCalculating(false);
        return;
      }

      // Convert to pricing items
      const newPricingItems: PricingItem[] = suggestions.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
      }));

      // Calculate market rate subtotal (before discount)
      const marketTotal = suggestions.reduce(
        (sum, item) => sum + item.quantity * item.marketRate,
        0
      );

      setPricingItems(newPricingItems);
      setMarketRateSubtotal(Math.round(marketTotal));

      toast({
        title: "Market rates applied",
        description: `${discountPercent}% discount applied (${isNonprofit ? 'Nonprofit rate' : 'Standard rate'})`,
      });
    } catch (error) {
      console.error("Calculate error:", error);
      toast({
        title: "Calculation failed",
        description: "Could not calculate market rates",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  // Print / Export PDF
  const handlePrint = () => {
    const proposalData = {
      title,
      clientName: serviceRequest.client_name,
      clientEmail: serviceRequest.client_email,
      companyName: serviceRequest.company_name || undefined,
      scopeOfWork,
      deliverables: deliverables.filter(d => d.name),
      pricingItems: pricingItems.filter(p => p.description),
      subtotal,
      discount,
      total,
      validUntil,
      terms,
      clientType,
      marketRateSubtotal,
    };

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups to print the proposal",
        variant: "destructive",
      });
      return;
    }

    const pricingRows = proposalData.pricingItems
      .map(item => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; color: #374151;">${item.description}</td>
          <td style="padding: 12px; text-align: right; color: #6b7280;">${item.quantity}</td>
          <td style="padding: 12px; text-align: center; color: #6b7280;">${item.unit}</td>
          <td style="padding: 12px; text-align: right; color: #6b7280;">$${item.rate.toLocaleString()}</td>
          <td style="padding: 12px; text-align: right; font-weight: 500;">$${(item.quantity * item.rate).toLocaleString()}</td>
        </tr>
      `).join('');

    const deliverablesList = proposalData.deliverables
      .map(d => `<li style="margin-bottom: 8px;"><span style="color: #16a34a; margin-right: 8px;">✓</span><strong>${d.name}</strong>${d.description ? ` — ${d.description}` : ''}</li>`)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Proposal - ${proposalData.title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111827; line-height: 1.6; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
            <div>
              <h1 style="font-size: 24px; font-weight: bold; color: #111827;">Sentinel Aerial Inspections</h1>
              <p style="font-size: 14px; color: #6b7280; margin-top: 4px;">Professional Services Proposal</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 18px; font-weight: bold; color: #111827;">DRAFT</p>
              <p style="font-size: 14px; color: #6b7280;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <!-- Client Info -->
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="font-weight: 600; color: #374151; margin-bottom: 8px;">Prepared For:</p>
            <p style="font-size: 18px; font-weight: bold;">${proposalData.clientName}</p>
            ${proposalData.companyName ? `<p style="color: #6b7280;">${proposalData.companyName}</p>` : ''}
            ${proposalData.clientEmail ? `<p style="font-size: 14px; color: #9ca3af;">${proposalData.clientEmail}</p>` : ''}
            ${proposalData.clientType === 'nonprofit' ? '<span style="display: inline-block; margin-top: 8px; padding: 4px 8px; background: #dcfce7; color: #166534; font-size: 12px; border-radius: 4px;">Nonprofit Discount Applied (20% off)</span>' : ''}
          </div>

          <!-- Title -->
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #111827;">${proposalData.title}</h2>

          <!-- Scope -->
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; color: #374151;">Scope of Work</h3>
            <p style="white-space: pre-wrap; color: #374151;">${proposalData.scopeOfWork}</p>
          </div>

          <!-- Deliverables -->
          ${proposalData.deliverables.length > 0 ? `
            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; color: #374151;">Deliverables</h3>
              <ul style="list-style: none;">${deliverablesList}</ul>
            </div>
          ` : ''}

          <!-- Pricing -->
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; color: #374151;">Investment</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="text-align: left; padding: 12px; font-weight: 600; color: #374151;">Description</th>
                  <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151; width: 60px;">Qty</th>
                  <th style="text-align: center; padding: 12px; font-weight: 600; color: #374151; width: 60px;">Unit</th>
                  <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151; width: 80px;">Rate</th>
                  <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151; width: 100px;">Total</th>
                </tr>
              </thead>
              <tbody>${pricingRows}</tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end;">
              <div style="width: 250px;">
                ${proposalData.marketRateSubtotal > 0 ? `
                  <div style="display: flex; justify-content: space-between; font-size: 14px; color: #9ca3af; margin-bottom: 8px;">
                    <span>Market Rate:</span>
                    <span style="text-decoration: line-through;">$${proposalData.marketRateSubtotal.toLocaleString()}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #6b7280;">Subtotal:</span>
                  <span>$${proposalData.subtotal.toLocaleString()}</span>
                </div>
                ${proposalData.discount > 0 ? `
                  <div style="display: flex; justify-content: space-between; color: #16a34a; margin-bottom: 8px;">
                    <span>Discount:</span>
                    <span>-$${proposalData.discount.toLocaleString()}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; border-top: 2px solid #e5e7eb; padding-top: 8px;">
                  <span>Total:</span>
                  <span>$${proposalData.total.toLocaleString()}</span>
                </div>
                ${proposalData.marketRateSubtotal > 0 ? `<p style="font-size: 12px; color: #16a34a; text-align: right; margin-top: 4px;">${proposalData.clientType === 'nonprofit' ? '20%' : '10%'} below market rate</p>` : ''}
              </div>
            </div>
          </div>

          <!-- Valid Until -->
          <p style="font-size: 14px; color: #6b7280; font-style: italic; margin-bottom: 24px;">
            This proposal is valid until ${new Date(proposalData.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <!-- Terms -->
          ${proposalData.terms ? `
            <div style="margin-bottom: 32px;">
              <h3 style="font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; color: #374151;">Terms & Conditions</h3>
              <pre style="font-family: inherit; font-size: 14px; white-space: pre-wrap; color: #6b7280;">${proposalData.terms}</pre>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 14px; color: #9ca3af;">
            <p style="font-weight: 500;">Sentinel Aerial Inspections</p>
            <p>sentinelaerial.com</p>
            <p style="margin-top: 8px; font-style: italic;">Thank you for considering us for your project.</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
    } catch (error: unknown) {
      console.error("Save error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Top Actions Row */}
      <div className="flex justify-between items-center gap-4">
        {/* Client Type Selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Client Type:</Label>
          <Select value={clientType} onValueChange={(v: 'standard' | 'nonprofit') => setClientType(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard (10% off market)</SelectItem>
              <SelectItem value="nonprofit">Nonprofit (20% off market)</SelectItem>
            </SelectContent>
          </Select>
          {clientType === 'nonprofit' && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              Nonprofit Discount
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="Print / Save as PDF"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={calculateFromMarketRates}
              disabled={calculating || !scopeOfWork.trim()}
              title="Auto-fill pricing based on scope and service type"
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-1" />
              )}
              Calculate from Market Rates
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleAddPricingItemClick}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
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
        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
          {/* Market Rate Comparison */}
          {marketRateSubtotal > 0 && (
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-sm mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground">Market Rate:</span>
                <span className="line-through text-muted-foreground">
                  ${marketRateSubtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-green-400">
                  Your Quote ({discountPercent}% below market):
                </span>
                <span className="font-bold text-green-400">
                  ${subtotal.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Savings: ${(marketRateSubtotal - subtotal).toLocaleString()}
                {clientType === 'nonprofit' && ' (includes nonprofit discount)'}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Additional Discount:</span>
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
