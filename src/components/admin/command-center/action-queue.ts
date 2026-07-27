import { isBefore } from "date-fns";
import {
  AlertTriangle,
  Ban,
  CircleAlert,
  ShieldQuestion,
} from "lucide-react";
import { isTerminalWorkStatus, type WorkItem } from "@/types/command-center";

export interface ActionReason {
  label: string;
  rank: number;
  icon: typeof AlertTriangle;
  className: string;
  action: string;
}

const priorityRank: Record<WorkItem["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function getActionReason(item: WorkItem, now: Date): ActionReason | null {
  if (
    item.due_at
    && !isTerminalWorkStatus(item.status)
    && isBefore(new Date(item.due_at), now)
  ) {
    return {
      label: "Overdue",
      rank: 0,
      icon: CircleAlert,
      className: "border-rose-200 bg-rose-50 text-rose-800",
      action: "Open",
    };
  }

  if (item.status === "blocked" || item.item_type === "blocker") {
    return {
      label: "Blocked",
      rank: 1,
      icon: Ban,
      className: "border-orange-200 bg-orange-50 text-orange-800",
      action: "Resolve",
    };
  }

  if (item.status === "needs_approval") {
    return {
      label: "Approval needed",
      rank: 2,
      icon: ShieldQuestion,
      className: "border-amber-200 bg-amber-50 text-amber-900",
      action: "Review",
    };
  }

  if (item.item_type === "risk") {
    return {
      label: "Risk review",
      rank: 3,
      icon: AlertTriangle,
      className: "border-yellow-200 bg-yellow-50 text-yellow-900",
      action: "Review",
    };
  }

  if (item.item_type === "decision") {
    return {
      label: "Decision needed",
      rank: 3,
      icon: ShieldQuestion,
      className: "border-violet-200 bg-violet-50 text-violet-900",
      action: "Decide",
    };
  }

  return null;
}

export function sortOwnerActionItems(items: readonly WorkItem[], now = new Date()): WorkItem[] {
  return items
    .map((item) => ({ item, reason: getActionReason(item, now) }))
    .filter((entry): entry is { item: WorkItem; reason: ActionReason } => Boolean(entry.reason))
    .sort((a, b) => (
      a.reason.rank - b.reason.rank
      || priorityRank[a.item.priority] - priorityRank[b.item.priority]
      || (a.item.due_at ?? "9999").localeCompare(b.item.due_at ?? "9999")
      || a.item.created_at.localeCompare(b.item.created_at)
    ))
    .map(({ item }) => item);
}
