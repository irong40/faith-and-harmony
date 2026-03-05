import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuoteRequest {
  id: string;
  name: string;
  email: string;
  job_type: string | null;
}

interface QuoteBuilderProps {
  request: QuoteRequest | null;
  onClose: () => void;
  onCreated: () => void;
}

const DEFAULT_LINE_ITEM: LineItem = { description: "", quantity: 1, unit_price: 0 };

export default function QuoteBuilder({ request, onClose, onCreated }: QuoteBuilderProps) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...DEFAULT_LINE_ITEM }]);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const total = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const suggestedDeposit = Math.round(total * 0.5 * 100) / 100;

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { ...DEFAULT_LINE_ITEM }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request selected");

      const { data, error } = await supabase
        .from("quotes")
        .insert({
          request_id: request.id,
          status: "draft",
          line_items: lineItems as unknown as import("@/integrations/supabase/types").Json,
          total,
          deposit_amount: depositAmount,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("quote_requests")
        .update({ status: "reviewed" })
        .eq("id", request.id);

      return data;
    },
    onSuccess: () => {
      toast({ title: "Quote saved", description: "Draft quote created successfully." });
      onCreated();
      onClose();
    },
    onError: (err) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (lineItems.length === 0) {
      toast({
        title: "No line items",
        description: "Add at least one line item before saving.",
        variant: "destructive",
      });
      return;
    }
    createQuoteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Context banner */}
      {request && (
        <div className="text-sm text-muted-foreground bg-muted rounded-md px-4 py-2">
          <span className="font-medium text-foreground">{request.name}</span>
          {" \u2014 "}
          {request.email}
          {request.job_type && (
            <span className="ml-2 text-xs">({request.job_type})</span>
          )}
        </div>
      )}

      {/* Line Items section */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Line Items</h3>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-28">Unit Price</TableHead>
                <TableHead className="w-24">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                      placeholder="Service description"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, "quantity", Number(e.target.value))
                      }
                      className="h-8 text-sm w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={(e) =>
                        updateLineItem(index, "unit_price", Number(e.target.value))
                      }
                      className="h-8 text-sm w-28"
                    />
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5"
          onClick={addLineItem}
        >
          <Plus className="h-4 w-4" />
          Add Line Item
        </Button>
      </div>

      {/* Running total */}
      <div className="flex items-center justify-end gap-3 border-t pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold">${total.toFixed(2)}</span>
      </div>

      {/* Deposit Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="deposit-amount">Deposit Amount</Label>
        <Input
          id="deposit-amount"
          type="number"
          min={0}
          step={0.01}
          value={depositAmount}
          onChange={(e) => setDepositAmount(Number(e.target.value))}
          placeholder={`Suggested 50%: $${suggestedDeposit.toFixed(2)}`}
          className="max-w-xs"
        />
        {total > 0 && (
          <p className="text-xs text-muted-foreground">
            Suggested 50% deposit: ${suggestedDeposit.toFixed(2)}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes for this quote..."
          rows={3}
        />
      </div>

      {/* Footer actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onClose} disabled={createQuoteMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={createQuoteMutation.isPending}
        >
          {createQuoteMutation.isPending ? "Saving..." : "Save Draft"}
        </Button>
      </div>
    </div>
  );
}
