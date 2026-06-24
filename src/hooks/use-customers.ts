import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  getCustomers,
  getCustomerSegmentCounts,
  addStamp,
  redeemReward,
  voidStamp,
  sendCustomerPass,
  updateCustomer,
  type CustomerUpdateInput,
} from "@/api";
import type { PaginatedCustomerResponse } from "@/types";
import type { SortKey, SortDir } from "@/components/customers/customer-data-table";

const PAGE_SIZE = 50;

// The table exposes "updated_at" as the last-activity sort; the API names that
// column "last_activity". Everything else maps 1:1.
const SORT_TO_API: Record<SortKey, string> = {
  name: "name",
  stamps: "stamps",
  updated_at: "last_activity",
  total_redemptions: "total_redemptions",
};

export interface CustomerListQuery {
  page: number;
  search: string;
  segment: string;
  sort: SortKey;
  sortDir: SortDir;
}

export const customerKeys = {
  all: (businessId: string) => ["customers", businessId] as const,
  list: (businessId: string, query: CustomerListQuery) =>
    ["customers", businessId, "list", query] as const,
  segmentCounts: (businessId: string, search: string) =>
    ["customers", businessId, "segment-counts", search] as const,
  detail: (businessId: string, customerId: string) =>
    ["customers", businessId, customerId] as const,
  walletStatus: (businessId: string, customerId: string) =>
    ["customers", businessId, customerId, "wallet-status"] as const,
};

/**
 * Server-side customers list: search / segment filter / sort / pagination all
 * run in the backend (migration 102), so results are correct across the whole
 * business, not just the loaded page. `keepPreviousData` holds the prior page
 * on screen while the next query resolves, so typing/sorting never flashes
 * empty.
 */
export function useCustomers(
  businessId: string | undefined,
  query: CustomerListQuery,
) {
  return useQuery({
    queryKey: customerKeys.list(businessId!, query),
    queryFn: () =>
      getCustomers(businessId!, {
        limit: PAGE_SIZE,
        offset: query.page * PAGE_SIZE,
        search: query.search || undefined,
        segment: query.segment,
        sort: SORT_TO_API[query.sort],
        sortDir: query.sortDir,
      }),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

/** Whole-business per-segment counts for the filter pills, narrowed by the
 *  (debounced) search term. Cached separately so it only refetches when the
 *  search changes — not on every page/sort change. */
export function useCustomerSegmentCounts(
  businessId: string | undefined,
  search: string,
) {
  return useQuery({
    queryKey: customerKeys.segmentCounts(businessId!, search),
    queryFn: () => getCustomerSegmentCounts(businessId!, search || undefined),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export { PAGE_SIZE };

// Mutations key on `enrollmentId` (the new URL contract — Phase 4) for the
// network call, but also accept `customerId` so the optimistic update can
// find the right row in the cached customer list. Today every customer has
// exactly one enrollment per business; multi-program will surface multiple
// enrollments per customer and the caller picks which one to address.
type StampVars = { customerId: string; enrollmentId: string };

// Dashboard adjustment vars — owner/admin manual stamp with required reason
// + optional location. The mutation hook accepts both shapes so an
// adjustment-flow caller can supply `reason` while legacy callers stay terse.
type AddStampVars = StampVars & {
  reason?: string;
  locationId?: string | null;
  /** Points programs: the ticket price (credits round(amount × rate)). */
  amount?: number;
};

export function useAddStamp(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enrollmentId, reason, locationId, amount }: AddStampVars) =>
      addStamp(
        businessId!,
        enrollmentId,
        reason !== undefined || amount !== undefined
          ? { source: 'dashboard', reason, locationId, amount }
          : undefined
      ),
    onMutate: async ({ customerId }) => {
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
      queryClient.invalidateQueries({
        queryKey: ["activity", businessId],
      });
    },
  });
}

export function useRedeemReward(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enrollmentId, rewardId }: StampVars & { rewardId?: string | null }) =>
      redeemReward(businessId!, enrollmentId, rewardId),
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
      queryClient.invalidateQueries({
        queryKey: ["activity", businessId],
      });
    },
  });
}

export function useSendCustomerPass(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, email }: { customerId: string; email?: string }) =>
      sendCustomerPass(businessId!, customerId, email),
    onSuccess: (_data, { customerId }) => {
      // A newly-saved email should show immediately in the detail sheet + list.
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(businessId!, customerId),
      });
      queryClient.invalidateQueries({
        queryKey: customerKeys.all(businessId!),
      });
    },
  });
}

export function useUpdateCustomer(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      input,
    }: {
      customerId: string;
      input: CustomerUpdateInput;
    }) => updateCustomer(businessId!, customerId, input),
    onSuccess: (_data, { customerId }) => {
      // Edited name/email/phone should show immediately in the detail sheet
      // and the customers list.
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(businessId!, customerId),
      });
      queryClient.invalidateQueries({
        queryKey: customerKeys.all(businessId!),
      });
    },
  });
}

export function useVoidStamp(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      enrollmentId,
      transactionId,
      reason,
    }: {
      customerId: string;
      enrollmentId: string;
      transactionId: string;
      reason: string;
    }) => voidStamp(businessId!, enrollmentId, transactionId, reason),
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
      queryClient.invalidateQueries({
        queryKey: ["activity", businessId],
      });
    },
  });
}
