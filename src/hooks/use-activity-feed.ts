import { useInfiniteQuery } from "@tanstack/react-query";
import { getTransactions } from "@/api";
import { activityKeys } from "./use-activity-stats";

const PAGE_SIZE = 50;

export function useActivityFeed(
  businessId: string | undefined,
  filters: { type?: string }
) {
  return useInfiniteQuery({
    queryKey: activityKeys.feed(businessId!, filters),
    queryFn: ({ pageParam = 0 }) =>
      getTransactions(businessId!, {
        type: filters.type,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined;
      const totalLoaded = allPages.reduce(
        (sum, page) => sum + page.transactions.length,
        0
      );
      return totalLoaded;
    },
    enabled: !!businessId,
  });
}
