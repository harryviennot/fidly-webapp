import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  getNotificationTemplates,
  updateNotificationTemplate,
  resetNotificationTemplate,
  uploadBusinessIcon,
  deleteBusinessIcon,
  listBroadcasts,
  getBroadcast,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  sendBroadcast,
  estimateRecipients,
} from '@/api';
import type {
  BroadcastListParams,
  BroadcastCreate,
  BroadcastUpdate,
  BroadcastTargetFilter,
  LocalizedBody,
  TriggerType,
} from '@/types/notification';

export const notificationKeys = {
  templates: (businessId: string | undefined, programId?: string) =>
    ['notifications', 'templates', businessId ?? null, programId ?? null] as const,
  broadcasts: (params: BroadcastListParams) =>
    ['notifications', 'broadcasts', params] as const,
  broadcast: (id: string | undefined) =>
    ['notifications', 'broadcast', id ?? null] as const,
  estimate: (filter: BroadcastTargetFilter) =>
    ['notifications', 'estimate', filter] as const,
};

// ─── Transactional templates ───────────────────────────────────────────

export function useNotificationTemplates(
  businessId: string | undefined,
  programId?: string
) {
  return useQuery({
    queryKey: notificationKeys.templates(businessId, programId),
    queryFn: () => {
      if (!businessId) throw new Error('businessId required');
      return getNotificationTemplates(businessId, programId);
    },
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateNotificationTemplate(
  businessId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      trigger: TriggerType;
      body: LocalizedBody;
      isEnabled?: boolean;
    }) => {
      if (!businessId) throw new Error('businessId required');
      return updateNotificationTemplate(
        businessId,
        args.trigger,
        args.body,
        args.isEnabled ?? true
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'templates', businessId],
      });
    },
  });
}

export function useResetNotificationTemplate(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trigger: TriggerType) => {
      if (!businessId) throw new Error('businessId required');
      return resetNotificationTemplate(businessId, trigger);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'templates', businessId],
      });
    },
  });
}

// ─── Business icon ─────────────────────────────────────────────────────

export function useUploadBusinessIcon(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      if (!businessId) throw new Error('businessId required');
      return uploadBusinessIcon(businessId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });
}

export function useDeleteBusinessIcon(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!businessId) throw new Error('businessId required');
      return deleteBusinessIcon(businessId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });
}

// ─── Broadcasts ────────────────────────────────────────────────────────

export function useBroadcasts(params: BroadcastListParams = {}) {
  return useQuery({
    queryKey: notificationKeys.broadcasts(params),
    queryFn: () => listBroadcasts(params),
    placeholderData: keepPreviousData,
  });
}

export function useBroadcast(id: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.broadcast(id),
    queryFn: () => {
      if (!id) throw new Error('id required');
      return getBroadcast(id);
    },
    enabled: !!id,
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BroadcastCreate) => createBroadcast(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'broadcasts'] });
    },
  });
}

export function useUpdateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; payload: BroadcastUpdate }) =>
      updateBroadcast(args.id, args.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'broadcasts'] });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.broadcast(variables.id),
      });
    },
  });
}

export function useDeleteBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'broadcasts'] });
    },
  });
}

export function useSendBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sendBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'broadcasts'] });
    },
  });
}

/**
 * Debounced recipient estimate for the broadcast wizard.
 * Fires 400ms after the filter stops changing.
 */
export function useRecipientEstimate(
  filter: BroadcastTargetFilter,
  enabled: boolean = true
) {
  const [debouncedFilter, setDebouncedFilter] = useState(filter);

  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedFilter(filter), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return useQuery({
    queryKey: notificationKeys.estimate(debouncedFilter),
    queryFn: () => estimateRecipients(debouncedFilter),
    enabled,
    placeholderData: keepPreviousData,
  });
}
