"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversions } from "@/api";
import type { ProgramConversion } from "@/types";

export const conversionKeys = {
  all: ["conversions"] as const,
  list: (businessId: string, programId: string) =>
    [...conversionKeys.all, businessId, programId] as const,
  latest: (businessId: string, programId: string) =>
    [...conversionKeys.all, businessId, programId, "latest"] as const,
};

/** Full conversion history for the activity-page markers. Conversions are
 * rare structural events — a long stale time is fine; the executor invalidates
 * conversionKeys.all when one completes. */
export function useConversions(businessId?: string, programId?: string) {
  return useQuery<ProgramConversion[]>({
    queryKey: conversionKeys.list(businessId ?? "", programId ?? ""),
    queryFn: () => getConversions(businessId!, programId!),
    enabled: !!businessId && !!programId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Latest conversion only — churn-guard warning, broadcasts pause nudge, and
 * the wizard's progress-poll fallback (callers override refetchInterval). */
export function useLatestConversion(
  businessId?: string,
  programId?: string,
  opts?: { refetchInterval?: number | false }
) {
  return useQuery<ProgramConversion | null>({
    queryKey: conversionKeys.latest(businessId ?? "", programId ?? ""),
    queryFn: async () => {
      const rows = await getConversions(businessId!, programId!, { latest: true });
      return rows[0] ?? null;
    },
    enabled: !!businessId && !!programId,
    refetchInterval: opts?.refetchInterval ?? false,
  });
}
