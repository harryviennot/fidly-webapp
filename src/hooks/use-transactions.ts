import { useQuery } from "@tanstack/react-query";
import { getTransactions, getCustomerTransactions } from "@/api";

export const transactionKeys = {
  all: (businessId: string) => ["transactions", businessId] as const,
  list: (businessId: string, limit: number) =>
    ["transactions", businessId, { limit }] as const,
  customer: (businessId: string, customerId: string) =>
    ["transactions", businessId, customerId] as const,
  legacyProbe: (businessId: string) =>
    ["transactions", businessId, "legacy-probe"] as const,
};

export function useTransactions(
  businessId: string | undefined,
  limit = 200
) {
  return useQuery({
    queryKey: transactionKeys.list(businessId!, limit),
    queryFn: () => getTransactions(businessId!, { limit }),
    enabled: !!businessId,
  });
}

export function useCustomerTransactions(
  businessId: string | undefined,
  customerId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: transactionKeys.customer(businessId!, customerId!),
    queryFn: () =>
      getCustomerTransactions(businessId!, customerId!, {
        limit: 20,
        offset: 0,
      }),
    enabled: enabled && !!businessId && !!customerId,
  });
}

/**
 * Detect whether the business has any "legacy" transactions — rows with
 * `location_id = NULL`. We use this on the activity feed to decide whether
 * to surface the "Unassigned" filter option, since after a first-location
 * backfill there are zero such rows and the option would be misleading.
 *
 * Fires a single-row GET against the `__none__` filter. Returns `true` if at
 * least one row exists. Cached for 5 minutes — drift is acceptable; the page
 * will simply show or hide an extra dropdown item.
 */
export function useHasLegacyTransactions(
  businessId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: transactionKeys.legacyProbe(businessId ?? ""),
    queryFn: async () => {
      const res = await getTransactions(businessId!, {
        location_id: "__none__",
        limit: 1,
      });
      return res.transactions.length > 0;
    },
    enabled: enabled && !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
