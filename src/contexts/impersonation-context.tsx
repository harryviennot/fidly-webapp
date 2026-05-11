"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getCurrentImpersonation,
  endImpersonation,
  type CurrentImpersonationSession,
} from "@/api/impersonation";

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
    try {
      const current = await getCurrentImpersonation();
      setSession(current);
    } catch {
      setSession(null);
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
