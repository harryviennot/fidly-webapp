'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getCustomers, getCustomerWalletStatus } from '@/api/customers';
import { createClient } from '@/utils/supabase/client';

export interface BusinessInstall {
  customer_id: string;
  name: string;
  email: string;
  enrollment_id: string | null;
  stamps: number;
  /** Points balance for points programs (progress.points). 0 for stamp
   *  programs, which track progress.stamps instead. */
  points: number;
  has_apple: boolean;
  has_google: boolean;
  installed: boolean;
}

export interface UseBusinessInstallsResult {
  installs: BusinessInstall[];
  installedCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Source of truth for "every customer of this business + whether their pass
 * is currently installed". Powers the first-stamp install/stamp steps and
 * the first-broadcast recipient count.
 *
 * Why we re-query instead of caching install state in the wizard payload:
 * the pass-installed signal is a `push_registrations` row, which can be
 * unregistered server-side at any time (user removes the pass). Latching
 * "installed = true" in the wizard would lie on revisit.
 *
 * Realtime: any INSERT/DELETE on `customers` or `push_registrations` for
 * this business triggers a refetch. We deliberately keep the realtime
 * payload unused — it's just a "something changed" tick.
 */
export function useBusinessInstalls(businessId: string | undefined): UseBusinessInstallsResult {
  const [installs, setInstalls] = useState<BusinessInstall[]>([]);
  const [loading, setLoading] = useState(true);
  // Guard against overlapping refetches racing each other into setState.
  const refetchSeq = useRef(0);

  const fetchAll = useCallback(async () => {
    if (!businessId) {
      setInstalls([]);
      setLoading(false);
      return;
    }
    const seq = ++refetchSeq.current;
    try {
      const page = await getCustomers(businessId, { limit: 100 });
      if (seq !== refetchSeq.current) return;
      const customers = page.data ?? [];
      const statuses = await Promise.all(
        customers.map((c) =>
          getCustomerWalletStatus(businessId, c.id).catch(() => ({
            installed: false,
            apple: false,
            google: false,
          }))
        )
      );
      if (seq !== refetchSeq.current) return;
      const merged: BusinessInstall[] = customers.map((c, i) => {
        const status = statuses[i];
        return {
          customer_id: c.id,
          name: c.name,
          email: c.email ?? "",
          enrollment_id: c.enrollments?.[0]?.id ?? null,
          stamps: c.enrollments?.[0]?.progress?.stamps ?? c.stamps ?? 0,
          // Type-agnostic headline counter from the list RPC (migration 128):
          // the points balance for points programs. Only read by the points
          // branch in StampStep, so it's safe to surface unconditionally.
          points: c.primary_value ?? c.enrollments?.[0]?.progress?.points ?? 0,
          has_apple: status.apple,
          has_google: status.google,
          installed: status.installed,
        };
      });
      setInstalls(merged);
    } catch {
      if (seq !== refetchSeq.current) return;
      setInstalls([]);
    } finally {
      if (seq === refetchSeq.current) setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    setLoading(true);
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    // Debounce realtime bursts (Apple device registration commonly fires
    // multiple inserts within a few hundred ms).
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fetchAll();
      }, 250);
    };

    const channel: RealtimeChannel = supabase
      .channel(`onboarding-installs-${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `business_id=eq.${businessId}` },
        schedule
      )
      .on(
        'postgres_changes',
        // push_registrations rows don't carry business_id — we filter
        // client-side by intersecting with the customers we've loaded.
        // A blanket subscription would fan out across every business, so
        // we listen unfiltered and let the refetch re-derive the truth.
        { event: '*', schema: 'public', table: 'push_registrations' },
        schedule
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [businessId, fetchAll]);

  const installedCount = installs.filter((i) => i.installed).length;

  return { installs, installedCount, loading, refetch: fetchAll };
}
