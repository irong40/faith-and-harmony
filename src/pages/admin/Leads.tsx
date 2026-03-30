import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { LeadDetailDrawer } from "@/components/admin/LeadDetailDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Target,
  RefreshCw,
  Search,
  Building2,
  Phone,
  Zap,
  Mail,
  MailOpen,
  MousePointer,
  ExternalLink,
  Star,
  Loader2,
} from "lucide-react";
import { OUTCOME_COLORS } from "./CallLogs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConvertLeadDialog } from "@/components/admin/ConvertLeadDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadStatsHeader } from "@/components/admin/LeadStatsHeader";

// -------------------------------------------------------
// Voice Leads Types
// -------------------------------------------------------
type LeadRow = {
  id: string;
  created_at: string;
  caller_name: string;
  caller_phone: string;
  caller_email: string | null;
  source_channel: string;
  qualification_status: string;
  call_id: string | null;
  client_id: string | null;
  quote_request_id: string | null;
  quote_requests: { id: string; status: string } | null;
  lead_notes: Array<{ follow_up_at: string | null }>;
};

export function isOverdue(lead: Pick<LeadRow, "lead_notes">): boolean {
  const now = new Date();
  return lead.lead_notes.some(
    (n) => n.follow_up_at != null && new Date(n.follow_up_at) < now
  );
}

export function isSourceFilterActive(filter: string): boolean {
  return filter !== "All";
}

export function getQualifiedUnconvertedLeads(leads: LeadRow[]): LeadRow[] {
  return leads.filter((l) => l.qualification_status === "qualified" && l.client_id === null);
}

export function toggleLeadSelection(selected: Set<string>, leadId: string): Set<string> {
  const next = new Set(selected);
  if (next.has(leadId)) {
    next.delete(leadId);
  } else {
    next.add(leadId);
  }
  return next;
}

const SOURCE_CHANNEL_COLORS: Record<string, string> = {
  voice_bot: "bg-blue-500 text-white",
  web_form: "bg-violet-500 text-white",
  manual: "bg-slate-500 text-white",
  email_outreach: "bg-orange-500 text-white",
  social: "bg-pink-500 text-white",
};

const SOURCE_CHANNEL_LABELS: Record<string, string> = {
  voice_bot: "Voice Bot",
  web_form: "Web Form",
  manual: "Manual",
  email_outreach: "Email",
  social: "Social",
};

// -------------------------------------------------------
// Drone Leads Types
// -------------------------------------------------------
type DroneLeadRow = {
  id: string;
  created_at: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string;
  portfolio_type: string | null;
  google_rating: number | null;
  review_count: number | null;
  hunter_io_score: number | null;
  ai_email_subject: string | null;
  ai_email_body: string | null;
  status: string;
  priority: string;
  email_tracking: { open_count: number; click_count: number }[];
};

type LeadGenJob = {
  id: string;
  created_at: string;
  status: string;
  search_config: { query: string } | null;
  leads_created: number;
  emails_found: number;
  ai_drafts_generated: number;
  raw_results_found: number;
  duplicates_filtered: number;
};

const VOICE_STATUS_FILTERS = ["All", "qualified", "declined", "transferred", "pending"];
const DRONE_STATUS_FILTERS = ["All", "new", "contacted", "responded", "qualified", "client"];
const PAGE_SIZE = 20;

// -------------------------------------------------------
// Voice Leads Tab
// -------------------------------------------------------
type VoiceLeadsTabProps = {
  onSelectLead: (id: string) => void;
};

