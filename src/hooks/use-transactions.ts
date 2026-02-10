import { useQuery } from "@tanstack/react-query";
import { getTransactions, getCustomerTransactions } from "@/api";

export const transactionKeys = {
  all: (businessId: string) => ["transactions", businessId] as const,
  list: (businessId: string, limit: number) =>
    ["transactions", businessId, { limit }] as const,
  customer: (businessId: string, customerId: string) =>
    ["transactions", businessId, customerId] as const,
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
