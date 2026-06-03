import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAchievements,
  getBusinessAchievements,
  syncAchievements,
} from "@/api/transactions";
import {
  computeAchievements,
  metricValuesFromData,
  type ComputedAchievements,
  type ResolvedAchievement,
} from "@/lib/achievements";

/**
 * Lifetime "trophy" counters + a trailing weekly stamp series + the per-trophy
 * unlock ledger for the dashboard Achievements + weekly-goal widget and the
 * /achievements page. Definitions mirror the dashboard StatCards (stamps =
 * stamp_added only; repeat = >=2 distinct stamp-days). See
 * web/docs/dashboard-achievements.md.
 */
export function useBusinessAchievements(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-achievements", businessId],
    queryFn: () => getBusinessAchievements(businessId!),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

/**
 * Read-only resolved achievements for display. Resolves the catalog against the
 * counters, using the server unlock ledger for stickiness + per-rung unlock dates.
 * Pure — no writes. Used by the widget and the /achievements page.
 */
export function useComputedAchievements(
  businessId: string | undefined,
  firstBroadcast = false
): { data: ReturnType<typeof useBusinessAchievements>["data"]; computed: ComputedAchievements | null } {
  const { data } = useBusinessAchievements(businessId);
  const computed = useMemo(
    () =>
      data
        ? computeAchievements(metricValuesFromData(data, firstBroadcast), data.unlocked ?? [])
        : null,
    [data, firstBroadcast]
  );
  return { data, computed };
}

/**
 * The single source that RECORDS unlocks and exposes the celebration queue.
 * Mount this in exactly ONE always-present place (the dashboard layout, via the
 * celebration overlay) so the sync effect fires once per session, not per widget.
 *
 * - On load it records any newly-unlocked keys (and seeds the ledger on first
 *   contact — silent for established shops, celebratable thereafter). Idempotent.
 * - `pending` = trophies earned but not yet celebrated (`acknowledged_at == null`).
 * - `acknowledge(keys)` flips them once their unlock animation has played.
 */
export function useAchievementSync(businessId: string | undefined, firstBroadcast = false) {
  const queryClient = useQueryClient();
  const { data, computed } = useComputedAchievements(businessId, firstBroadcast);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["business-achievements", businessId] });

  const syncMutation = useMutation({
    mutationFn: (keys: string[]) => syncAchievements(businessId!, keys),
    onSuccess: invalidate,
  });
  const ackMutation = useMutation({
    mutationFn: (keys: string[]) => acknowledgeAchievements(businessId!, keys),
    onSuccess: invalidate,
  });

  // Record newly-unlocked keys / initialize on first contact. The server is
  // idempotent; we guard the client so the post-invalidation refetch doesn't loop.
  useEffect(() => {
    if (!data || !businessId || syncMutation.isPending) return;
    const unlockedKeys = computed?.unlockedKeys ?? [];
    const recorded = new Set((data.unlocked ?? []).map((u) => u.key));
    const hasNew = unlockedKeys.some((k) => !recorded.has(k));
    if (!data.initialized || hasNew) syncMutation.mutate(unlockedKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, businessId]);

  // Earned, recorded, but not yet celebrated — newest first.
  const pending: ResolvedAchievement[] = useMemo(() => {
    if (!computed) return [];
    return computed.all
      .filter((a) => a.unlocked && a.unlockedAt && a.acknowledgedAt === null)
      .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));
  }, [computed]);

  const acknowledge = (keys: string[]) => {
    if (keys.length) ackMutation.mutate(keys);
  };

  return { data, computed, pending, acknowledge, isSyncing: syncMutation.isPending };
}
