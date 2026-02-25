import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CheckCircle,
  Cog,
  FileCheck,
  PlaneTakeoff,
  Send,
  UserPlus,
  XCircle,
  Cloud,
} from "lucide-react";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface ActivityEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// -------------------------------------------------------
// Event icon + color by type
// -------------------------------------------------------
const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  mission_created: { icon: PlaneTakeoff, color: "text-blue-500" },
  mission_assigned: { icon: UserPlus, color: "text-indigo-500" },
  pipeline_started: { icon: Cog, color: "text-amber-500" },
  pipeline_complete: { icon: CheckCircle, color: "text-green-500" },
  pipeline_failed: { icon: XCircle, color: "text-red-500" },
  delivery_sent: { icon: Send, color: "text-blue-600" },
  delivery_confirmed: { icon: FileCheck, color: "text-green-600" },
  weather_checked: { icon: Cloud, color: "text-sky-500" },
  checklist_completed: { icon: CheckCircle, color: "text-teal-500" },
  pilot_added: { icon: UserPlus, color: "text-purple-500" },
};

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] ?? { icon: Activity, color: "text-muted-foreground" };
}

// -------------------------------------------------------
// ActivityFeed component
// -------------------------------------------------------
export default function ActivityFeed() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["activity-events"],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("id, event_type, entity_type, entity_id, actor_id, summary, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as ActivityEvent[];
    },
    staleTime: 60_000, // 60 second cache
    refetchInterval: 60_000, // auto-refresh every 60s
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Events will appear as missions are created and processed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const { icon: Icon, color } = getEventConfig(event.event_type);
              return (
                <div key={event.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 rounded-full bg-muted p-1.5 ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{event.summary}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------
// Utility: emit an activity event (call from action handlers)
// -------------------------------------------------------
export async function emitActivityEvent(params: {
  event_type: string;
  entity_type: string;
  entity_id?: string;
  actor_id?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await supabase.from("activity_events").insert({
    event_type: params.event_type,
    entity_type: params.entity_type,
    entity_id: params.entity_id ?? null,
    actor_id: params.actor_id ?? null,
    summary: params.summary,
    metadata: params.metadata ?? null,
  });
  // Silently ignore errors — activity feed is best-effort
}
