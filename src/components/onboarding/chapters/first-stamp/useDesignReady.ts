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
 * Resilient to remounts: every mount kicks off a fresh `getDesign` read AND
 * resubscribes to the channel. If the user closes the wizard mid-regen and
 * comes back later, the initial read returns `strip_status='ready'` and we
 * surface that immediately without waiting for a realtime event.
 *
 * Pass `enabled=false` when the design id isn't known yet (e.g. business
 * cache still loading); the hook reports `loading=true` until enabled.
 */
export function useDesignReady(
  businessId: string | undefined,
  designId: string | undefined
): UseDesignReadyResult {
  const queryClient = useQueryClient();
  const [design, setDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  // Sticky-ready flag: flips true the first time we observe a non-regenerating
  // `strip_status` for this mount. Once flipped, it ignores later events that
  // would otherwise drop us back into the loader — that scenario (UI was
  // showing install, then suddenly went back to loading and got stuck) was
  // reported in dev when the `activate` endpoint's set_active two-step
  // update fired a transient row state that the realtime channel re-broadcast
  // before the matching "ready" update could land.
  const sawReadyRef = useRef(false);

  useEffect(() => {
    if (!businessId || !designId) {
      setLoading(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // Reset the sticky flag whenever the (businessId, designId) pair changes
    // — a new design legitimately starts in a regenerating window of its own
    // and shouldn't inherit the previous row's "ready" sticky.
    sawReadyRef.current = false;

    // Initial read: covers the "user came back later, regen already done"
    // case so we don't show the loader needlessly.
    (async () => {
      try {
        const fresh = await getDesign(businessId, designId);
        if (cancelled) return;
        setDesign(fresh);
        if (fresh.strip_status !== 'regenerating') {
          sawReadyRef.current = true;
        }
      } catch {
        // Non-fatal — stay in loading state; realtime updates may still land.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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
