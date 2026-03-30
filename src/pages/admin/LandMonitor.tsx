import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Satellite,
  Search,
  Loader2,
  ExternalLink,
  Copy,
  Phone,
  MapPin,
  Ruler,
  DollarSign,
  Camera,
  Clock,
  TrendingUp,
  AlertCircle,
  Eye,
  Users,
  Plane,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ───

interface LandListing {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  land_type: string | null;
  acreage: number | null;
  price: number | null;
  price_per_acre: number | null;
  photo_count: number | null;
  has_aerial_photos: boolean | null;
  photo_quality_score: number | null;
  opportunity_score: number | null;
  opportunity_flags: string[] | null;
  listing_agent_name: string | null;
  listing_agent_company: string | null;
  status: string;
  priority: string;
  source_url: string;
  ai_pitch_subject: string | null;
  ai_pitch_body: string | null;
  first_seen_at: string;
  source_name: string | null;
  outreach_count: number;
  last_outreach_date: string | null;
}

interface MonitorJob {
  id: string;
  job_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  new_listings_found: number | null;
  high_opportunity_count: number | null;
  api_cost: number | null;
}

// ─── Constants ───

const LAND_TYPE_LABELS: Record<string, string> = {
  vacant_lot: "Vacant Lot",
  farm_agricultural: "Farm / Ag",
  commercial: "Commercial",
  waterfront: "Waterfront",
  residential_lot: "Residential",
  timber: "Timber",
  recreational: "Recreational",
  mixed_use: "Mixed Use",
  other: "Other",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  reviewed: "secondary",
  contacted: "outline",
  quoted: "secondary",
  booked: "default",
  completed: "default",
  passed: "outline",
  expired: "outline",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-gray-400",
};

const FLAG_LABELS: Record<string, string> = {
  no_photos: "No Photos",
  few_photos: "Few Photos",
  no_aerial: "No Aerial",
  large_parcel: "Large",
  medium_parcel: "Medium",
  high_value: "High Value",
  mid_value: "Mid Value",
  waterfront: "Waterfront",
  farm: "Farm",
  fsbo: "FSBO",
};

// ─── Helpers ───

function formatCurrency(val: number | null): string {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatAcres(val: number | null): string {
  if (!val) return "—";
  return val >= 10 ? `${Math.round(val)} ac` : `${val.toFixed(1)} ac`;
}

function opportunityColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-blue-600";
  return "text-muted-foreground";
}

function opportunityBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-blue-500";
  return "bg-gray-400";
}

