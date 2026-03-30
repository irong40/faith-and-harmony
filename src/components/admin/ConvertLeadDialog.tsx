import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LeadRow = {
  id: string;
  caller_name: string;
  caller_phone: string;
  caller_email: string | null;
  source_channel: string;
};

type ConvertLeadDialogProps = {
  lead: Pick<LeadRow, "id" | "caller_name" | "caller_phone" | "caller_email" | "source_channel">;
  open: boolean;
  onClose: () => void;
  onConverted: () => void;
};

export function buildClientInsert(lead: Pick<LeadRow, "id" | "caller_name" | "caller_phone" | "caller_email" | "source_channel">) {
  return {
    name: lead.caller_name,
    phone: lead.caller_phone,
    email: lead.caller_email,
  };
}

export function buildQuoteRequestInsert(lead: Pick<LeadRow, "id" | "caller_name" | "caller_phone" | "caller_email" | "source_channel">) {
  return {
    name: lead.caller_name,
    email: lead.caller_email,
    phone: lead.caller_phone,
    description: "Lead converted from Sentinel lead record",
    status: "new",
    source: lead.source_channel === "voice_bot" ? "voice_bot" : "manual",
  };
}

export function ConvertLeadDialog({ lead, open, onClose, onConverted }: ConvertLeadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const convertNewMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: client, error: clientErr } = await (supabase as never)
        .from("clients")
        .insert({ ...buildClientInsert(lead), created_by: session.user.id } as never)
        .select("id")
        .single() as { data: { id: string } | null; error: unknown };
      if (clientErr || !client) throw (clientErr as Error) ?? new Error("Client insert failed");

      const { data: qr, error: qrErr } = await (supabase as never)
        .from("quote_requests")
        .insert({ ...buildQuoteRequestInsert(lead), brand_slug: "sai" } as never)
        .select("id")
        .single() as { data: { id: string } | null; error: unknown };
      if (qrErr || !qr) throw (qrErr as Error) ?? new Error("Quote request insert failed");

      const { error: leadErr } = await (supabase as never)
        .from("leads")
        .update({
          client_id: (client as { id: string }).id,
          quote_request_id: (qr as { id: string }).id,
          qualification_status: "converted",
        } as never)
        .eq("id", lead.id);
      if (leadErr) throw leadErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      onConverted();
      onClose();
    },
    onError: (err: Error) => toast({ title: "Conversion failed", description: err.message, variant: "destructive" }),
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) throw new Error("No client selected");
      const { error } = await (supabase as never)
        .from("leads")
        .update({ client_id: selectedClientId, qualification_status: "converted" } as never)
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      onConverted();
      onClose();
    },
    onError: (err: Error) => toast({ title: "Link failed", description: err.message, variant: "destructive" }),
  });

  const { data: matchingClients = [] } = useQuery({
    queryKey: ["clients-search", clientSearch],
    queryFn: async () => {
      if (!clientSearch.trim()) return [];
      const { data, error } = await (supabase as never)
        .from("clients")
        .select("id, name, email, phone")
        .or(`name.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%`) as {
          data: Array<{ id: string; name: string; email: string | null; phone: string | null }> | null;
          error: unknown;
        };
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; email: string | null; phone: string | null }>;
    },
    enabled: clientSearch.trim().length > 1,
    staleTime: 10_000,
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="new-client" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="new-client" className="flex-1">New Client</TabsTrigger>
            <TabsTrigger value="link-existing" className="flex-1">Link Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="new-client" className="space-y-4 pt-4">
            <div className="rounded-md border p-4 space-y-2 bg-muted/40">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{lead.caller_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span>{lead.caller_phone}</span>
              </div>
              {lead.caller_email && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span>{lead.caller_email}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              This will create a new client and quote request, then mark this lead as converted.
            </p>
            <Button
              className="w-full"
              onClick={() => convertNewMutation.mutate()}
              disabled={convertNewMutation.isPending}
            >
              {convertNewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Converting...
                </>
              ) : (
                "Convert"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="link-existing" className="space-y-4 pt-4">
            <Input
              placeholder="Search by name or email..."
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setSelectedClientId(null); }}
            />

            {matchingClients.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {matchingClients.map((client) => (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/60 ${selectedClientId === client.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{client.name}</p>
                      {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                    </div>
                    {selectedClientId === client.id && (
                      <Badge className="bg-primary text-primary-foreground text-xs">Selected</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {clientSearch.trim().length > 1 && matchingClients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No clients found.</p>
            )}

            <Button
              className="w-full"
              onClick={() => linkMutation.mutate()}
              disabled={!selectedClientId || linkMutation.isPending}
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Linking...
                </>
              ) : (
                "Link"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
