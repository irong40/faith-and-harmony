import { useQuery } from "@tanstack/react-query";
import { listDepartmentUpdates } from "@/lib/command-center/departments";

export const departmentUpdateKey = ["department-updates", "latest"] as const;

export function useDepartmentUpdates() {
  return useQuery({
    queryKey: departmentUpdateKey,
    queryFn: listDepartmentUpdates,
    staleTime: 60_000,
  });
}
