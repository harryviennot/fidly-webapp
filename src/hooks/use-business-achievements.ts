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
 * Pure — no writes. Used by the widget and the /achievements page; surfaces the
 * query's loading/error so consumers can show a skeleton or hide on failure.
 */
export function useComputedAchievements(businessId: string | undefined, firstBroadcast = false) {
  const query = useBusinessAchievements(businessId);
  const { data } = query;
  const computed: ComputedAchievements | null = useMemo(
    () =>
      data
        ? computeAchievements(metricValuesFromData(data, firstBroadcast), data.unlocked ?? [])
        : null,
    [data, firstBroadcast]
  );
  return { data, computed, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Headless RECORDER. Mount once in an always-present place (the dashboard layout)
 * so unlocks are recorded the moment they happen, no matter what page the owner is
 * on. On first contact it seeds the ledger silently; afterwards it inserts
 * genuinely new keys as unacknowledged (so the /achievements overlay can celebrate
 * them). Idempotent server-side; guarded client-side against looping. No UI — the
 * celebration animation deliberately lives only on /achievements.
 */
export function useAchievementRecorder(businessId: string | undefined, firstBroadcast = false) {
  const queryClient = useQueryClient();
  const { data, computed } = useComputedAchievements(businessId, firstBroadcast);

  const syncMutation = useMutation({
    mutationFn: (keys: string[]) => syncAchievements(businessId!, keys),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["business-achievements", businessId] }),
  });

  useEffect(() => {
    if (!data || !businessId || syncMutation.isPending) return;
    const unlockedKeys = computed?.unlockedKeys ?? [];
    const recorded = new Set((data.unlocked ?? []).map((u) => u.key));
    const hasNew = unlockedKeys.some((k) => !recorded.has(k));
    if (!data.initialized || hasNew) syncMutation.mutate(unlockedKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, businessId]);
}

/**
 * Celebration QUEUE for the /achievements overlay. Reads the trophies that are
 * earned + recorded but not yet acknowledged (newest first) and exposes
 * `acknowledge` to flip them once their unlock animation has played. No sync —
 * recording is the recorder's job (above), so the overlay can mount on a single
 * page without becoming the global writer.
 */
export function useAchievementCelebration(businessId: string | undefined, firstBroadcast = false) {
  const queryClient = useQueryClient();
  const { computed } = useComputedAchievements(businessId, firstBroadcast);

  const ackMutation = useMutation({
    mutationFn: (keys: string[]) => acknowledgeAchievements(businessId!, keys),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["business-achievements", businessId] }),
  });

  const pending: ResolvedAchievement[] = useMemo(() => {
    if (!computed) return [];
    return computed.all
      .filter((a) => a.unlocked && a.unlockedAt && a.acknowledgedAt === null)
      .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));
  }, [computed]);

  const acknowledge = (keys: string[]) => {
    if (keys.length) ackMutation.mutate(keys);
  };

  return { pending, acknowledge };
}
