'use client';

import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/api/customers';

/**
 * Cheap total-customer count for the program step's type-switch gate. Unlike
 * `useBusinessInstalls` (which fetches per-customer wallet status, N+1), this
 * reads only the pagination `total` from a single-row page — important for the
 * trial-gate-abuser edge case where a business may have dozens of customers.
 */
export function useCustomerCount(businessId: string | undefined): number {
  const { data } = useQuery({
    queryKey: ['customer-count', businessId],
    queryFn: () => getCustomers(businessId!, { limit: 1 }),
    enabled: !!businessId,
    staleTime: 30_000,
  });
  return data?.total ?? 0;
}
