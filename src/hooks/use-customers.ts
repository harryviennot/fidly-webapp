import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllCustomers, addStamp, redeemReward, voidStamp } from "@/api";
import type { CustomerResponse } from "@/types";

export const customerKeys = {
  all: (businessId: string) => ["customers", businessId] as const,
  detail: (businessId: string, customerId: string) =>
    ["customers", businessId, customerId] as const,
};

export function useCustomers(businessId: string | undefined) {
  return useQuery({
    queryKey: customerKeys.all(businessId!),
    queryFn: () => getAllCustomers(businessId!),
    enabled: !!businessId,
  });
}

export function useAddStamp(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => addStamp(businessId!, customerId),
    onMutate: async (customerId) => {
      await queryClient.cancelQueries({
        queryKey: customerKeys.all(businessId!),
      });
      const previous = queryClient.getQueryData<CustomerResponse[]>(
        customerKeys.all(businessId!)
      );
      if (previous) {
        queryClient.setQueryData<CustomerResponse[]>(
          customerKeys.all(businessId!),
          previous.map((c) =>
            c.id === customerId ? { ...c, stamps: c.stamps + 1 } : c
          )
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          customerKeys.all(businessId!),
          context.previous
        );
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
