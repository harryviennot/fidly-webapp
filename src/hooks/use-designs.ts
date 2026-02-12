import { useQuery } from "@tanstack/react-query";
import { getActiveDesign } from "@/api";

export const designKeys = {
  active: (businessId: string) =>
    ["designs", businessId, "active"] as const,
};

export function useActiveDesign(businessId: string | undefined) {
  return useQuery({
    queryKey: designKeys.active(businessId!),
    queryFn: () => getActiveDesign(businessId!),
    enabled: !!businessId,
  });
}
