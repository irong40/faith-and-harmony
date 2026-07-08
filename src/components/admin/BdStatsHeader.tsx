import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { BdStats } from "@/hooks/useBdStats";

interface BdStatsHeaderProps {
  stats: BdStats | undefined;
  isLoading: boolean;
}

// Presentational stat-card grid. The page owns the time-window so these cards
// and the charts below share one window. Mirrors LeadStatsHeader's card styling.
export function BdStatsHeader({ stats, isLoading }: BdStatsHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const f = stats?.funnel;
  const inPlay = (f?.bid ?? 0) + (f?.submitted ?? 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Reviewed in window */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Opportunities Reviewed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{f?.reviewed ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {(f?.screened_out ?? 0)} screened out, {(f?.no_bid ?? 0)} no-bid
          </p>
        </CardContent>
      </Card>

      {/* Open now (current state) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Open Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{stats?.open_now ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Deadline still ahead</p>
        </CardContent>
      </Card>

      {/* In play — bidding / submitted */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            In Play
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{inPlay}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {(f?.bid ?? 0)} bidding, {(f?.submitted ?? 0)} submitted
          </p>
        </CardContent>
      </Card>

      {/* Win rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          {f && f.won + f.lost > 0 ? (
            <>
              <p className="text-3xl font-bold text-green-600">
                {(stats?.win_rate ?? 0).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {f.won} of {f.won + f.lost} decided
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-muted-foreground">—</p>
              <p className="text-sm text-muted-foreground mt-1">No awards decided yet</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
