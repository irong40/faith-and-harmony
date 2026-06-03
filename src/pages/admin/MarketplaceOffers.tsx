import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  RefreshCw,
  MapPin,
  CalendarClock,
  ListChecks,
  FileText,
  Upload,
  DollarSign,
  ExternalLink,
  Lock,
  CheckCircle2,
  XCircle,
  Award,
  Ban,
  ArrowRight,
} from "lucide-react";
import {
  type ZeitviewJob,
  type OfferStatus,
  type PackagePrice,
  computeDirectEquivalent,
  OFFER_STATUS_LABELS,
  OFFER_STATUS_COLORS,
  SOURCE_LABELS,
  SOURCE_COLORS,
  OFFER_STATUS_ORDER,
} from "@/lib/marketplace-offers";

const OFFER_SELECT =
  "id, gmail_id, source, address, city, state, zip, flight_date, flight_time_start, flight_time_end, payout, partner_name, shot_list, instructions, upload_deadline, status, notes, direct_equiv_price, direct_equiv_package, drone_job_id, decided_at, awarded_outcome_at, created_at";

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "TBD";
  // flight_date may be a date-only string; render robustly.
  const parsed = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (isNaN(parsed.getTime())) return d;
  return format(parsed, "EEE MMM d, yyyy");
}

function fmtTimeWindow(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const trim = (t: string | null) => (t ? t.replace(/:00$/, "").slice(0, 5) : "");
  if (start && end) return `${trim(start)}–${trim(end)}`;
  return trim(start || end);
}

