import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ComplianceObligation, GovernanceDecision, GovernanceLog } from "@/types/governance";

export function useComplianceObligations() {
  return useQuery({
    queryKey: ["compliance-obligations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_obligations" as never)
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as unknown as ComplianceObligation[];
    },
    staleTime: 30_000,
  });
}

export function useGovernanceDecisions() {
  return useQuery({
    queryKey: ["governance-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_decisions" as never)
        .select("*")
        .order("decision_date", { ascending: false });
      if (error) throw error;
      return data as unknown as GovernanceDecision[];
    },
    staleTime: 30_000,
  });
}

export function useGovernanceLog() {
  return useQuery({
    queryKey: ["governance-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_log" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as GovernanceLog[];
    },
    staleTime: 30_000,
  });
}
