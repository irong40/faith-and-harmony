import { useState } from "react";
import { useLeadStats, TimeWindow } from "@/hooks/useLeadStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const SOURCE_CHANNEL_LABELS: Record<string, string> = {
  voice_bot: "Voice Bot",
  web_form: "Web Form",
  manual: "Manual",
  email_outreach: "Email",
  social: "Social",
};

const SOURCE_CHANNEL_COLORS: Record<string, string> = {
  voice_bot: "bg-blue-500",
  web_form: "bg-violet-500",
  manual: "bg-slate-500",
  email_outreach: "bg-orange-500",
  social: "bg-pink-500",
};

export function formatResponseTime(hours: number): string {
  if (hours >= 48) {
    return `${(hours / 24).toFixed(1)}d`;
  }
  return `${hours.toFixed(1)}h`;
}

export function responseTimeColor(hours: number): string {
  if (hours < 24) return "text-green-600";
  if (hours < 48) return "text-amber-500";
  return "text-red-500";
}

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  week: "Week",
  month: "Month",
  all: "All Time",
};

export function LeadStatsHeader() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("month");
  const { data: stats, isLoading, isError } = useLeadStats(timeWindow);

  if (isError) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        {(["week", "month", "all"] as TimeWindow[]).map((w) => (
          <Button
            key={w}
            size="sm"
            variant={timeWindow === w ? "default" : "outline"}
            onClick={() => setTimeWindow(w)}
          >
            {TIME_WINDOW_LABELS[w]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Conversion Rate (ANLY-01) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stats ? `${stats.conversion.rate.toFixed(1)}%` : "0%"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {stats && stats.conversion.total > 0
                  ? `${stats.conversion.converted} of ${stats.conversion.total} leads`
                  : "No leads yet"}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Leads by Source (ANLY-02) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.by_source.length > 0 ? (
                <ul className="space-y-1.5">
                  {[...stats.by_source]
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                      <li key={item.source} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${SOURCE_CHANNEL_COLORS[item.source] ?? "bg-gray-400"}`}
                          />
                          <span className="text-muted-foreground">
                            {SOURCE_CHANNEL_LABELS[item.source] ?? item.source}
                          </span>
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No leads yet</p>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Average Response Time (ANLY-03) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.response_time.avg_hours > 0 ? (
                <>
                  <p className={`text-3xl font-bold ${responseTimeColor(stats.response_time.avg_hours)}`}>
                    {formatResponseTime(stats.response_time.avg_hours)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Hours to first contact</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-muted-foreground">—</p>
                  <p className="text-sm text-muted-foreground mt-1">No activity yet</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Revenue from Leads (ANLY-04) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lead Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {stats
                  ? `$${stats.revenue.total_revenue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "$0.00"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">From converted leads</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
