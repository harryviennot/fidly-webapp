'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChanges(isDirty: boolean, onConfirmLeave?: () => void) {
  const router = useRouter();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // No beforeunload — only guard in-app navigation

  // Intercept in-app link clicks (capture phase)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;

      // Walk up from target to find an anchor element
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (!target) return;

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute('href');

      // Only intercept internal navigation (relative paths)
      if (!href || !href.startsWith('/')) return;

      // Don't intercept if modifier keys are held (new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingUrl(href);
      setShowLeaveDialog(true);
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  const confirmLeave = useCallback(() => {
    setShowLeaveDialog(false);
    onConfirmLeave?.();
    if (pendingUrl) {
      // Temporarily clear dirty ref so the click handler doesn't re-intercept
      isDirtyRef.current = false;
      router.push(pendingUrl);
      setPendingUrl(null);
    }
  }, [pendingUrl, router, onConfirmLeave]);

  const cancelLeave = useCallback(() => {
    setShowLeaveDialog(false);
    setPendingUrl(null);
  }, []);

  return { showLeaveDialog, pendingUrl, confirmLeave, cancelLeave };
}