function locationLine(offer: ZeitviewJob): string {
  const parts = [offer.address, offer.city, offer.state, offer.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Location TBD";
}

// -------------------------------------------------------
// Direct-equivalent internal block
// -------------------------------------------------------
function DirectEquivalentBlock({
  offer,
  packages,
}: {
  offer: ZeitviewJob;
  packages: PackagePrice[];
}) {
  // If a value was already stored at accept-time, prefer showing that,
  // otherwise compute live.
  const computed = computeDirectEquivalent(offer, packages);
  const storedPrice = offer.direct_equiv_price;
  const storedPackage = offer.direct_equiv_package;
  const price = storedPrice ?? computed.price;
  const packageName = storedPackage ?? computed.packageName;
  const payout = offer.payout ?? 0;
  const boardTake = price == null ? null : Math.round((price - payout) * 100) / 100;

  return (
    <div className="mt-3 rounded-md border border-dashed border-amber-300 bg-amber-50/60 p-3">
      <div className="flex items-center gap-1.5 text-amber-800">
        <Lock className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Internal — decision data only. Not shown to clients.
        </span>
      </div>
      <p className="mt-1.5 text-sm">
        Direct-equivalent:{" "}
        <span className="font-semibold">{fmtMoney(price)}</span>{" "}
        <span className="text-muted-foreground">({packageName})</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Board take:{" "}
        {boardTake == null ? (
          <span className="italic">n/a</span>
        ) : (
          <span className={boardTake >= 0 ? "font-medium text-green-700" : "font-medium text-red-700"}>
            {fmtMoney(price)} − {fmtMoney(payout)} = {fmtMoney(boardTake)}
          </span>
        )}
      </p>
    </div>
  );
}

// -------------------------------------------------------
// Single offer card
// -------------------------------------------------------
function OfferCard({
  offer,
  packages,
  onAction,
  pending,
}: {
  offer: ZeitviewJob;
  packages: PackagePrice[];
  onAction: (action: OfferAction, offer: ZeitviewJob) => void;
  pending: boolean;
}) {
  const timeWindow = fmtTimeWindow(offer.flight_time_start, offer.flight_time_end);
  const isFlyGuysSparse =
    offer.source === "flyguys" &&
    !offer.shot_list &&
    !offer.instructions &&
    !offer.payout;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={SOURCE_COLORS[offer.source] ?? "bg-gray-400 text-white"}>
              {SOURCE_LABELS[offer.source] ?? offer.source}
            </Badge>
            {offer.partner_name && (
              <span className="text-sm text-muted-foreground">{offer.partner_name}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-lg font-bold text-foreground whitespace-nowrap">
            <DollarSign className="h-4 w-4 text-green-600" />
            {offer.payout != null ? offer.payout.toLocaleString() : "—"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <span>{locationLine(offer)}</span>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <span>
            {fmtDate(offer.flight_date)}
            {timeWindow ? ` · ${timeWindow}` : ""}
          </span>
        </div>
        {offer.upload_deadline && (
          <div className="flex items-start gap-2">
            <Upload className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Upload by {fmtDate(offer.upload_deadline)}</span>
          </div>
        )}

        {isFlyGuysSparse ? (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Details in FlyGuys portal</p>
            <a
              href="https://pilots.flyguys.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              pilots.flyguys.com <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <>
            {offer.shot_list && (
              <div className="flex items-start gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap">{offer.shot_list}</span>
              </div>
            )}
            {offer.instructions && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap text-muted-foreground">{offer.instructions}</span>
              </div>
            )}
          </>
        )}

        {/* Internal decision block */}
        <DirectEquivalentBlock offer={offer} packages={packages} />

        {/* State-machine actions */}
        <Separator className="my-2" />
        <div className="flex flex-wrap items-center gap-2">
          {offer.status === "offered" && (
            <>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={pending}
                onClick={() => onAction("accept", offer)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={pending}
                onClick={() => onAction("decline", offer)}
              >
                <XCircle className="h-3.5 w-3.5" /> Decline
              </Button>
            </>
          )}

          {offer.status === "accepted" && (
            <>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={pending}
                onClick={() => onAction("received", offer)}
              >
                <Award className="h-3.5 w-3.5" /> Job Received
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={pending}
                onClick={() => onAction("not_awarded", offer)}
              >
                <Ban className="h-3.5 w-3.5" /> Not Awarded
              </Button>
            </>
          )}

          {offer.status === "received" && offer.drone_job_id && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={`/admin/drone-jobs/${offer.drone_job_id}`}>
                View Mission <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}

          {(offer.status === "declined" || offer.status === "not_awarded") && (
            <Badge variant="outline" className="text-muted-foreground">
              Closed — {OFFER_STATUS_LABELS[offer.status]}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type OfferAction = "accept" | "decline" | "received" | "not_awarded";

interface OffersData {
  offers: ZeitviewJob[];
  packages: PackagePrice[];
}

export default function MarketplaceOffers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<OffersData>({
    queryKey: ["marketplace-offers"],
    queryFn: async () => {
      const [offersRes, pkgRes] = await Promise.all([
        (supabase as never as { from: (t: string) => never })
          .from("zeitview_jobs")
          // @ts-expect-error untyped table — see marketplace-offers.ts note
          .select(OFFER_SELECT)
          .order("created_at", { ascending: false }),
        supabase
          .from("drone_packages")
          .select("code, category, name, price")
          .eq("active", true),
      ]);
      const offersErr = (offersRes as { error: unknown }).error;
      if (offersErr) throw offersErr;
      const pkgErr = (pkgRes as { error: unknown }).error;
      const packages = pkgErr ? [] : ((pkgRes.data ?? []) as unknown as PackagePrice[]);
      return {
        offers: ((offersRes as { data: unknown }).data ?? []) as ZeitviewJob[],
        packages,
      };
    },
    staleTime: 60 * 1000,
  });

  const offers = useMemo(() => data?.offers ?? [], [data]);
  const packages = useMemo(() => data?.packages ?? [], [data]);

  const grouped = useMemo(() => {
    const map: Record<OfferStatus, ZeitviewJob[]> = {
      offered: [],
      accepted: [],
      received: [],
      not_awarded: [],
      declined: [],
    };
    for (const o of offers) {
      (map[o.status] ?? map.offered).push(o);
    }
    return map;
  }, [offers]);

  const mutation = useMutation({
    mutationFn: async ({ action, offer }: { action: OfferAction; offer: ZeitviewJob }) => {
      const now = new Date().toISOString();
      const sb = supabase as never as {
        from: (t: string) => never;
      };

      if (action === "accept") {
        const equiv = computeDirectEquivalent(offer, packages);
        // @ts-expect-error untyped table
        const { error } = await sb
          .from("zeitview_jobs")
          .update({
            status: "accepted",
            decided_at: now,
            direct_equiv_price: equiv.price,
            direct_equiv_package: equiv.packageName,
          })
          .eq("id", offer.id);
        if (error) throw error;
        return;
      }

      if (action === "decline") {
        // @ts-expect-error untyped table
        const { error } = await sb
          .from("zeitview_jobs")
          .update({ status: "declined", decided_at: now })
          .eq("id", offer.id);
        if (error) throw error;
        return;
      }

      if (action === "not_awarded") {
        // @ts-expect-error untyped table
        const { error } = await sb
          .from("zeitview_jobs")
          .update({ status: "not_awarded", awarded_outcome_at: now })
          .eq("id", offer.id);
        if (error) throw error;
        return;
      }

      // action === "received": create a drone_jobs row, then link it back.
      const payload = {
        property_address: offer.address ?? locationLine(offer),
        site_address: offer.address ?? locationLine(offer),
        property_city: offer.city ?? null,
        property_state: offer.state ?? null,
        property_zip: offer.zip ?? null,
        scheduled_date: offer.flight_date ?? null,
        scheduled_time: offer.flight_time_start ?? null,
        job_price: offer.payout ?? null,
        status: "scheduled" as const,
        source_platform: offer.source,
        admin_notes: `Marketplace job from ${SOURCE_LABELS[offer.source] ?? offer.source}${
          offer.partner_name ? ` (${offer.partner_name})` : ""
        }. ${offer.instructions ?? ""}`.trim(),
        job_number: "",
      };

      const { data: jobData, error: jobErr } = await supabase
        .from("drone_jobs")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any)
        .select("id")
        .single();
      if (jobErr) throw jobErr;
      const droneJobId = (jobData as { id: string }).id;

      // @ts-expect-error untyped table
      const { error: linkErr } = await sb
        .from("zeitview_jobs")
        .update({
          status: "received",
          awarded_outcome_at: now,
          drone_job_id: droneJobId,
        })
        .eq("id", offer.id);
      if (linkErr) throw linkErr;
    },

    // Optimistic update with rollback.
    onMutate: async ({ action, offer }) => {
      await queryClient.cancelQueries({ queryKey: ["marketplace-offers"] });
      const prev = queryClient.getQueryData<OffersData>(["marketplace-offers"]);
      const nextStatus: OfferStatus =
        action === "accept"
          ? "accepted"
          : action === "decline"
            ? "declined"
            : action === "received"
              ? "received"
              : "not_awarded";
      queryClient.setQueryData<OffersData>(["marketplace-offers"], (old) => {
        if (!old) return old;
        return {
          ...old,
          offers: old.offers.map((o) =>
            o.id === offer.id ? { ...o, status: nextStatus } : o
          ),
        };
      });
      return { prev };
    },
    onError: (err: Error, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["marketplace-offers"], context.prev);
      }
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
    onSuccess: (_data, { action }) => {
      const labels: Record<OfferAction, string> = {
        accept: "Offer accepted — awaiting board",
        decline: "Offer declined",
        received: "Job received — mission created",
        not_awarded: "Marked not awarded",
      };
      toast({ title: labels[action] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-offers"] });
      queryClient.invalidateQueries({ queryKey: ["cockpit"] });
    },
  });

  const handleAction = (action: OfferAction, offer: ZeitviewJob) => {
    mutation.mutate({ action, offer });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Marketplace Offers</h1>
              <p className="text-sm text-muted-foreground">
                Zeitview &amp; FlyGuys jobs — accept, decline, and track board awards
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["marketplace-offers"] })}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-40" />
            No marketplace offers yet.
          </div>
        ) : (
          <div className="space-y-8">
            {OFFER_STATUS_ORDER.map((status) => {
              const list = grouped[status];
              if (list.length === 0) return null;
              return (
                <section key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={OFFER_STATUS_COLORS[status]}>
                      {OFFER_STATUS_LABELS[status]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{list.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        packages={packages}
                        onAction={handleAction}
                        pending={mutation.isPending}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