// ─── Components ───

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/40" />
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={score} className="h-1.5 flex-1" />
      <span className={`text-xs font-semibold min-w-[28px] text-right ${opportunityColor(score)}`}>
        {score}
      </span>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${PRIORITY_COLORS[priority] || "bg-gray-400"}`}
      title={priority}
    />
  );
}

function FlagPills({ flags }: { flags: string[] | null }) {
  if (!flags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.slice(0, 4).map((f) => (
        <Badge key={f} variant="outline" className="text-[10px] px-1.5 py-0">
          {FLAG_LABELS[f] || f}
        </Badge>
      ))}
    </div>
  );
}

// ─── Detail Modal ───

function ListingDetailModal({
  listing,
  onClose,
  onStatusChange,
  onConvertToMission,
}: {
  listing: LandListing;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onConvertToMission: (listing: LandListing) => void;
}) {
  const { toast } = useToast();

  const copyPitch = () => {
    if (listing.ai_pitch_subject && listing.ai_pitch_body) {
      navigator.clipboard.writeText(
        `Subject: ${listing.ai_pitch_subject}\n\n${listing.ai_pitch_body}`
      );
      toast({ title: "Copied to clipboard" });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={listing.priority} />
            <Badge variant={STATUS_VARIANTS[listing.status] || "outline"}>
              {listing.status}
            </Badge>
            {listing.land_type && (
              <Badge variant="secondary">
                {LAND_TYPE_LABELS[listing.land_type] || listing.land_type}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg">{listing.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {listing.city}, {listing.state} · {formatAcres(listing.acreage)} ·{" "}
            {formatCurrency(listing.price)}
          </p>
        </DialogHeader>

        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Opportunity Score</p>
          <OpportunityBar score={listing.opportunity_score || 0} />
          <div className="mt-2">
            <FlagPills flags={listing.opportunity_flags} />
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t">
          <Select
            value={listing.status}
            onValueChange={(val) => onStatusChange(listing.id, val)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => onConvertToMission(listing)}
            variant="default"
            size="sm"
            className="gap-1.5"
            disabled={listing.status === "booked"}
          >
            <Plane className="h-4 w-4" />
            {listing.status === "booked" ? "Mission Created" : "Convert to Mission"}
          </Button>

          <div className="flex-1" />

          <Button asChild variant="outline" size="sm">
            <a href={listing.source_url} target="_blank" rel="noopener noreferrer">
              View Listing <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pitch">Pitch</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={DollarSign} label="Price" value={formatCurrency(listing.price)} />
              <InfoRow icon={DollarSign} label="Price/Acre" value={formatCurrency(listing.price_per_acre)} />
              <InfoRow icon={Ruler} label="Acreage" value={formatAcres(listing.acreage)} />
              <InfoRow
                icon={Camera}
                label="Photos"
                value={`${listing.photo_count || 0} (Quality: ${listing.photo_quality_score || 0}/100)`}
              />
              <InfoRow
                icon={Eye}
                label="Has Aerial"
                value={listing.has_aerial_photos ? "Yes" : "No"}
              />
              <InfoRow
                icon={Clock}
                label="First Seen"
                value={formatDistanceToNow(new Date(listing.first_seen_at), { addSuffix: true })}
              />
            </div>

            {(listing.listing_agent_name || listing.listing_agent_company) && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Listing Agent</p>
                  {listing.listing_agent_name && (
                    <p className="text-sm font-medium">{listing.listing_agent_name}</p>
                  )}
                  {listing.listing_agent_company && (
                    <p className="text-xs text-muted-foreground">{listing.listing_agent_company}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pitch">
            {listing.ai_pitch_body ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <Card>
                    <CardContent className="py-3 text-sm font-medium">
                      {listing.ai_pitch_subject}
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email Body</p>
                  <Card>
                    <CardContent className="py-3 text-sm whitespace-pre-wrap leading-relaxed">
                      {listing.ai_pitch_body}
                    </CardContent>
                  </Card>
                </div>
                <Button onClick={copyPitch} variant="outline" size="sm">
                  <Copy className="mr-2 h-3 w-3" /> Copy to Clipboard
                </Button>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No AI pitch generated for this listing yet.</p>
                <p className="text-xs mt-1">
                  Pitches are auto-generated for listings with opportunity score &ge; 60.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="outreach">
            <div className="text-center py-10 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                {listing.outreach_count > 0
                  ? `${listing.outreach_count} outreach records`
                  : "No outreach logged yet."}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───

export default function LandMonitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedListing, setSelectedListing] = useState<LandListing | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("opportunity");
  const [isScanning, setIsScanning] = useState(false);

  // Fetch listings from the view
  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["land-listings", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("land_listing_opportunities" as "land_listings")
        .select("*");

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("land_type", typeFilter);
      }

      const { data, error } = await query.order("opportunity_score", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LandListing[];
    },
  });

  // Fetch recent jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ["land-monitor-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("land_monitor_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as unknown as MonitorJob[];
    },
  });

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    return {
      total: listings.length,
      newToday: listings.filter((l) => l.first_seen_at >= todayStr).length,
      highOpp: listings.filter((l) => (l.opportunity_score || 0) >= 60).length,
      contacted: listings.filter((l) => l.status === "contacted").length,
    };
  }, [listings]);

  // Sort
  const sortedListings = useMemo(() => {
    const list = [...listings];
    if (sortBy === "opportunity") list.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
    if (sortBy === "price") list.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === "acreage") list.sort((a, b) => (b.acreage || 0) - (a.acreage || 0));
    if (sortBy === "newest") list.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
    return list;
  }, [listings, sortBy]);

  const navigate = useNavigate();

  const handleStatusChange = async (listingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("land_listings" as any)
        .update({ status: newStatus })
        .eq("id", listingId);
      if (error) throw error;
      toast({ title: `Status updated to ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: ["land-listings"] });
      if (selectedListing?.id === listingId) {
        setSelectedListing({ ...selectedListing, status: newStatus });
      }
    } catch (err) {
      toast({
        title: "Update failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleConvertToMission = async (listing: LandListing) => {
    try {
      const address = listing.title || "Unknown Address";
      const jobNumber = `SAI-LM-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from("drone_jobs")
        .insert({
          job_number: jobNumber,
          property_address: address,
          property_city: listing.city || "",
          property_state: listing.state || "VA",
          property_type: "land",
          status: "intake" as any,
          admin_notes: [
            `Converted from Land Monitor listing (score: ${listing.opportunity_score || 0})`,
            listing.acreage ? `Acreage: ${listing.acreage}` : null,
            listing.price ? `Listing price: $${listing.price.toLocaleString()}` : null,
            listing.listing_agent_name ? `Agent: ${listing.listing_agent_name}` : null,
            listing.listing_agent_company ? `Company: ${listing.listing_agent_company}` : null,
            `Source: ${listing.source_url}`,
          ].filter(Boolean).join("\n"),
          is_test: false,
          weather_hold: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update listing status to booked
      await supabase
        .from("land_listings" as any)
        .update({ status: "booked" })
        .eq("id", listing.id);

      queryClient.invalidateQueries({ queryKey: ["land-listings"] });

      toast({
        title: "Mission created",
        description: `${jobNumber} — ${address}`,
      });

      // Navigate to the new job
      if (data?.id) {
        onClose();
        navigate(`/admin/drone-jobs/${data.id}`);
      }
    } catch (err) {
      toast({
        title: "Failed to create mission",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  // Wrap onClose for navigate access
  const onClose = () => setSelectedListing(null);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-land-listings", {
        body: { manual: true, max_results_per_source: 20 },
      });
      if (error) throw error;
      toast({
        title: "Scan complete",
        description: `Found ${data?.stats?.new_listings || 0} new listings, ${data?.stats?.high_opportunity || 0} high opportunity.`,
      });
      queryClient.invalidateQueries({ queryKey: ["land-listings"] });
      queryClient.invalidateQueries({ queryKey: ["land-monitor-jobs"] });
    } catch (err) {
      toast({
        title: "Scan failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Satellite className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">Land Listing Monitor</h1>
                <p className="text-sm opacity-75">
                  Find land listings that need drone aerial photography
                </p>
              </div>
            </div>
            <Button
              onClick={handleScan}
              disabled={isScanning}
              variant="secondary"
              className="gap-2"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Scan Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Listings" value={stats.total} sub="active listings" icon={MapPin} />
          <StatCard label="New Today" value={stats.newToday} sub="found in latest scan" icon={TrendingUp} />
          <StatCard label="High Opportunity" value={stats.highOpp} sub="score ≥ 60" icon={AlertCircle} />
          <StatCard label="Contacted" value={stats.contacted} sub="outreach in progress" icon={Users} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Land Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Land Types</SelectItem>
              {Object.entries(LAND_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opportunity">Sort: Opportunity Score</SelectItem>
              <SelectItem value="price">Sort: Price (High → Low)</SelectItem>
              <SelectItem value="acreage">Sort: Acreage (High → Low)</SelectItem>
              <SelectItem value="newest">Sort: Newest First</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {sortedListings.length} listings
          </span>
        </div>

        {/* Listings */}
        {listingsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedListings.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Satellite className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No listings found</p>
              <p className="text-sm mt-1">Run a scan to discover land listings in your target markets.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedListings.map((listing) => (
              <Card
                key={listing.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{
                  borderLeftColor:
                    listing.status === "new"
                      ? "hsl(var(--primary))"
                      : listing.status === "contacted"
                        ? "hsl(var(--chart-4))"
                        : listing.status === "booked"
                          ? "hsl(var(--chart-2))"
                          : "hsl(var(--border))",
                }}
                onClick={() => setSelectedListing(listing)}
              >
                <CardContent className="py-3 px-4">
                  <div className="grid grid-cols-[1fr_100px_80px_90px_140px] items-center gap-4">
                    {/* Title & meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PriorityDot priority={listing.priority} />
                        <span className="text-sm font-semibold truncate">
                          {listing.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {listing.land_type && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {LAND_TYPE_LABELS[listing.land_type] || listing.land_type}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {listing.city}, {listing.state}
                        </span>
                        {listing.source_name && (
                          <span className="text-[11px] text-muted-foreground/60">
                            · {listing.source_name}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <FlagPills flags={listing.opportunity_flags} />
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatCurrency(listing.price)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatAcres(listing.acreage)}
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="text-center">
                      <div
                        className={`text-sm font-semibold ${
                          (listing.photo_count || 0) === 0
                            ? "text-red-500"
                            : (listing.photo_count || 0) < 3
                              ? "text-amber-500"
                              : "text-green-500"
                        }`}
                      >
                        {(listing.photo_count || 0) === 0
                          ? "None"
                          : listing.photo_count}
                      </div>
                      {!listing.has_aerial_photos && (
                        <div className="text-[10px] text-red-500">No aerial</div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      <Badge variant={STATUS_VARIANTS[listing.status] || "outline"}>
                        {listing.status}
                      </Badge>
                    </div>

                    {/* Opportunity */}
                    <OpportunityBar score={listing.opportunity_score || 0} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Scans */}
        {jobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">New</TableHead>
                    <TableHead className="text-center">High Opp</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-sm">
                        {job.started_at
                          ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{job.job_type}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={job.status === "completed" ? "default" : "destructive"}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {job.new_listings_found ?? "—"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-amber-600">
                        {job.high_opportunity_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {job.api_cost != null ? `$${Number(job.api_cost).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {job.duration_seconds != null ? `${job.duration_seconds}s` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          onClose={onClose}
          onStatusChange={handleStatusChange}
          onConvertToMission={handleConvertToMission}
        />
      )}
    </div>
  );
}
