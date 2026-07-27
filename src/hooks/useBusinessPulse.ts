import { useQuery } from "@tanstack/react-query";
import { loadBusinessPulse } from "@/lib/command-center/business-pulse";

export const businessPulseKey = ["command-center", "business-pulse"] as const;

export function useBusinessPulse() {
  return useQuery({
    queryKey: businessPulseKey,
    queryFn: () => loadBusinessPulse(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
