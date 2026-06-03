import { useQuery } from "@tanstack/react-query";
import { getBusinessAchievements } from "@/api/transactions";

/**
 * Lifetime "trophy" counters + a trailing weekly stamp series for the dashboard
 * Achievements + weekly-goal widget and the /achievements page. Definitions
 * mirror the dashboard StatCards (stamps = stamp_added only; repeat = >=2 distinct
 * stamp-days). See web/docs/dashboard-achievements.md.
 */
export function useBusinessAchievements(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-achievements", businessId],
    queryFn: () => getBusinessAchievements(businessId!),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}
