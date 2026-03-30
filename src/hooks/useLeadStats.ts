import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TimeWindow = "week" | "month" | "all";

export type SourceCount = {
  source: string;
  count: number;
};

export type LeadStats = {
  time_window: TimeWindow;
  conversion: {
    total: number;
    converted: number;
    rate: number;
  };
  by_source: SourceCount[];
  response_time: {
    avg_hours: number;
  };
  revenue: {
    total_revenue: number;
  };
};

export function useLeadStats(timeWindow: TimeWindow = "month") {
  return useQuery({
    queryKey: ["lead-stats", timeWindow],
    queryFn: async (): Promise<LeadStats> => {
      const { data, error } = await (supabase as any).rpc("lead_stats", {
        time_window: timeWindow,
      });
      if (error) throw error;
      return data as LeadStats;
    },
    staleTime: 30_000,
  });
}
