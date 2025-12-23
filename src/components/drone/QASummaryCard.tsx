import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle, Clock, Camera, RefreshCw } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface QASummaryCardProps {
  summary: Json;
  editBudgetMinutes: number;
}

interface BatchSummary {
  total_assets: number;
  passed: number;
  warnings: number;
  failed: number;
  overall_score: number;
  recommendation: string;
  edit_budget_used_minutes: number;
  edit_budget_remaining_minutes: number;
  missing_shots: string[];
  common_issues: { type: string; count: number }[];
  client_message: string;
}

const RECOMMENDATION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  deliver_as_planned: { label: "Deliver as Planned", color: "bg-green-500", icon: CheckCircle },
  extended_processing: { label: "Extended Processing", color: "bg-amber-500", icon: Clock },
  partial_reshoot: { label: "Partial Reshoot", color: "bg-orange-500", icon: RefreshCw },
  full_reshoot: { label: "Full Reshoot", color: "bg-red-500", icon: XCircle },
  incomplete_package: { label: "Incomplete Package", color: "bg-red-500", icon: AlertTriangle },
};

export default function QASummaryCard({ summary, editBudgetMinutes }: QASummaryCardProps) {
  const data = summary as unknown as BatchSummary;
  
  if (!data || typeof data !== 'object') {
    return null;
  }

  const budgetUsedPercent = Math.min(100, (data.edit_budget_used_minutes / editBudgetMinutes) * 100);
  const recConfig = RECOMMENDATION_CONFIG[data.recommendation] || RECOMMENDATION_CONFIG.deliver_as_planned;
  const RecIcon = recConfig.icon;

  return (
    <div className="space-y-4">
      {/* Main Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Batch Analysis</CardTitle>
            <Badge className={`${recConfig.color} text-white`}>
              <RecIcon className="mr-1 h-3 w-3" />
              {recConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            {/* Overall Score */}
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-foreground">{data.overall_score}</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>

            {/* Pass/Warn/Fail */}
            <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xl font-bold">{data.passed}</span>
                </div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xl font-bold">{data.warnings}</span>
                </div>
                <div className="text-xs text-muted-foreground">Warning</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xl font-bold">{data.failed}</span>
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Total Assets */}
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 justify-center">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-xl font-bold">{data.total_assets}</span>
              </div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
            </div>

            {/* Edit Budget */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Edit Budget</span>
              </div>
              <Progress value={budgetUsedPercent} className="h-2 mb-1" />
              <div className="text-xs text-muted-foreground">
                {data.edit_budget_used_minutes} / {editBudgetMinutes} min used
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Shots & Common Issues */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.missing_shots && data.missing_shots.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Missing Shots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {data.missing_shots.map((shot, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {shot.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.common_issues && data.common_issues.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Common Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.common_issues.map((issue, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{issue.type}</span>
                    <Badge variant="secondary">{issue.count}×</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Client Message */}
      {data.client_message && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suggested Client Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.client_message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
