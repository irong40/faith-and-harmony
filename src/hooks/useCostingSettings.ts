import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type CostingSettingsRow = Tables<"costing_settings">;

const DEFAULTS: Pick<CostingSettingsRow, "overhead_pct" | "depreciation_pct" | "admin_cost_pct" | "default_margin_pct" | "tax_rate_pct"> = {
  overhead_pct: 20,
  depreciation_pct: 10,
  admin_cost_pct: 5,
  default_margin_pct: 40,
  tax_rate_pct: 6,
};

export function useCostingSettings() {
  return useQuery({
    queryKey: ["costing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("costing_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) {
        console.warn("costing_settings not found, using defaults:", error.message);
        return { id: "", updated_at: "", updated_by: null, ...DEFAULTS } satisfies CostingSettingsRow;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCostingSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<CostingSettingsRow, "overhead_pct" | "depreciation_pct" | "admin_cost_pct" | "default_margin_pct" | "tax_rate_pct">>) => {
      const { data: existing } = await supabase
        .from("costing_settings")
        .select("id")
        .limit(1)
        .single();

      if (!existing) throw new Error("No costing_settings row found");

      const { data, error } = await supabase
        .from("costing_settings")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["costing-settings"] });
      toast({ title: "Settings updated" });
    },
    onError: (err) => {
      toast({ title: "Failed to update settings", description: String(err), variant: "destructive" });
    },
  });
}
