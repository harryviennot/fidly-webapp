import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomers, addStamp, redeemReward, voidStamp } from "@/api";
import type { PaginatedCustomerResponse } from "@/types";

const PAGE_SIZE = 50;

export const customerKeys = {
  all: (businessId: string) => ["customers", businessId] as const,
  page: (businessId: string, page: number) =>
    ["customers", businessId, page] as const,
  detail: (businessId: string, customerId: string) =>
    ["customers", businessId, customerId] as const,
};

export function useCustomers(businessId: string | undefined, page: number = 0) {
  return useQuery({
    queryKey: customerKeys.page(businessId!, page),
    queryFn: () =>
      getCustomers(businessId!, PAGE_SIZE, page * PAGE_SIZE),
    enabled: !!businessId,
  });
}

export { PAGE_SIZE };

export function useAddStamp(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => addStamp(businessId!, customerId),
    onMutate: async (customerId) => {
      await queryClient.cancelQueries({
        queryKey: customerKeys.all(businessId!),
      });
      // Optimistically update across all cached pages
      const queries = queryClient.getQueriesData<PaginatedCustomerResponse>({
        queryKey: customerKeys.all(businessId!),
      });
      const previousMap = new Map(queries);
      for (const [key, data] of queries) {
        if (data && Array.isArray(data.data)) {
          queryClient.setQueryData<PaginatedCustomerResponse>(key, {
            ...data,
            data: data.data.map((c) =>
              c.id === customerId ? { ...c, stamps: c.stamps + 1 } : c
            ),
          });
        }
      }
      return { previousMap };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMap) {
        for (const [key, data] of context.previousMap) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.all(businessId!),
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions", businessId],
      });
    },
  });
}

export function useRedeemReward(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => redeemReward(businessId!, customerId),
    onMutate: async (customerId) => {
      await queryClient.cancelQueries({
        queryKey: customerKeys.all(businessId!),
      });
      const queries = queryClient.getQueriesData<PaginatedCustomerResponse>({
        queryKey: customerKeys.all(businessId!),
      });
      const previousMap = new Map(queries);
      for (const [key, data] of queries) {
        if (data && Array.isArray(data.data)) {
          queryClient.setQueryData<PaginatedCustomerResponse>(key, {
            ...data,
            data: data.data.map((c) =>
              c.id === customerId
                ? { ...c, stamps: 0, total_redemptions: (c.total_redemptions ?? 0) + 1 }
                : c
            ),
          });
        }
      }
      return { previousMap };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMap) {
        for (const [key, data] of context.previousMap) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.all(businessId!),
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions", businessId],
      });
    },
  });
}

export function useVoidStamp(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      transactionId,
      reason,
    }: {
      customerId: string;
      transactionId: string;
      reason: string;
    }) => voidStamp(businessId!, customerId, transactionId, reason),
    onMutate: async ({ customerId }) => {
      await queryClient.cancelQueries({
        queryKey: customerKeys.all(businessId!),
      });
      const queries = queryClient.getQueriesData<PaginatedCustomerResponse>({
        queryKey: customerKeys.all(businessId!),
      });
      const previousMap = new Map(queries);
      for (const [key, data] of queries) {
        if (data && Array.isArray(data.data)) {
          queryClient.setQueryData<PaginatedCustomerResponse>(key, {
            ...data,
            data: data.data.map((c) =>
              c.id === customerId
                ? { ...c, stamps: Math.max(0, c.stamps - 1) }
                : c
            ),
          });
        }
      }
      return { previousMap };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMap) {
        for (const [key, data] of context.previousMap) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.all(businessId!),
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions", businessId],
      });
    },
  });
}
