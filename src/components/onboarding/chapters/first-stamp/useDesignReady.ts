'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { getDesign } from '@/api/designs';
import { designKeys } from '@/hooks/use-designs';
import type { CardDesign } from '@/types';

interface UseDesignReadyResult {
  /** True once we've seen the design's `strip_status` resolve to anything
   *  other than `regenerating` for the first time this mount. Sticky: a
   *  spurious later `regenerating` event (e.g. transient state during the
   *  `activate` endpoint's `set_active` two-step update) doesn't reset it,
   *  because we've already proved the strips render correctly. */
  ready: boolean;
  /** True while we haven't observed the row yet — first read in flight. */
  loading: boolean;
  /** The cached `is_active` flag, surfaced so InstallStep can decide whether
   *  it still needs to call activateDesign once strips are ready. */
  isActive: boolean;
}

/**
 * Subscribe to the wizard's design row and report `ready` once the backend
 * finishes pre-rendering its strip PNGs. Replaces the polling helper we used
 * before — Supabase realtime delivers UPDATE events as soon as the
 * background task flips `strip_status` back to `ready`, so the UI can switch
 * out of the loader the moment the work lands.
 *
 * Pass `initialDesign` to seed the hook with the row the caller already has
 * (typically from `useDesigns`, which is populated by BackStep's
 * `setQueryData`). When provided, the hook computes `ready` from it on the
 * very first render — eliminating the one-frame "loader → install" flash that
 * would otherwise appear before the internal `getDesign` settled.
 *
 * Resilient to remounts: every mount also kicks off a fresh `getDesign` read
 * AND resubscribes to the channel. If the user closes the wizard mid-regen
 * and comes back later, the initial read returns `strip_status='ready'` and
 * we surface that immediately without waiting for a realtime event.
 *
 * Pass an undefined `designId` when the design id isn't known yet (e.g.
 * business cache still loading); the hook reports `loading=true` until set.
 */
export function useDesignReady(
  businessId: string | undefined,
  designId: string | undefined,
  initialDesign?: CardDesign | null
): UseDesignReadyResult {
  const queryClient = useQueryClient();
  // Seed local state from `initialDesign` so the first render already reflects
  // the cached row. Without this, we'd briefly render `design=null` →
  // `ready=false` → loader for one frame, then flip to the install UI as
  // soon as the internal `getDesign` resolves.
  const [design, setDesign] = useState<CardDesign | null>(initialDesign ?? null);
  const [loading, setLoading] = useState(!initialDesign);
  // Sticky-ready flag: flips true the first time we observe a non-regenerating
  // `strip_status` for this mount. Once flipped, it ignores later events that
  // would otherwise drop us back into the loader — that scenario (UI was
  // showing install, then suddenly went back to loading and got stuck) was
  // reported in dev when the `activate` endpoint's set_active two-step
  // update fired a transient row state that the realtime channel re-broadcast
  // before the matching "ready" update could land. Seed from the initial
  // design so a fast-path mount skips the loader entirely.
  const sawReadyRef = useRef(
    !!initialDesign && initialDesign.strip_status !== 'regenerating'
  );

  useEffect(() => {
    if (!businessId || !designId) {
      setLoading(true);
      return;
    }
    let cancelled = false;

    // Skip the redundant initial fetch only when the seeded row is *already*
    // ready — in that case the cache is trustworthy and a second `getDesign`
    // would just refetch what we already have. If the seed is still
    // `regenerating`, we MUST refetch on mount: the backend may have flipped
    // status to `ready` and broadcast its realtime UPDATE before we got a
    // chance to subscribe (e.g. user navigated away from BackStep, strips
    // finished while they were on another step, then they returned). That
    // missed event would otherwise leave the hook stuck in the loader
    // forever, with the cached row lying about a regeneration that's
    // already complete server-side.
    const seedIsStale = !initialDesign || initialDesign.strip_status === 'regenerating';
    if (seedIsStale) {
      setLoading(true);
      (async () => {
        try {
          const fresh = await getDesign(businessId, designId);
          if (cancelled) return;
          setDesign(fresh);
          if (fresh.strip_status !== 'regenerating') {
            sawReadyRef.current = true;
            // Mirror into the React Query cache so other consumers
            // (`useDesigns`) stop reporting the stale regenerating row.
            queryClient.setQueryData<CardDesign[]>(
              designKeys.all(businessId),
              (cached) => {
                if (!cached) return [fresh];
                return cached.map((d) => (d.id === designId ? fresh : d));
              }
            );
          }
        } catch {
          // Non-fatal — stay in loading state; realtime updates may still land.
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }

    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`onboarding-design-${designId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'card_designs',
          filter: `id=eq.${designId}`,
        },
        (payload) => {
          const next = payload.new as Partial<CardDesign> | null;
          if (!next) return;
          if (next.strip_status && next.strip_status !== 'regenerating') {
            sawReadyRef.current = true;
          }
          // Merge the realtime row into local state; mirror into the React
          // Query cache so other consumers (e.g. useDesigns inside the same
          // chapter) see the freshly-ready status without an extra fetch.
          setDesign((prev) => ({ ...(prev ?? ({} as CardDesign)), ...next } as CardDesign));
          queryClient.setQueryData<CardDesign[]>(
            designKeys.all(businessId),
            (cached) => {
              if (!cached) return cached;
              return cached.map((d) => (d.id === designId ? { ...d, ...next } : d));
            }
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // `initialDesign` is intentionally excluded from deps: it only seeds the
    // first mount (via the useState/useRef initialisers above). Including it
    // would tear down and reconnect the realtime channel every time the
    // caller's reference churned (e.g. on each `useDesigns` refetch),
    // wasting websocket frames for no behavioural change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, designId, queryClient]);

  // Sticky-ready: once a mount has observed a non-regenerating state, treat
  // the design as ready for the rest of this mount. Falls back to the live
  // strip_status before the first observation so the loader still shows on
  // a fresh open during a legitimate regen.
  const liveReady = design ? design.strip_status !== 'regenerating' : false;
  const ready = sawReadyRef.current || liveReady;
  return {
    ready,
    loading: loading && !design,
    isActive: design?.is_active ?? false,
  };
}
