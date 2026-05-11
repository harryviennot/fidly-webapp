"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  getCurrentImpersonation,
  endImpersonation,
  type CurrentImpersonationSession,
} from "@/api/impersonation";
import {
  API_BASE_URL,
  IMPERSONATION_TOKEN_KEY,
  clearImpersonationToken,
  getImpersonationToken,
} from "@/api/client";
import { createClient } from "@/utils/supabase/client";

interface ImpersonationContextValue {
  isImpersonating: boolean;
  session: CurrentImpersonationSession | null;
  loading: boolean;
  endSession: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextValue | undefined>(undefined);

const CHANNEL_NAME = "stmp_impersonation";
const HIDDEN_TAB_TIMEOUT_MS = 5 * 60 * 1000; // end after 5min hidden

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CurrentImpersonationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const hiddenTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!getImpersonationToken()) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      const current = await getCurrentImpersonation();
      setSession(current);
      if (!current) clearImpersonationToken();
    } catch {
      setSession(null);
      clearImpersonationToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const broadcastEnd = useCallback(() => {
    try {
      channelRef.current?.postMessage({ type: "ended" });
    } catch {
      /* channel disposed */
    }
  }, []);

  const endSession = useCallback(async () => {
    try {
      await endImpersonation();
    } finally {
      setSession(null);
      broadcastEnd();
    }
  }, [broadcastEnd]);

  // ── Cross-tab sync (#7) ────────────────────────────────────────────
  // When one tab ends impersonation, sibling tabs drop the banner
  // immediately instead of waiting for their next /current poll.
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;
    ch.onmessage = (e) => {
      if (e.data?.type === "ended") {
        clearImpersonationToken();
        setSession(null);
      }
    };
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  // ── localStorage cross-tab fallback ────────────────────────────────
  // BroadcastChannel covers tabs that are alive at the moment of end.
  // A tab that loads later still picks up the missing token via this
  // listener — covers the "operator logs out in tab A, switches to tab
  // B" case.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === IMPERSONATION_TOKEN_KEY && e.newValue === null) {
        setSession(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Supabase auth: logout ends impersonation (#1) ──────────────────
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Best-effort: fire the end call but don't await it; user is
        // already logging out so we can't block on the response.
        void endImpersonation().catch(() => {});
        clearImpersonationToken();
        setSession(null);
        broadcastEnd();
      }
    });
    return () => subscription.unsubscribe();
  }, [broadcastEnd]);

  // ── Tab close beacon (#5) ──────────────────────────────────────────
  // Fire /end with keepalive on unload. Note: this also fires on page
  // refresh — acceptable false positive, the operator just re-opens a
  // session if they meant to keep working.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!session) return;
    const onUnload = () => {
      const token = getImpersonationToken();
      if (!token) return;
      try {
        void fetch(`${API_BASE_URL}/admin/impersonation/end`, {
          method: "POST",
          headers: { "X-Impersonation-Token": token },
          credentials: "include",
          keepalive: true,
        });
      } catch {
        /* nothing else to do */
      }
      clearImpersonationToken();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [session]);

  // ── Hidden-tab inactivity (#6) ─────────────────────────────────────
  // When the operator switches away from this tab and stays away for
  // HIDDEN_TAB_TIMEOUT_MS, end the session. Server-side inactivity (#4)
  // is the source of truth, but this gives crisp UX: by the time they
  // come back, the banner is already gone.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!session) return;

    const clearHiddenTimer = () => {
      if (hiddenTimerRef.current !== null) {
        window.clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearHiddenTimer();
        hiddenTimerRef.current = window.setTimeout(() => {
          void endSession();
        }, HIDDEN_TAB_TIMEOUT_MS);
      } else {
        clearHiddenTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearHiddenTimer();
    };
  }, [session, endSession]);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: !!session,
        session,
        loading,
        endSession,
        refresh,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationContextValue {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}
