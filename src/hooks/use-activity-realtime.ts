"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { activityKeys } from "./use-activity-stats";

/** Live activity feed. Subscribes to new transaction rows for this business and
 *  invalidates the feed + stats so the page updates on a real scan instead of a
 *  30s poll. Every feed event (stamp/reward/void/card add/delete) is an INSERT,
 *  so one INSERT subscription covers them all. Mirrors the Supabase Realtime
 *  pattern used by the onboarding install tracker (useBusinessInstalls). */
export function useActivityRealtime(businessId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();

    // Debounce bursts: a single scan can write a stamp and a reward at once.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // Feed: invalidate every filter variant via the key prefix.
        queryClient.invalidateQueries({
          queryKey: ["activity", businessId, "feed"],
        });
        // Stats: keep the "pulse" cards live too.
        queryClient.invalidateQueries({
          queryKey: activityKeys.stats(businessId),
        });
      }, 250);
    };

    const channel: RealtimeChannel = supabase
      .channel(`activity-feed-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `business_id=eq.${businessId}`,
        },
        schedule
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);
}
