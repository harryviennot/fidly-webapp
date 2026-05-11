"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getCurrentImpersonation,
  endImpersonation,
  type CurrentImpersonationSession,
} from "@/api/impersonation";
import { clearImpersonationToken, getImpersonationToken } from "@/api/client";

interface ImpersonationContextValue {
  isImpersonating: boolean;
  session: CurrentImpersonationSession | null;
  loading: boolean;
  endSession: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextValue | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CurrentImpersonationSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Skip the network call when we have no token stored — saves a 204 on
    // every mount for users not impersonating, which is the common path.
    if (!getImpersonationToken()) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      const current = await getCurrentImpersonation();
      setSession(current);
      // Server says no active session (e.g. expired) — drop the stale token.
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

  const endSession = useCallback(async () => {
    try {
      await endImpersonation();
    } finally {
      setSession(null);
    }
  }, []);

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
