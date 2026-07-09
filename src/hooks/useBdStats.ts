import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Windows the annual report goal needs ("reviewed N in <year>") plus the usual short views.
export type BdTimeWindow = "week" | "month" | "quarter" | "year" | "all";

export type KeyCount = { key: string; count: number };

export type BdStats = {
  time_window: BdTimeWindow;
  funnel: {
    reviewed: number;
    screened_out: number;
    no_bid: number;
    bid: number;
    submitted: number;
    won: number;
    lost: number;
  };
  win_rate: number;
  open_now: number;
  evaluated_this_week: number;
  by_source: KeyCount[];
  by_naics: KeyCount[];
  by_psc: KeyCount[];
  by_agency: KeyCount[];
  by_set_aside: KeyCount[];
  by_decision: KeyCount[];
  by_state: KeyCount[];
};

export function useBdStats(timeWindow: BdTimeWindow = "all") {
  return useQuery({
    queryKey: ["bd-stats", timeWindow],
    queryFn: async (): Promise<BdStats> => {
      const { data, error } = await (supabase as any).rpc("bd_stats", {
        time_window: timeWindow,
      });
      if (error) throw error;
      return data as BdStats;
    },
    staleTime: 30_000,
  });
}

export type BdOpportunity = {
  id: string;
  notice_id: string;
  source: string;
  title: string;
  agency: string | null;
  naics_code: string | null;
  psc_code: string | null;
  set_aside: string | null;
  place_state: string | null;
  response_deadline: string | null;
  decision: string | null;
  outcome: string;
  ui_link: string | null;
};

// Recent opportunities for the table. Filtering is done client-side in the page.
export function useBdOpportunities() {
  return useQuery({
    queryKey: ["bd-opportunities"],
    queryFn: async (): Promise<BdOpportunity[]> => {
      const { data, error } = await supabase
        .from("bd_opportunities")
        .select(
          "id, notice_id, source, title, agency, naics_code, psc_code, set_aside, place_state, response_deadline, decision, outcome, ui_link"
        )
        .order("response_deadline", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as BdOpportunity[];
    },
    staleTime: 30_000,
  });
}
