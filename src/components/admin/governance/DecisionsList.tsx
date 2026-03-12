import { useGovernanceDecisions } from "@/hooks/useGovernance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import DecisionLoggerDialog from "./DecisionLoggerDialog";

export default function DecisionsList() {
  const { data: decisions, isLoading, error } = useGovernanceDecisions();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Governance Decisions</CardTitle>
        <DecisionLoggerDialog />
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">
            Failed to load decisions: {(error as Error).message}
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !decisions?.length ? (
          <p className="text-sm text-muted-foreground">
            No decisions logged yet. Use the button above to record governance decisions.
          </p>
        ) : (
          <div className="space-y-4">
            {decisions.map((d) => (
              <Card key={d.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{d.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(d.decision_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {d.quarter && <Badge variant="secondary">{d.quarter}</Badge>}
                      {d.fiscal_year && (
                        <Badge variant="outline">FY{d.fiscal_year}</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm">{d.outcome}</p>

                  {d.action_items?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Action Items</p>
                      <ul className="list-disc list-inside text-sm space-y-0.5">
                        {d.action_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {d.participants?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Participants: {d.participants.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
