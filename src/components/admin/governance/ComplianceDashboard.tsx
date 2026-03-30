import { useComplianceObligations } from "@/hooks/useGovernance";
import type { ComplianceStatus } from "@/types/governance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const STATUS_COLORS: Record<ComplianceStatus, string> = {
  pending: "bg-slate-500",
  in_progress: "bg-blue-500",
  complete: "bg-green-500",
  overdue: "bg-red-500",
  waived: "bg-gray-400",
};

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  complete: "Complete",
  overdue: "Overdue",
  waived: "Waived",
};

export default function ComplianceDashboard() {
  const { data: obligations, isLoading, error } = useComplianceObligations();

  const statusCounts = obligations?.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const summaryParts = statusCounts
    ? Object.entries(statusCounts)
        .map(([status, count]) => `${count} ${STATUS_LABELS[status as ComplianceStatus]?.toLowerCase() ?? status}`)
        .join(", ")
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Obligations</CardTitle>
        {summaryParts && (
          <p className="text-sm text-muted-foreground">{summaryParts}</p>
        )}
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">Failed to load compliance data: {(error as Error).message}</p>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !obligations?.length ? (
          <p className="text-sm text-muted-foreground">No compliance obligations found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obligation</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligations.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.obligation_name}</TableCell>
                  <TableCell>{o.category}</TableCell>
                  <TableCell>{format(new Date(o.due_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[o.status]} text-white`}>
                      {STATUS_LABELS[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{o.owner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
