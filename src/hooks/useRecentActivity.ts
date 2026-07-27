import { useQuery } from "@tanstack/react-query";
import { loadRecentActivity } from "@/lib/command-center/recent-activity";

export const recentActivityKey = ["command-center", "recent-activity"] as const;

export function useRecentActivity() {
  return useQuery({
    queryKey: recentActivityKey,
    queryFn: () => loadRecentActivity(),
    staleTime: 30_000,
    refetchInterval: 2 * 60_000,
  });
}
