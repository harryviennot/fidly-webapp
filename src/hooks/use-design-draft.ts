import { useEffect, useRef, useState, useCallback } from 'react';
import type { CardDesignCreate } from '@/types';

interface StoredDraft {
  data: CardDesignCreate;
  lastModified: number;
}

function getDraftKey(designId: string): string {
  return `design-draft-${designId}`;
}

function stripBlobUrls(data: CardDesignCreate): CardDesignCreate {
  const copy = { ...data };
  if (copy.logo_url?.startsWith('blob:')) delete copy.logo_url;
  if (copy.strip_background_url?.startsWith('blob:')) delete copy.strip_background_url;
  return copy;
}

/**
 * Synchronous read of a stored draft from localStorage.
 * Call this in a useState initializer to avoid flash of default data.
 */
export function getDesignDraft(designId: string): StoredDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getDraftKey(designId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (parsed?.data && typeof parsed.lastModified === 'number') {
      return parsed;
    }
  } catch {
    // Corrupted data — ignore
  }
  return null;
}

export type DraftStatus = 'idle' | 'saving' | 'saved';

/**
 * Hook for ongoing debounced persistence of form data to localStorage.
 * Call after useState is initialized.
 */
export function useDesignDraftPersistence(
  designId: string,
  formData: CardDesignCreate,
  serverUpdatedAt?: string,
): { draftStatus: DraftStatus; clearDraft: () => void } {
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout>>(null);
  const initialDataRef = useRef(JSON.stringify(stripBlobUrls(formData)));
  const isFirstRender = useRef(true);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey(designId));
    setDraftStatus('idle');
    // Update the reference so subsequent edits from the saved state aren't skipped
    initialDataRef.current = JSON.stringify(stripBlobUrls(formData));
  }, [designId, formData]);

  useEffect(() => {
    // Skip the first render — we don't want to save the initial/restored data immediately
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window === 'undefined') return;

    const stripped = stripBlobUrls(formData);

    // Don't save if data matches initial server data
    if (JSON.stringify(stripped) === initialDataRef.current) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);

    debounceRef.current = setTimeout(() => {
      setDraftStatus('saving');
      try {
        const draft: StoredDraft = {
          data: stripped,
          lastModified: Date.now(),
        };
        localStorage.setItem(getDraftKey(designId), JSON.stringify(draft));
        setDraftStatus('saved');

        fadeRef.current = setTimeout(() => {
          setDraftStatus('idle');
        }, 2000);
      } catch {
        // localStorage full or unavailable
        setDraftStatus('idle');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, [formData, designId, serverUpdatedAt]);

  return { draftStatus, clearDraft };
}
