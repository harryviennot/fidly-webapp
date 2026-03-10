"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/auth-provider";
import { applyTheme, getAccentFromSettings, getBackgroundFromSettings } from "@/utils/theme";
import { businessKeys, fetchMemberships } from "@/hooks/use-business-query";
import { Business } from "@/types";

type MembershipRole = "owner" | "admin" | "scanner";

interface Membership {
  id: string;
  role: MembershipRole;
  business: Business;
}

interface BusinessContextType {
  memberships: Membership[];
  currentBusiness: Business | null;
  currentRole: MembershipRole | null;
  setCurrentBusiness: (business: Business) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(
  undefined
);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("currentBusinessId") : null)
  );

  const {
    data: rawMemberships = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: businessKeys.memberships(user?.id ?? ""),
    queryFn: () => fetchMemberships(user!.id),
    enabled: !!user?.id,
  });

  const memberships: Membership[] = rawMemberships.map((m) => ({
    id: m.id,
    role: m.role as MembershipRole,
    business: m.businesses as unknown as Business,
  }));

  // Once memberships load, ensure currentBusinessId points to a valid membership
  useEffect(() => {
    if (memberships.length === 0) return;
    const valid = memberships.find((m) => m.business.id === currentBusinessId);
    if (!valid) {
      // savedId not in memberships (or never set) — fall back to first
      setCurrentBusinessId(memberships[0].business.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships.length]);

  const membership =
    memberships.find((m) => m.business.id === currentBusinessId) ??
    memberships[0] ??
    null;
  const currentBusiness = membership?.business ?? null;
  const currentRole = membership?.role ?? null;

  // Apply theme whenever the selected business changes
  useEffect(() => {
    if (!currentBusiness) return;
    const accentColor = getAccentFromSettings(currentBusiness.settings);
    const secondaryColor = getBackgroundFromSettings(currentBusiness.settings);
    applyTheme(accentColor, secondaryColor ?? undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, currentBusiness?.settings]);

  // Subscribe to realtime business status changes
  useEffect(() => {
    if (!currentBusiness?.id) return;

    const channel = supabase
      .channel(`business-status-${currentBusiness.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "businesses",
          filter: `id=eq.${currentBusiness.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as Record<string, unknown>).status;
          if (newStatus && newStatus !== currentBusiness.status) {
            queryClient.invalidateQueries({
              queryKey: businessKeys.memberships(user!.id),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, currentBusiness?.status]);

  const setCurrentBusiness = (business: Business) => {
    setCurrentBusinessId(business.id);
    localStorage.setItem("currentBusinessId", business.id);
    const accentColor = getAccentFromSettings(business.settings);
    const secondaryColor = getBackgroundFromSettings(business.settings);
    applyTheme(accentColor, secondaryColor ?? undefined);
  };

  const refetch = () =>
    queryClient.invalidateQueries({
      queryKey: businessKeys.memberships(user?.id ?? ""),
    });

  return (
    <BusinessContext.Provider
      value={{
        memberships,
        currentBusiness,
        currentRole,
        setCurrentBusiness,
        loading: isLoading,
        error: queryError ? "Failed to load memberships" : null,
        refetch,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
