import { addDays } from "date-fns";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEPARTMENTS,
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
  type Department,
  type SourceSystem,
  type WorkItemFilters,
  type WorkItemPriority,
  type WorkItemStatus,
  type WorkItemType,
} from "@/types/command-center";

interface WorkFiltersProps {
  value: WorkItemFilters;
  onChange: (filters: WorkItemFilters) => void;
  now?: Date;
}

const selectClassName = "h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground outline-none ring-ring focus-visible:ring-2";

function compact(filters: WorkItemFilters): WorkItemFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as WorkItemFilters;
}

export default function WorkFilters({ value, onChange, now = new Date() }: WorkFiltersProps) {
  const change = (patch: Partial<WorkItemFilters>) => onChange(compact({ ...value, ...patch }));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/80 p-2.5 shadow-sm">
      <span className="flex items-center gap-1.5 px-1.5 text-xs font-semibold text-muted-foreground">
        <Filter className="size-3.5" />
        Filter
      </span>

      <select
        aria-label="Department filter"
        className={selectClassName}
        value={value.departments?.[0] ?? ""}
        onChange={(event) => change({
          departments: event.target.value ? [event.target.value as Department] : undefined,
        })}
      >
        <option value="">All departments</option>
        {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
      </select>

      <select
        aria-label="Type filter"
        className={selectClassName}
        value={value.types?.[0] ?? ""}
        onChange={(event) => change({
          types: event.target.value ? [event.target.value as WorkItemType] : undefined,
        })}
      >
        <option value="">All types</option>
        {WORK_ITEM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>

      <select
        aria-label="Status filter"
        className={selectClassName}
        value={value.statuses?.[0] ?? ""}
        onChange={(event) => change({
          statuses: event.target.value ? [event.target.value as WorkItemStatus] : undefined,
        })}
      >
        <option value="">All statuses</option>
        {WORK_ITEM_STATUSES.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
      </select>

      <select
        aria-label="Priority filter"
        className={selectClassName}
        value={value.priorities?.[0] ?? ""}
        onChange={(event) => change({
          priorities: event.target.value ? [event.target.value as WorkItemPriority] : undefined,
        })}
      >
        <option value="">All priorities</option>
        {WORK_ITEM_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>

      <select
        aria-label="Source filter"
        className={selectClassName}
        value={value.sourceSystem ?? ""}
        onChange={(event) => change({
          sourceSystem: event.target.value ? event.target.value as SourceSystem : undefined,
        })}
      >
        <option value="">All sources</option>
        <option value="crm">CRM</option>
        <option value="manual">Manual</option>
        <option value="agent">Agent</option>
        <option value="obsidian">Obsidian</option>
      </select>

      <select
        aria-label="Owner filter"
        className={selectClassName}
        value={value.ownerId === null ? "unassigned" : ""}
        onChange={(event) => change({ ownerId: event.target.value === "unassigned" ? null : undefined })}
      >
        <option value="">All owners</option>
        <option value="unassigned">Unassigned</option>
      </select>

      <select
        aria-label="Due filter"
        className={selectClassName}
        value={value.dueBefore ? "week" : ""}
        onChange={(event) => change({
          dueBefore: event.target.value === "week" ? addDays(now, 7).toISOString() : undefined,
        })}
      >
        <option value="">Any due date</option>
        <option value="week">Due in 7 days</option>
      </select>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto gap-1.5 text-xs"
        onClick={() => onChange({})}
      >
        <RotateCcw className="size-3.5" />
        Clear filters
      </Button>
    </div>
  );
}
