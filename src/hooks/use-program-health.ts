import { useQuery } from "@tanstack/react-query";
import { getProgramHealth } from "@/api";

export const programHealthKeys = {
  health: (businessId: string) => ["program", businessId, "health"] as const,
};

/** Program-effectiveness metrics for the /program control center (migration 115).
 *  Slow-moving aggregates — a modest staleTime is enough; no realtime refetch. */
export function useProgramHealth(businessId: string | undefined) {
  return useQuery({
    queryKey: programHealthKeys.health(businessId!),
    queryFn: () => getProgramHealth(businessId!),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}
