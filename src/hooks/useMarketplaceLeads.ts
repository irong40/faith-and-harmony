import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// ─── Types ───

export interface MarketplaceLead {
  id: string;
  source_slug: string;
  external_job_id: string;
  title: string;
  url: string | null;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number | null;
  job_type: string | null;
  category_raw: string | null;
  budget: number | null;
  description: string | null;
  client_name: string | null;
  expiry: string | null;
  job_date: string | null;
  score: number | null;
  confidence: string | null;
  suggested_bid: number | null;
  evaluation_breakdown: Record<string, unknown>;
  competitor_bids: number[];
  competitor_count: number;
  competitor_median: number | null;
  independent_rate: number | null;
  platform_net: number | null;
  commission_paid: number | null;
  delta: number | null;
  delta_percent: number | null;
  effective_hourly: number | null;
  typical_hours: number | null;
  bid_status: string;
  bid_amount: number | null;
  bid_placed_at: string | null;
  won_at: string | null;
  customer_deadline: string | null;
  proposed_date_primary: string | null;
  proposed_date_backup: string | null;
  confirmed_date: string | null;
  drone_job_id: string | null;
  agent_action: string | null;
  first_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceScanRun {
  id: string;
  source_slug: string;
  scan_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  jobs_scraped: number;
  new_leads: number;
  updated_leads: number;
  auto_declined: number;
  duplicates_skipped: number;
  created_at: string;
}

export interface MarketplaceFilters {
  source?: string;
  bid_status?: string;
  job_type?: string;
  confidence?: string;
  max_distance?: number;
  min_score?: number;
}

// ─── Queries ───

export function useMarketplaceLeads(filters: MarketplaceFilters = {}) {
  return useQuery({
    queryKey: ["marketplace-leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.source) {
        query = query.eq("source_slug", filters.source);
      }
      if (filters.bid_status) {
        query = query.eq("bid_status", filters.bid_status);
      } else {
        // Default: exclude expired and auto_declined
        query = query.not("bid_status", "in", "(expired,auto_declined)");
      }
      if (filters.job_type) {
        query = query.eq("job_type", filters.job_type);
      }
      if (filters.confidence) {
        query = query.eq("confidence", filters.confidence);
      }
      if (filters.max_distance) {
        query = query.lte("distance_miles", filters.max_distance);
      }
      if (filters.min_score) {
        query = query.gte("score", filters.min_score);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data || []) as MarketplaceLead[];
    },
    refetchInterval: 30000, // Poll every 30s for new leads
  });
}

export function useMarketplaceLead(id: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-lead", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("marketplace_leads")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as MarketplaceLead;
    },
    enabled: !!id,
  });
}

export function useMarketplaceScanRuns() {
  return useQuery({
    queryKey: ["marketplace-scan-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_scan_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as MarketplaceScanRun[];
    },
  });
}

export function useMarketplaceStats() {
  return useQuery({
    queryKey: ["marketplace-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_leads")
        .select("bid_status, score, distance_miles, budget, delta");
      if (error) throw error;

      const leads = data || [];
      return {
        total: leads.length,
        new: leads.filter(l => l.bid_status === "new").length,
        approved: leads.filter(l => l.bid_status === "approved").length,
        bidPlaced: leads.filter(l => l.bid_status === "bid_placed").length,
        won: leads.filter(l => l.bid_status === "won").length,
        declined: leads.filter(l => ["declined", "auto_declined"].includes(l.bid_status)).length,
        avgScore: leads.length > 0
          ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / leads.length)
          : 0,
        totalDelta: leads
          .filter(l => l.bid_status === "won")
          .reduce((s, l) => s + (l.delta || 0), 0),
      };
    },
    refetchInterval: 30000,
  });
}

// ─── Mutations ───

export function useUpdateBidStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, bid_status }: { id: string; bid_status: string }) => {
      const { error } = await supabase
        .from("marketplace_leads")
        .update({ bid_status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-leads"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-stats"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-lead", vars.id] });
      toast({ title: `Lead ${vars.bid_status}` });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useBulkUpdateBidStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, bid_status }: { ids: string[]; bid_status: string }) => {
      const { error } = await supabase
        .from("marketplace_leads")
        .update({ bid_status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-leads"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-stats"] });
      toast({ title: `${vars.ids.length} leads ${vars.bid_status}` });
    },
    onError: (err: Error) => {
      toast({ title: "Bulk update failed", description: err.message, variant: "destructive" });
    },
  });
}

// ─── Realtime subscription ───

export function useMarketplaceRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("marketplace-leads-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketplace_leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["marketplace-leads"] });
          queryClient.invalidateQueries({ queryKey: ["marketplace-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
