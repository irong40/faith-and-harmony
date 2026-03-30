import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { CostingInputs, CostingResult, CostingSettings } from "@/lib/mission-costing";

export type MissionCostingRow = Tables<"mission_costings">;

export function useMissionCostings() {
  return useQuery({
    queryKey: ["mission-costings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_costings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("mission_costings query failed:", error.message);
        return [];
      }
      return data;
    },
    staleTime: 30 * 1000,
  });
}

interface SaveCostingParams {
  missionName: string;
  serviceType: string;
  inputs: CostingInputs;
  settings: CostingSettings;
  result: CostingResult;
  marginPct: number;
  comparedPackage?: string | null;
  packagePrice?: number | null;
  surchargeWarning?: boolean;
  notes?: string;
}

export function useSaveMissionCosting() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SaveCostingParams) => {
      const row: TablesInsert<"mission_costings"> = {
        mission_name: params.missionName || null,
        service_type: params.serviceType || null,
        pilot_rate: params.inputs.pilotRate,
        pilot_hours: params.inputs.pilotHours,
        vo_rate: params.inputs.voRate,
        vo_hours: params.inputs.voHours,
        editing_fee: params.inputs.editingFee,
        travel_gas: params.inputs.travelGas,
        travel_hotel: params.inputs.travelHotel,
        travel_rental: params.inputs.travelRental,
        meals: params.inputs.meals,
        equipment_rental: params.inputs.equipmentRental,
        insurance_premium: params.inputs.insurancePremium,
        expenses_subtotal: params.result.expensesSubtotal,
        overhead_pct: params.settings.overheadPct,
        overhead_amount: params.result.overheadAmount,
        depreciation_pct: params.settings.depreciationPct,
        depreciation_amount: params.result.depreciationAmount,
        admin_cost_pct: params.settings.adminCostPct,
        admin_cost_amount: params.result.adminCostAmount,
        total_expenses: params.result.totalExpenses,
        margin_pct: params.marginPct,
        profit_amount: params.result.profitAmount,
        total_charge: params.result.totalCharge,
        tax_estimate: params.result.taxEstimate,
        compared_package: params.comparedPackage ?? null,
        package_price: params.packagePrice ?? null,
        surcharge_warning: params.surchargeWarning ?? false,
        notes: params.notes ?? null,
        status: "draft",
      };

      const { data, error } = await supabase
        .from("mission_costings")
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mission-costings"] });
      toast({ title: "Costing saved", description: "Draft mission costing saved." });
    },
    onError: (err) => {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    },
  });
}
