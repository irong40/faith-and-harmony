import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
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
function VoiceLeadsTab() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-leads", statusFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("leads" as never)
        .select(
          "id, created_at, caller_name, caller_phone, caller_email, source_channel, qualification_status, call_id, client_id, quote_request_id, quote_requests ( id, status )",
          { count: "exact" },
        )
        .eq("source_channel", "voice_bot")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "All") query = query.eq("qualification_status", statusFilter);
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

  return (
    <div>
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

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No leads found.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Converted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(lead.created_at), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell className="font-medium">{lead.caller_name}</TableCell>
                  <TableCell className="text-sm">{lead.caller_phone}</TableCell>
                  <TableCell className="text-sm">{lead.caller_email ?? "No email"}</TableCell>
                  <TableCell>
                    <Badge className={OUTCOME_COLORS[lead.qualification_status] ?? "bg-gray-400 text-white"}>
                      {lead.qualification_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.quote_requests ? (
                      <Badge className="bg-green-500 text-white">Quoted ({lead.quote_requests.status})</Badge>
                    ) : lead.quote_request_id ? (
                      <Badge variant="secondary">Linked</Badge>
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
            <VoiceLeadsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
