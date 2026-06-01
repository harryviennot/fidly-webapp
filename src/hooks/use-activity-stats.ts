import { useQuery } from "@tanstack/react-query";
import { getActivityStats } from "@/api";

export interface ActivityFeedFilters {
  type?: string;
  location_id?: string | "__none__";
  include_legacy?: boolean;
}

export const activityKeys = {
  stats: (businessId: string) => ["activity", businessId, "stats"] as const,
  feed: (businessId: string, filters: ActivityFeedFilters) =>
    ["activity", businessId, "feed", filters] as const,
};

export function useActivityStats(businessId: string | undefined) {
  return useQuery({
    queryKey: activityKeys.stats(businessId!),
    queryFn: () => getActivityStats(businessId!),
    enabled: !!businessId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
