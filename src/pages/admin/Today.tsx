import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Sunrise,
  RefreshCw,
  ShoppingBag,
  BellRing,
  Inbox,
  Send,
  Plane,
  ArrowRight,
  MapPin,
  DollarSign,
} from "lucide-react";
import {
  type ZeitviewJob,
  SOURCE_LABELS,
  SOURCE_COLORS,
} from "@/lib/marketplace-offers";

// -------------------------------------------------------
// Row shapes
// -------------------------------------------------------
interface FollowUpRow {
  id: string;
  follow_up_at: string;
  content: string | null;
  lead_id: string;
  leads: { caller_name: string | null } | null;
}

interface QuoteRow {
  id: string;
  name: string;
  job_type: string | null;
  description: string | null;
  address: string | null;
  created_at: string;
}

interface ProposalRow {
  id: string;
  proposal_number: string;
  title: string;
  status: string;
  total: number;
  sent_at: string | null;
}

interface MissionRow {
  id: string;
  job_number: string;
  property_address: string;
  site_address: string | null;
  status: string;
  scheduled_date: string | null;
}

const OFFER_SELECT =
  "id, gmail_id, source, address, city, state, zip, flight_date, flight_time_start, flight_time_end, payout, partner_name, shot_list, instructions, upload_deadline, status, notes, direct_equiv_price, direct_equiv_package, drone_job_id, decided_at, awarded_outcome_at, created_at";

const ACTIVE_MISSION_STATUSES = [
  "intake",
  "scheduled",
  "captured",
  "uploaded",
  "ingested",
  "processing",
  "review_pending",
  "qa",
  "revision",
  "video_grading",
  "video_editing",
  "video_exporting",
  "photos_delivered",
  "paid",
];