function VoiceLeadsTab({ onSelectLead }: VoiceLeadsTabProps) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceChannelFilter, setSourceChannelFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Reset selection when page or filters change
  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [page, statusFilter, sourceChannelFilter]);

  // Convert Lead dialog state
  const [convertLead, setConvertLead] = useState<LeadRow | null>(null);

  // New Lead dialog state
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSource, setNewSource] = useState<string>("manual");
  const [newNote, setNewNote] = useState("");

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data: lead, error } = await (supabase as never)
        .from("leads")
        .insert({
          caller_name: newName.trim(),
          caller_phone: newPhone.trim(),
          caller_email: newEmail.trim() || null,
          source_channel: newSource,
          qualification_status: "pending",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      if (newNote.trim() && lead) {
        await (supabase as never)
          .from("lead_notes")
          .insert({
            lead_id: (lead as { id: string }).id,
            content: newNote.trim(),
            created_by: session.user.id,
          } as never);
      }
    },
    onSuccess: () => {
      setNewLeadOpen(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewSource("manual");
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast({ title: "Lead created" });
    },
    onError: (err: Error) => {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads" as never)
        .update({ qualification_status: status } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: sourceCounts } = useQuery({
    queryKey: ["admin-leads-source-counts", statusFilter, search],
    queryFn: async () => {
      const channels = ["voice_bot", "web_form", "manual", "email_outreach", "social"];
      const results = await Promise.all(
        channels.map(async (ch) => {
          let cq = supabase
            .from("leads" as never)
            .select("id", { count: "exact", head: true }) as never;
          cq = (cq as never).eq("source_channel", ch);
          if (statusFilter !== "All") cq = (cq as never).eq("qualification_status", statusFilter);
          if (search.trim()) cq = (cq as never).or(`caller_name.ilike.%${search}%,caller_phone.ilike.%${search}%`);
          const { count } = await cq;
          return [ch, count ?? 0] as [string, number];
        })
      );
      return Object.fromEntries(results) as Record<string, number>;
    },
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-leads", statusFilter, sourceChannelFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("leads" as never)
        .select(
          "id, created_at, caller_name, caller_phone, caller_email, source_channel, qualification_status, call_id, client_id, quote_request_id, quote_requests ( id, status ), lead_notes ( follow_up_at )",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "All") query = query.eq("qualification_status", statusFilter);
      if (sourceChannelFilter !== "All") query = query.eq("source_channel", sourceChannelFilter);
      if (search.trim()) {
        query = query.or(`caller_name.ilike.%${search}%,caller_phone.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { leads: (data ?? []) as unknown as LeadRow[], total: count ?? 0 };
    },
    staleTime: 2 * 60 * 1000,
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Bulk conversion state
  const [bulkConverting, setBulkConverting] = useState(false);
  type BulkResult = { leadId: string; name: string; status: "success" | "error"; error?: string };
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);

  async function handleBulkConvert() {
    setBulkConverting(true);
    setBulkResults([]);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setBulkConverting(false);
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    const leadsToConvert = leads.filter((l) => selectedLeadIds.has(l.id));
    const results = await Promise.allSettled(
      leadsToConvert.map(async (lead) => {
        const { data: client, error: cErr } = await supabase
          .from("clients" as never)
          .insert({ name: lead.caller_name, phone: lead.caller_phone, email: lead.caller_email, created_by: session.user.id } as never)
          .select("id").single() as { data: { id: string } | null; error: unknown };
        if (cErr || !client) throw cErr ?? new Error("Client insert failed");

        const { data: qr, error: qErr } = await (supabase as never)
          .from("quote_requests")
          .insert({ name: lead.caller_name, email: lead.caller_email, phone: lead.caller_phone, description: "Lead converted from Sentinel lead record", status: "new", source: lead.source_channel === "voice_bot" ? "voice_bot" : "manual", brand_slug: "sai" } as never)
          .select("id").single();
        if (qErr || !qr) throw qErr ?? new Error("Quote request insert failed");

        const { error: lErr } = await (supabase as never)
          .from("leads")
          .update({ client_id: (client as { id: string }).id, quote_request_id: (qr as { id: string }).id, qualification_status: "converted" } as never)
          .eq("id", lead.id);
        if (lErr) throw lErr;
      })
    );

    const bulkRes: BulkResult[] = results.map((r, i) => ({
      leadId: leadsToConvert[i].id,
      name: leadsToConvert[i].caller_name,
      status: r.status === "fulfilled" ? "success" : "error",
      error: r.status === "rejected" ? String((r as PromiseRejectedResult).reason) : undefined,
    }));
    setBulkResults(bulkRes);
    setBulkConverting(false);
    setSelectedLeadIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });

    const successCount = bulkRes.filter((r) => r.status === "success").length;
    const failCount = bulkRes.filter((r) => r.status === "error").length;
    toast({
      title: `Bulk convert: ${successCount} succeeded${failCount > 0 ? `, ${failCount} failed` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    });
  }

  return (
    <div>
      {/* New Lead button and dialog */}
      <div className="flex justify-end mb-4">
        <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              New Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="new-lead-name">Name (required)</Label>
                <Input
                  id="new-lead-name"
                  placeholder="Caller full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-lead-phone">Phone (required)</Label>
                <Input
                  id="new-lead-phone"
                  placeholder="+1 (555) 000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-lead-email">Email (optional)</Label>
                <Input
                  id="new-lead-email"
                  type="email"
                  placeholder="caller@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-lead-source">Source (required)</Label>
                <Select value={newSource} onValueChange={setNewSource}>
                  <SelectTrigger id="new-lead-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="web_form">Web Form</SelectItem>
                    <SelectItem value="email_outreach">Email</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-lead-note">Note (optional)</Label>
                <Textarea
                  id="new-lead-note"
                  placeholder="Any context about this lead..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createLeadMutation.mutate()}
                disabled={!newName.trim() || !newPhone.trim() || createLeadMutation.isPending}
              >
                {createLeadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Lead"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status filter row */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {VOICE_STATUS_FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(filter); setPage(0); }}
          >
            {filter}
          </Button>
        ))}
      </div>

      {/* Source channel filter row */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["All", "voice_bot", "web_form", "manual", "email_outreach", "social"] as const).map((ch) => (
          <Button
            key={ch}
            variant={sourceChannelFilter === ch ? "default" : "outline"}
            size="sm"
            onClick={() => { setSourceChannelFilter(ch); setPage(0); }}
          >
            {ch === "All" ? "All Sources" : SOURCE_CHANNEL_LABELS[ch]}
            {ch !== "All" && sourceCounts?.[ch] != null ? ` (${sourceCounts[ch]})` : ""}
          </Button>
        ))}
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-10"
        />
      </div>

      {selectedLeadIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-muted rounded-md border">
          <span className="text-sm font-medium">{selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""} selected</span>
          <Button
            size="sm"
            onClick={handleBulkConvert}
            disabled={bulkConverting}
            className="gap-2"
          >
            {bulkConverting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {bulkConverting ? "Converting..." : "Bulk Convert"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedLeadIds(new Set())}
            disabled={bulkConverting}
          >
            Clear selection
          </Button>
        </div>
      )}

      {bulkResults.length > 0 && (
        <div className="mb-3 space-y-1">
          {bulkResults.map((r) => (
            <div key={r.leadId} className="flex items-center gap-2 text-sm">
              <Badge className={r.status === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                {r.status === "success" ? "OK" : "Failed"}
              </Badge>
              <span>{r.name}</span>
              {r.error && <span className="text-muted-foreground text-xs">({r.error})</span>}
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No leads found.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      getQualifiedUnconvertedLeads(leads).length > 0 &&
                      getQualifiedUnconvertedLeads(leads).every((l) => selectedLeadIds.has(l.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedLeadIds(new Set(getQualifiedUnconvertedLeads(leads).map((l) => l.id)));
                      } else {
                        setSelectedLeadIds(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Converted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={isOverdue(lead) ? "border-l-4 border-amber-400 bg-amber-50/40 cursor-pointer" : "cursor-pointer"}
                  onClick={() => onSelectLead(lead.id)}
                >
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    {lead.qualification_status === "qualified" && !lead.client_id && (
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={() => setSelectedLeadIds(toggleLeadSelection(selectedLeadIds, lead.id))}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(lead.created_at), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell className="font-medium">{lead.caller_name}</TableCell>
                  <TableCell className="text-sm">{lead.caller_phone}</TableCell>
                  <TableCell className="text-sm">{lead.caller_email ?? "No email"}</TableCell>
                  <TableCell>
                    <Badge className={SOURCE_CHANNEL_COLORS[lead.source_channel] ?? "bg-gray-400 text-white"}>
                      {SOURCE_CHANNEL_LABELS[lead.source_channel] ?? lead.source_channel}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.qualification_status}
                      onValueChange={(value) => updateStatusMutation.mutate({ id: lead.id, status: value })}
                    >
                      <SelectTrigger className="h-7 w-auto border-0 p-0 focus:ring-0">
                        <Badge className={OUTCOME_COLORS[lead.qualification_status] ?? "bg-gray-400 text-white"}>
                          {lead.qualification_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {["qualified", "declined", "transferred", "pending"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {lead.client_id ? (
                      <Badge className="bg-purple-600 text-white">Converted</Badge>
                    ) : lead.qualification_status === "qualified" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setConvertLead(lead)}
                      >
                        Convert
                      </Button>
                    ) : lead.quote_requests ? (
                      <Badge className="bg-green-500 text-white">Quoted ({lead.quote_requests.status})</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No quote</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({total} total)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        </div>
      )}

      {convertLead && (
        <ConvertLeadDialog
          lead={convertLead}
          open={!!convertLead}
          onClose={() => setConvertLead(null)}
          onConverted={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
            setConvertLead(null);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------
// Drone Leads Tab
// -------------------------------------------------------
function DroneLeadsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [enrichQuery, setEnrichQuery] = useState("");
  const [enrichMax, setEnrichMax] = useState(10);
  const [enrichOpen, setEnrichOpen] = useState(false);

  // Fetch drone leads
  const { data, isLoading } = useQuery({
    queryKey: ["drone-leads", statusFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("drone_leads")
        .select(
          "id, created_at, company_name, email, phone, website, city, state, portfolio_type, google_rating, review_count, hunter_io_score, ai_email_subject, ai_email_body, status, priority, email_tracking(open_count, click_count)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "All") query = query.eq("status", statusFilter);
      if (search.trim()) {
        query = query.or(`company_name.ilike.%${search}%,city.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { leads: (data ?? []) as unknown as DroneLeadRow[], total: count ?? 0 };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch recent enrichment jobs
  const { data: recentJobs } = useQuery({
    queryKey: ["lead-gen-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_gen_jobs")
        .select("id, created_at, status, search_config, leads_created, emails_found, ai_drafts_generated, raw_results_found, duplicates_filtered")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as LeadGenJob[];
    },
    staleTime: 30_000,
  });

  // Enrichment mutation
  const enrichMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://qjpujskwqaehxnqypxzu.supabase.co"}/functions/v1/enrich-drone-leads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ query: enrichQuery, max_results: enrichMax }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: `Enrichment complete`,
        description: `${data.leads_created} leads created, ${data.emails_found} emails found, ${data.ai_drafts_generated} pitches drafted`,
      });
      setEnrichOpen(false);
      setEnrichQuery("");
      queryClient.invalidateQueries({ queryKey: ["drone-leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-gen-jobs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Enrichment failed", description: err.message, variant: "destructive" });
    },
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const priorityColor: Record<string, string> = {
    high: "bg-red-500 text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-gray-400 text-white",
  };

  const statusColor: Record<string, string> = {
    new: "bg-blue-500 text-white",
    contacted: "bg-amber-500 text-white",
    responded: "bg-purple-500 text-white",
    qualified: "bg-green-500 text-white",
    client: "bg-emerald-600 text-white",
  };

  return (
    <div>
      {/* Stats + Enrich Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          {recentJobs && recentJobs.length > 0 && (
            <Card className="px-4 py-2">
              <p className="text-xs text-muted-foreground">Last enrichment</p>
              <p className="text-sm font-medium">
                {recentJobs[0].leads_created} leads
                {recentJobs[0].search_config?.query ? ` ("${recentJobs[0].search_config.query}")` : ""}
              </p>
            </Card>
          )}
        </div>

        <Dialog open={enrichOpen} onOpenChange={setEnrichOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Find New Leads
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lead Enrichment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="enrich-query">Search Query</Label>
                <Input
                  id="enrich-query"
                  placeholder="real estate agents Hampton Roads VA"
                  value={enrichQuery}
                  onChange={(e) => setEnrichQuery(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Try: property managers Norfolk VA, roofing contractors Virginia Beach, construction companies Chesapeake VA
                </p>
              </div>
              <div>
                <Label htmlFor="enrich-max">Max Results</Label>
                <Input
                  id="enrich-max"
                  type="number"
                  min={1}
                  max={20}
                  value={enrichMax}
                  onChange={(e) => setEnrichMax(parseInt(e.target.value) || 10)}
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => enrichMutation.mutate()}
                disabled={!enrichQuery.trim() || enrichMutation.isPending}
              >
                {enrichMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching and enriching...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Run Enrichment
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {DRONE_STATUS_FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(filter); setPage(0); }}
          >
            {filter}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search company, city, or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No drone leads yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Find New Leads" to discover businesses in your area
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Email Score</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const totalOpens = lead.email_tracking?.reduce((sum, t) => sum + t.open_count, 0) ?? 0;
                const totalClicks = lead.email_tracking?.reduce((sum, t) => sum + t.click_count, 0) ?? 0;

                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.company_name}</p>
                        {lead.portfolio_type && (
                          <p className="text-xs text-muted-foreground">{lead.portfolio_type.replace(/_/g, " ")}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.city ? `${lead.city}, ${lead.state}` : lead.state}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[160px]">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.website && (
                          <div className="flex items-center gap-1 text-sm">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            <a
                              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate max-w-[140px]"
                            >
                              {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.google_rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium">{lead.google_rating}</span>
                          {lead.review_count != null && (
                            <span className="text-xs text-muted-foreground">({lead.review_count})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.hunter_io_score != null ? (
                        <Badge variant={lead.hunter_io_score >= 70 ? "default" : "secondary"}>
                          {lead.hunter_io_score}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {totalOpens > 0 || totalClicks > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm">
                            <MailOpen className="h-3 w-3 text-blue-500" />
                            <span>{totalOpens}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <MousePointer className="h-3 w-3 text-green-500" />
                            <span>{totalClicks}</span>
                          </div>
                        </div>
                      ) : lead.ai_email_subject ? (
                        <Badge variant="outline" className="text-xs">Pitch ready</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColor[lead.priority] || "bg-gray-400 text-white"}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[lead.status] || "bg-gray-400 text-white"}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({total} total)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Main Leads Page
// -------------------------------------------------------
export default function Leads() {
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Leads</h1>
              <p className="text-sm text-muted-foreground">
                Voice bot leads and B2B drone services prospecting
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
              queryClient.invalidateQueries({ queryKey: ["drone-leads"] });
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <LeadStatsHeader />

        <Tabs defaultValue="drone" className="space-y-4">
          <TabsList>
            <TabsTrigger value="drone" className="gap-2">
              <Building2 className="h-4 w-4" />
              B2B Leads
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2">
              <Phone className="h-4 w-4" />
              Voice Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drone">
            <DroneLeadsTab />
          </TabsContent>

          <TabsContent value="voice">
            <VoiceLeadsTab onSelectLead={setSelectedLeadId} />
          </TabsContent>
        </Tabs>

        <LeadDetailDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      </div>
    </div>
  );
}
