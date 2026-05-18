'use client';

import { useSyncExternalStore } from 'react';

/**
 * True when the device looks like a phone/tablet — i.e. no precise pointer
 * and no hover. Unlike `useIsMobile()` which checks viewport width (and
 * returns true for any narrow desktop window), this answers the question
 * "is this user actually on a touch device that can install a wallet pass?"
 *
 * A narrow desktop browser stays `false` here; Apple/Google Wallet aren't
 * available on desktop OSes, so the install flow shouldn't pretend they are.
 *
 * SSR-safe via `useSyncExternalStore` — initial render returns `false`,
 * client subscribes to the matchMedia, no setState-in-effect.
 */
const QUERY = '(hover: none) and (pointer: coarse)';

export function useIsMobileDevice(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(QUERY);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
