import { useMemo, useState } from "react";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Target, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  useBdStats,
  useBdOpportunities,
  type BdTimeWindow,
  type KeyCount,
} from "@/hooks/useBdStats";
import { BdStatsHeader } from "@/components/admin/BdStatsHeader";

const TIME_WINDOWS: { value: BdTimeWindow; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "all", label: "All Time" },
];

// Theme-aware bar palette (repeats for longer lists).
const BAR_COLORS = [
  "hsl(var(--primary))",
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
  "#16a34a",
  "#db2777",
];

function HorizontalBarCard({
  title,
  subtitle,
  data,
  maxLabel = 28,
}: {
  title: string;
  subtitle?: string;
  data: KeyCount[];
  maxLabel?: number;
}) {
  const rows = data ?? [];
  const height = Math.max(160, rows.length * 30 + 20);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="key"
                width={140}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) =>
                  v.length > maxLabel ? `${v.slice(0, maxLabel)}…` : v
                }
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11 }}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelStrip({ stats }: { stats: ReturnType<typeof useBdStats>["data"] }) {
  const f = stats?.funnel;
  const steps = [
    { label: "Reviewed", value: f?.reviewed ?? 0 },
    { label: "Screened out", value: f?.screened_out ?? 0 },
    { label: "No-bid", value: f?.no_bid ?? 0 },
    { label: "Bidding", value: f?.bid ?? 0 },
    { label: "Submitted", value: f?.submitted ?? 0 },
    { label: "Won", value: f?.won ?? 0 },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Pipeline Funnel</CardTitle>
        <p className="text-xs text-muted-foreground">
          Bid / submitted / won populate once award tracking (Phase 2) lands
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {steps.map((s) => (
            <div key={s.label} className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  "sam.gov": "SAM.gov",
  eva: "eVA (VA)",
  bonfire: "Bonfire",
  "grants.gov": "Grants.gov",
  other: "Other",
};

export default function BdIntelligence() {
  const [timeWindow, setTimeWindow] = useState<BdTimeWindow>("all");
  const { data: stats, isLoading: statsLoading } = useBdStats(timeWindow);
  const { data: opportunities, isLoading: oppsLoading } = useBdOpportunities();

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (opportunities ?? []).filter((o) => {
      if (sourceFilter !== "all" && o.source !== sourceFilter) return false;
      if (decisionFilter !== "all") {
        if (decisionFilter === "unreviewed" ? o.decision : o.decision !== decisionFilter)
          return false;
      }
      if (q) {
        const hay = `${o.title} ${o.agency ?? ""} ${o.notice_id} ${o.naics_code ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [opportunities, search, sourceFilter, decisionFilter]);

  const decisionOptions = useMemo(() => {
    const set = new Set<string>();
    (opportunities ?? []).forEach((o) => o.decision && set.add(o.decision));
    return [...set].sort();
  }, [opportunities]);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Contract Intelligence</h1>
              <p className="text-muted-foreground">
                Federal, state/local &amp; grant opportunities — codes, geography, and pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {TIME_WINDOWS.map((w) => (
              <Button
                key={w.value}
                size="sm"
                variant={timeWindow === w.value ? "default" : "outline"}
                onClick={() => setTimeWindow(w.value)}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6">
          <BdStatsHeader stats={stats} isLoading={statsLoading} />
        </div>

        {/* Funnel */}
        <div className="mb-6">
          <FunnelStrip stats={stats} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <HorizontalBarCard title="By NAICS code" subtitle="Top codes in window" data={stats?.by_naics ?? []} />
          <HorizontalBarCard title="By PSC / classification code" subtitle="Top product & service codes" data={stats?.by_psc ?? []} />
          <HorizontalBarCard title="By agency" data={stats?.by_agency ?? []} />
          <HorizontalBarCard title="By place of performance (state)" data={stats?.by_state ?? []} />
          <HorizontalBarCard title="By set-aside" data={stats?.by_set_aside ?? []} />
          <HorizontalBarCard title="By source" data={stats?.by_source ?? []} maxLabel={20} />
        </div>

        {/* Opportunities table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg">
                Opportunities{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({filtered.length})
                </span>
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Search title, agency, NAICS…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56"
                />
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All decisions</SelectItem>
                    <SelectItem value="unreviewed">Unreviewed</SelectItem>
                    {decisionOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {oppsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Agency</TableHead>
                      <TableHead>NAICS</TableHead>
                      <TableHead>PSC</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No opportunities match these filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="max-w-xs">
                            <span className="line-clamp-2 text-sm">{o.title}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[10rem]">
                            <span className="line-clamp-2">{o.agency ?? "—"}</span>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">{o.naics_code ?? "—"}</TableCell>
                          <TableCell className="text-sm tabular-nums">{o.psc_code ?? "—"}</TableCell>
                          <TableCell className="text-sm">{o.place_state ?? "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {o.response_deadline
                              ? format(new Date(o.response_deadline), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {o.decision ? (
                              <Badge variant={o.decision === "SCREENED-OUT" ? "secondary" : "outline"}>
                                {o.decision}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">unreviewed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{SOURCE_LABELS[o.source] ?? o.source}</Badge>
                          </TableCell>
                          <TableCell>
                            {o.ui_link && (
                              <a href={o.ui_link} target="_blank" rel="noopener noreferrer"
                                className="text-primary hover:opacity-70" title="Open on source site">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