function truncate(s: string | null | undefined, len = 80): string {
  if (!s) return "";
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

function locationLine(offer: ZeitviewJob): string {
  const parts = [offer.city, offer.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : offer.address ?? "Location TBD";
}

// -------------------------------------------------------
// Section shell
// -------------------------------------------------------
function CockpitSection({
  title,
  icon: Icon,
  count,
  to,
  ctaLabel,
  loading,
  empty,
  emptyText,
  accent,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  to: string;
  ctaLabel: string;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={accent && count > 0 ? "border-amber-400 border-2" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`h-5 w-5 ${accent && count > 0 ? "text-amber-500" : "text-primary"}`} />
            {title}
            <Badge
              className={
                count > 0
                  ? accent
                    ? "bg-amber-500 text-white"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }
            >
              {count}
            </Badge>
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link to={to}>
              {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : empty ? (
          <p className="text-sm text-muted-foreground py-2">{emptyText}</p>
        ) : (
          <div className="divide-y">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Today() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const todayIso = new Date().toISOString();

  // 1. Marketplace offers awaiting decision
  const offersQuery = useQuery({
    queryKey: ["cockpit", "offers"],
    queryFn: async () => {
      const res = await (supabase as never as { from: (t: string) => never })
        .from("zeitview_jobs")
        // @ts-expect-error untyped table — see src/lib/marketplace-offers.ts
        .select(OFFER_SELECT)
        .eq("status", "offered")
        .order("created_at", { ascending: false });
      const error = (res as { error: unknown }).error;
      if (error) throw error;
      return ((res as { data: unknown }).data ?? []) as ZeitviewJob[];
    },
    staleTime: 60 * 1000,
  });

  // 2. Follow-ups due (lead_notes.follow_up_at <= now)
  const followUpsQuery = useQuery({
    queryKey: ["cockpit", "followups"],
    queryFn: async () => {
      const res = await (supabase as never as { from: (t: string) => never })
        .from("lead_notes")
        // @ts-expect-error untyped relation join
        .select("id, follow_up_at, content, lead_id, leads ( caller_name )")
        .not("follow_up_at", "is", null)
        .lte("follow_up_at", todayIso)
        .order("follow_up_at", { ascending: true });
      const error = (res as { error: unknown }).error;
      if (error) throw error;
      return ((res as { data: unknown }).data ?? []) as FollowUpRow[];
    },
    staleTime: 60 * 1000,
  });

  // 3. New quote requests (status new, excluding test_data / spam)
  const quotesQuery = useQuery({
    queryKey: ["cockpit", "quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, name, job_type, description, address, created_at, status")
        .eq("status", "new")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Defensive client-side filter in case status vocab drifts.
      return ((data ?? []) as unknown as (QuoteRow & { status: string })[]).filter(
        (q) => q.status !== "test_data" && q.status !== "spam"
      );
    },
    staleTime: 60 * 1000,
  });

  // 4. Open proposals (sent, viewed)
  const proposalsQuery = useQuery({
    queryKey: ["cockpit", "proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, proposal_number, title, status, total, sent_at")
        .in("status", ["sent", "viewed"])
        .is("archived_at", null)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProposalRow[];
    },
    staleTime: 60 * 1000,
  });

  // 5. Jobs in flight (drone_jobs not complete/delivered/cancelled)
  const missionsQuery = useQuery({
    queryKey: ["cockpit", "missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_jobs")
        .select("id, job_number, property_address, site_address, status, scheduled_date")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in("status", ACTIVE_MISSION_STATUSES as any)
        .eq("is_test", false)
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as MissionRow[];
    },
    staleTime: 60 * 1000,
  });

  const offers = offersQuery.data ?? [];
  const followUps = followUpsQuery.data ?? [];
  const quotes = quotesQuery.data ?? [];
  const proposals = proposalsQuery.data ?? [];
  const missions = missionsQuery.data ?? [];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["cockpit"] });
    toast({ title: "Cockpit refreshed" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sunrise className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{greeting}, here's today</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refreshAll} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Marketplace offers — most prominent, spans full width */}
          <div className="lg:col-span-2">
            <CockpitSection
              title="Marketplace Offers Awaiting Decision"
              icon={ShoppingBag}
              count={offers.length}
              to="/admin/marketplace-offers"
              ctaLabel="Open offers"
              loading={offersQuery.isLoading}
              empty={offers.length === 0}
              emptyText="No marketplace offers waiting. You're all caught up."
              accent
            >
              {offers.map((offer) => (
                <Link
                  key={offer.id}
                  to="/admin/marketplace-offers"
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={SOURCE_COLORS[offer.source] ?? "bg-gray-400 text-white"}>
                      {SOURCE_LABELS[offer.source] ?? offer.source}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {offer.partner_name || offer.address || "Marketplace job"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {locationLine(offer)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold whitespace-nowrap">
                    <DollarSign className="h-3.5 w-3.5 text-green-600" />
                    {offer.payout != null ? offer.payout.toLocaleString() : "—"}
                  </div>
                </Link>
              ))}
            </CockpitSection>
          </div>

          {/* 2. Follow-ups due */}
          <CockpitSection
            title="Follow-ups Due"
            icon={BellRing}
            count={followUps.length}
            to="/admin/leads"
            ctaLabel="View leads"
            loading={followUpsQuery.isLoading}
            empty={followUps.length === 0}
            emptyText="No follow-ups due today."
          >
            {followUps.map((fu) => (
              <Link
                key={fu.id}
                to="/admin/leads"
                className="block py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {fu.leads?.caller_name || "Lead"}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(fu.follow_up_at), "MMM d")}
                  </span>
                </div>
                {fu.content && (
                  <p className="text-xs text-muted-foreground truncate">{truncate(fu.content, 70)}</p>
                )}
              </Link>
            ))}
          </CockpitSection>

          {/* 3. New quote requests */}
          <CockpitSection
            title="New Quote Requests"
            icon={Inbox}
            count={quotes.length}
            to="/admin/quote-requests"
            ctaLabel="View quotes"
            loading={quotesQuery.isLoading}
            empty={quotes.length === 0}
            emptyText="No new quote requests."
          >
            {quotes.map((q) => (
              <Link
                key={q.id}
                to="/admin/quote-requests"
                className="block py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{q.name}</p>
                  {q.job_type && (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {q.job_type}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {truncate(q.description) || <span className="italic">No description provided</span>}
                </p>
                {q.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {q.address}
                  </p>
                )}
              </Link>
            ))}
          </CockpitSection>

          {/* 4. Open proposals */}
          <CockpitSection
            title="Open Proposals"
            icon={Send}
            count={proposals.length}
            to="/admin/proposals"
            ctaLabel="View proposals"
            loading={proposalsQuery.isLoading}
            empty={proposals.length === 0}
            emptyText="No open proposals."
          >
            {proposals.map((p) => (
              <Link
                key={p.id}
                to="/admin/proposals"
                className="flex items-center justify-between gap-2 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.title || p.proposal_number}</p>
                  <p className="text-xs text-muted-foreground">{p.proposal_number}</p>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Badge className={p.status === "viewed" ? "bg-purple-500 text-white" : "bg-blue-500 text-white"}>
                    {p.status}
                  </Badge>
                  <span className="text-sm font-medium">${p.total?.toLocaleString() ?? 0}</span>
                </div>
              </Link>
            ))}
          </CockpitSection>

          {/* 5. Jobs in flight */}
          <CockpitSection
            title="Jobs in Flight"
            icon={Plane}
            count={missions.length}
            to="/admin/drone-jobs"
            ctaLabel="View jobs"
            loading={missionsQuery.isLoading}
            empty={missions.length === 0}
            emptyText="No active missions."
          >
            {missions.map((m) => (
              <Link
                key={m.id}
                to={`/admin/drone-jobs/${m.id}`}
                className="flex items-center justify-between gap-2 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.site_address || m.property_address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.job_number}
                    {m.scheduled_date ? ` · ${format(new Date(m.scheduled_date.length <= 10 ? `${m.scheduled_date}T00:00:00` : m.scheduled_date), "MMM d")}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize whitespace-nowrap">
                  {m.status.replace(/_/g, " ")}
                </Badge>
              </Link>
            ))}
          </CockpitSection>
        </div>
      </div>
    </div>
  );
}
