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
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  uploadBusinessIcon,
  deleteBusinessIcon,
  listBroadcasts,
  getBroadcast,
  createBroadcast,
  updateBroadcast,
  cancelBroadcast,
  sendBroadcast,
  estimateRecipients,
} from '@/api';
import type {
  BroadcastListParams,
  BroadcastCreate,
  BroadcastUpdate,
  BroadcastTargetFilter,
  LocalizedBody,
  MilestoneCreate,
  MilestoneUpdate,
  TriggerType,
} from '@/types/notification';

export const notificationKeys = {
  templates: (businessId: string | undefined, programId?: string) =>
    ['notifications', 'templates', businessId ?? null, programId ?? null] as const,
  milestones: (businessId: string | undefined, programId?: string) =>
    ['notifications', 'milestones', businessId ?? null, programId ?? null] as const,
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
      /** Omit to keep the stored copy (opt-out-only flow). */
      body?: LocalizedBody;
      /** Omit to keep the stored enabled state. */
      isEnabled?: boolean;
    }) => {
      if (!businessId) throw new Error('businessId required');
      return updateNotificationTemplate(businessId, args.trigger, {
        body: args.body,
        isEnabled: args.isEnabled,
      });
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

// ─── Milestones ────────────────────────────────────────────────────────

export function useMilestones(
  businessId: string | undefined,
  programId?: string
) {
  return useQuery({
    queryKey: notificationKeys.milestones(businessId, programId),
    queryFn: () => {
      if (!businessId) throw new Error('businessId required');
      return listMilestones(businessId, programId);
    },
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useCreateMilestone(
  businessId: string | undefined,
  programId?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MilestoneCreate) => {
      if (!businessId) throw new Error('businessId required');
      return createMilestone(businessId, payload, programId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'milestones', businessId],
      });
    },
  });
}

export function useUpdateMilestone(
  businessId: string | undefined,
  programId?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { templateId: string; payload: MilestoneUpdate }) => {
      if (!businessId) throw new Error('businessId required');
      return updateMilestone(businessId, args.templateId, args.payload, programId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'milestones', businessId],
      });
    },
  });
}

export function useDeleteMilestone(
  businessId: string | undefined,
  programId?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => {
      if (!businessId) throw new Error('businessId required');
      return deleteMilestone(businessId, templateId, programId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'milestones', businessId],
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

export function useBroadcasts(
  businessId: string | undefined,
  params: BroadcastListParams = {}
) {
  return useQuery({
    queryKey: [
      'notifications',
      'broadcasts',
      businessId ?? null,
      params.limit ?? 50,
      params.offset ?? 0,
    ] as const,
    queryFn: () => {
      if (!businessId) throw new Error('businessId required');
      return listBroadcasts(businessId, params);
    },
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useBroadcast(
  businessId: string | undefined,
  broadcastId: string | undefined
) {
  return useQuery({
    queryKey: ['notifications', 'broadcast', businessId ?? null, broadcastId ?? null] as const,
    queryFn: () => {
      if (!businessId) throw new Error('businessId required');
      if (!broadcastId) throw new Error('broadcastId required');
      return getBroadcast(businessId, broadcastId);
    },
    enabled: !!businessId && !!broadcastId,
  });
}

export function useCreateBroadcast(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BroadcastCreate) => {
      if (!businessId) throw new Error('businessId required');
      return createBroadcast(businessId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'broadcasts', businessId],
      });
    },
  });
}

export function useUpdateBroadcast(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; payload: BroadcastUpdate }) => {
      if (!businessId) throw new Error('businessId required');
      return updateBroadcast(businessId, args.id, args.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'broadcasts', businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'broadcast', businessId],
      });
    },
  });
}

/** DELETE on the broadcast — cancels a draft or scheduled row. */
export function useCancelBroadcast(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (broadcastId: string) => {
      if (!businessId) throw new Error('businessId required');
      return cancelBroadcast(businessId, broadcastId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'broadcasts', businessId],
      });
    },
  });
}

export function useSendBroadcast(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (broadcastId: string) => {
      if (!businessId) throw new Error('businessId required');
      return sendBroadcast(businessId, broadcastId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'broadcasts', businessId],
      });
    },
  });
}

/**
 * Debounced recipient estimate for the broadcast wizard.
 * Fires 400ms after the filter stops changing.
 */
export function useRecipientEstimate(
  businessId: string | undefined,
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
    queryKey: ['notifications', 'estimate', businessId ?? null, debouncedFilter] as const,
    queryFn: () => {
      if (!businessId) throw new Error('businessId required');
      return estimateRecipients(businessId, debouncedFilter);
    },
    enabled: enabled && !!businessId,
    placeholderData: keepPreviousData,
  });
}
