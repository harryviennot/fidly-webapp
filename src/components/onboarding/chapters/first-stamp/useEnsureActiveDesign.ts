'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { activateDesign } from '@/api/designs';
import { designKeys } from '@/hooks/use-designs';
import type { CardDesign } from '@/types';

/**
 * Ensures the wizard's design is activated. Runs as soon as strips are ready
 * (`designReady`) and the design isn't already active. Idempotent — guarded
 * by a ref keyed on `designId` so it fires exactly once per (mount × design).
 *
 * Why this lives in its own hook instead of inline in InstallStep:
 *   - InstallStep alone is a single race window. If the user installs their
 *     pass and clicks Next before the activate POST resolves (sub-second but
 *     not free), the design stays inactive — the pass they installed points
 *     at a draft design, stamps never push, and the wizard appears "broken".
 *   - On revisit, the user can land directly on StampStep (install was
 *     already marked complete in a prior session) without InstallStep ever
 *     mounting. The activation effect there would never have a chance to
 *     run. This hook is mounted on both steps so either entry point heals.
 *
 * Surfaces a toast on failure but doesn't return state — callers don't need
 * to know about activation; they read `is_active` from `useDesigns`/the
 * realtime cache the same way as before.
 */
export function useEnsureActiveDesign(
  businessId: string | undefined,
  designId: string | undefined,
  designReady: boolean,
  isActive: boolean
) {
  const queryClient = useQueryClient();
  const activatingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!businessId || !designId || !designReady || isActive) return;
    if (activatingRef.current === designId) return;
    activatingRef.current = designId;
    (async () => {
      try {
        const activated = await activateDesign(businessId, designId);
        queryClient.setQueryData<CardDesign[]>(
          designKeys.all(businessId),
          (prev) => {
            if (!prev) return [activated];
            return prev.map((d) => (d.id === designId ? activated : d));
          }
        );
        // Refresh the "active design" query too — useActiveDesign caches
        // separately from the full list, and StampStep reads it for theming.
        queryClient.invalidateQueries({ queryKey: designKeys.active(businessId) });
      } catch (err) {
        // Reset the ref so a later mount or a refetch-driven re-run can
        // retry. Surface the message so the user isn't silently stuck.
        activatingRef.current = null;
        toast.error(err instanceof Error ? err.message : 'Failed to activate card');
      }
    })();
  }, [businessId, designId, designReady, isActive, queryClient]);
}
