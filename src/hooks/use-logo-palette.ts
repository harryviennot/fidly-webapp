'use client';

import { useEffect, useReducer } from 'react';
import {
  extractLogoPalette,
  getCachedPalette,
  hasCachedPalette,
  type LogoPalette,
} from '@/lib/logo-palette';

/**
 * React wrapper around `extractLogoPalette`. State is derived synchronously
 * from the module-level cache — the effect only kicks extraction and forces a
 * re-render once it finishes, so we never hit the
 * `react-hooks/set-state-in-effect` rule.
 *
 * Behaviour:
 *  - No URL → `{ palette: null, isLoading: false }`.
 *  - URL with a cache hit (success OR failed extraction) → that value, not loading.
 *  - URL not yet attempted → `{ palette: null, isLoading: true }` while in flight.
 */
export function useLogoPalette(logoUrl: string | undefined | null): {
  palette: LogoPalette | null;
  isLoading: boolean;
} {
  // Bump counter when extraction completes; cache is the actual source of
  // truth, this just re-renders the consumer to pick up the new value.
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!logoUrl) return;
    if (hasCachedPalette(logoUrl)) return; // either cached success or cached null
    let cancelled = false;
    extractLogoPalette(logoUrl).then(() => {
      if (cancelled) return;
      forceRender();
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const palette = logoUrl ? getCachedPalette(logoUrl) : null;
  const isLoading = Boolean(logoUrl) && !hasCachedPalette(logoUrl);
  return { palette, isLoading };
}
