/**
 * localStorage-backed draft store for the conversion wizard, keyed PER
 * BUSINESS ('stampeo:convert-draft:<businessId>'). Same pattern as the
 * onboarding WizardShell's inline store, extracted convert-locally because
 * onboarding's is module-scoped to its own key ('stampeo:wizard-draft').
 *
 * The business scoping matters: a user with several businesses (or an admin
 * hopping between them) must never see business A's drafted design/rate leak
 * into business B's wizard — a leaked design_id from another business 404s
 * forever on the design step.
 *
 * Values survive step navigation and page reloads; the execute step clears
 * the store once the conversion completes, and the exit button clears it on
 * a confirmed abandon.
 */

/** Pre-scoping key (one draft shared across ALL businesses) — dropped on
 * sight so a stale cross-business draft can never resurface. */
const LEGACY_DRAFT_STORAGE_KEY = 'stampeo:convert-draft';

export function convertDraftKey(businessId: string): string {
  return `stampeo:convert-draft:${businessId}`;
}

export interface ConvertDraftStore {
  get: <T>(key: string) => T | undefined;
  set: (key: string, value: unknown) => void;
  clear: () => void;
}

export function createConvertDraftStore(businessId: string): ConvertDraftStore {
  const storageKey = convertDraftKey(businessId);
  let data: Record<string, unknown> = {};
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
      const stored = window.localStorage.getItem(storageKey);
      data = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }
  }

  const persist = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // localStorage can throw in private mode / quota-exceeded; the in-memory
      // copy still has the value so navigation within this session works.
    }
  };

  return {
    get<T>(key: string): T | undefined {
      return data[key] as T | undefined;
    },
    set(key: string, value: unknown) {
      data[key] = value;
      persist();
    },
    clear() {
      data = {};
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
      }
    },
  };
}
