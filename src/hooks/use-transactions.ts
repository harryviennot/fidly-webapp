import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/api";

export const transactionKeys = {
  all: (businessId: string) => ["transactions", businessId] as const,
  list: (businessId: string, limit: number) =>
    ["transactions", businessId, { limit }] as const,
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
