import { useState, useMemo } from "react";
import AdminNav from "./components/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Satellite,
  Loader2,
  ExternalLink,
  MapPin,
  DollarSign,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Target,
  Clock,
  Users,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useMarketplaceLeads,
  useMarketplaceStats,
  useUpdateBidStatus,
  useMarketplaceRealtime,
  type MarketplaceLead,
  type MarketplaceFilters,
} from "@/hooks/useMarketplaceLeads";

// ─── Helpers ───

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-500",
  auto_declined: "bg-gray-100 text-gray-400",
  bid_placed: "bg-yellow-100 text-yellow-800",
  bid_failed: "bg-red-100 text-red-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-600",
  expired: "bg-gray-100 text-gray-400",
  mission_created: "bg-purple-100 text-purple-800",
};

const confidenceColors: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
  skip: "bg-gray-100 text-gray-500",
};

function formatCurrency(val: number | null): string {
  if (val == null) return "-";
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDistance(val: number | null): string {
  if (val == null) return "-";
  return `${val.toFixed(0)} mi`;
}

// ─── Component ───

export default function MarketplaceLeads() {
  const [filters, setFilters] = useState<MarketplaceFilters>({});
  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: leads = [], isLoading } = useMarketplaceLeads(filters);
  const { data: stats } = useMarketplaceStats();
  const updateStatus = useUpdateBidStatus();

  // Subscribe to realtime inserts
  useMarketplaceRealtime();

  const jobTypes = useMemo(() => {
    const types = new Set(leads.map(l => l.job_type).filter(Boolean));
    return [...types].sort();
  }, [leads]);

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, bid_status: "approved" });
  };

  const handleDecline = (id: string) => {
    updateStatus.mutate({ id, bid_status: "declined" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Satellite className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold">Marketplace Leads</h1>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
                <div className="text-xs text-muted-foreground">New</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-xs text-muted-foreground">Approved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.bidPlaced}</div>
                <div className="text-xs text-muted-foreground">Bid Placed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.won}</div>
                <div className="text-xs text-muted-foreground">Won</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.avgScore}</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalDelta)}
                </div>
                <div className="text-xs text-muted-foreground">Platform Gap</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select
            value={filters.bid_status || "active"}
            onValueChange={(v) => setFilters(f => ({ ...f, bid_status: v === "active" ? undefined : v }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="bid_placed">Bid Placed</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="auto_declined">Auto-Declined</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.confidence || "all"}
            onValueChange={(v) => setFilters(f => ({ ...f, confidence: v === "all" ? undefined : v }))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Confidence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Confidence</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.job_type || "all"}
            onValueChange={(v) => setFilters(f => ({ ...f, job_type: v === "all" ? undefined : v }))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {jobTypes.map(t => (
                <SelectItem key={t} value={t!}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No marketplace leads found. Run DroneSniper to start scraping.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Score</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Suggested Bid</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <TableCell>
                        <div className={`text-center font-bold text-sm rounded px-1 py-0.5 ${
                          (lead.score || 0) >= 80 ? "bg-green-100 text-green-800" :
                          (lead.score || 0) >= 50 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {lead.score ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm truncate max-w-[250px]">{lead.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{lead.job_type || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{lead.location_text || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(lead.budget)}
                      </TableCell>
                      <TableCell className="text-right text-green-700 font-medium">
                        {formatCurrency(lead.suggested_bid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDistance(lead.distance_miles)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[lead.bid_status] || "bg-gray-100"} variant="secondary">
                          {lead.bid_status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={confidenceColors[lead.confidence || ""] || "bg-gray-100"} variant="secondary">
                          {lead.confidence || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {lead.bid_status === "new" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                                onClick={() => handleApprove(lead.id)}
                                disabled={updateStatus.isPending}
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDecline(lead.id)}
                                disabled={updateStatus.isPending}
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {lead.url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => window.open(lead.url!, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedLead && <LeadDetail lead={selectedLead} onApprove={handleApprove} onDecline={handleDecline} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── Detail Panel ───

function LeadDetail({
  lead,
  onApprove,
  onDecline,
}: {
  lead: MarketplaceLead;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const breakdown = lead.evaluation_breakdown as Record<string, { score: number; weight: number; detail: string }>;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" />
          {lead.title}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Score + Status */}
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold px-3 py-1 rounded ${
            (lead.score || 0) >= 80 ? "bg-green-100 text-green-800" :
            (lead.score || 0) >= 50 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {lead.score ?? "-"}
          </div>
          <div>
            <Badge className={statusColors[lead.bid_status]} variant="secondary">
              {lead.bid_status.replace("_", " ")}
            </Badge>
            <Badge className={`ml-2 ${confidenceColors[lead.confidence || ""]}`} variant="secondary">
              {lead.confidence}
            </Badge>
          </div>
          {lead.bid_status === "new" && (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => onApprove(lead.id)}>
                <ThumbsUp className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onDecline(lead.id)}>
                <ThumbsDown className="h-4 w-4 mr-1" /> Decline
              </Button>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{lead.location_text || "Unknown"}</span>
            {lead.distance_miles != null && (
              <span className="text-muted-foreground">({formatDistance(lead.distance_miles)})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Budget: {formatCurrency(lead.budget)}
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Type: {lead.job_type || "-"}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {lead.typical_hours ? `${lead.typical_hours} hrs typical` : "-"}
          </div>
          {lead.client_name && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {lead.client_name}
            </div>
          )}
          {lead.expiry && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Expires: {lead.expiry}
            </div>
          )}
        </div>

        {/* Scoring Breakdown */}
        {breakdown && Object.keys(breakdown).length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Scoring Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="space-y-2">
                {Object.entries(breakdown).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{val.detail}</span>
                      <span className="font-medium w-8 text-right">{val.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profitability */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Profitability Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Suggested Bid:</span>
                <span className="ml-2 font-bold text-green-700">{formatCurrency(lead.suggested_bid)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Independent Rate:</span>
                <span className="ml-2 font-medium">{formatCurrency(lead.independent_rate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Platform Net:</span>
                <span className="ml-2">{formatCurrency(lead.platform_net)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Commission:</span>
                <span className="ml-2">{formatCurrency(lead.commission_paid)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gap:</span>
                <span className="ml-2 text-red-600 font-medium">
                  {formatCurrency(lead.delta)} ({lead.delta_percent?.toFixed(0)}%)
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Effective Hourly:</span>
                <span className="ml-2">{formatCurrency(lead.effective_hourly)}/hr</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competitors */}
        {lead.competitor_bids && lead.competitor_bids.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Competitor Bids ({lead.competitor_count})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="flex gap-2 flex-wrap">
                {lead.competitor_bids.map((bid, i) => (
                  <Badge key={i} variant="outline">${bid}</Badge>
                ))}
              </div>
              {lead.competitor_median && (
                <div className="text-xs text-muted-foreground mt-1">
                  Median: {formatCurrency(lead.competitor_median)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {lead.description && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <p className="text-sm text-muted-foreground">{lead.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Link */}
        {lead.url && (
          <Button variant="outline" className="w-full" onClick={() => window.open(lead.url!, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" /> View on Droners.io
          </Button>
        )}
      </div>
    </>
  );
}
