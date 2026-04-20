"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/auth-provider";
import { applyTheme, getAccentFromSettings, getBackgroundFromSettings } from "@/utils/theme";
import { businessKeys, fetchMemberships } from "@/hooks/use-business-query";
import { getMyProfile } from "@/api";
import { setLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/locale";
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
  hasAnyMembership: boolean;
  hasActiveMembership: boolean;
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

  // Sync locale from DB during loading phase (before content renders)
  const [localeSynced, setLocaleSynced] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    getMyProfile()
      .then((profile) => {
        if (profile.locale && (SUPPORTED_LOCALES as readonly string[]).includes(profile.locale)) {
          const cookieLocale = document.cookie
            .split("; ")
            .find((c) => c.startsWith("NEXT_LOCALE="))
            ?.split("=")[1];
          if (cookieLocale !== profile.locale) {
            // Cookie differs from DB — update cookie and reload with correct locale
            setLocale(profile.locale as Locale);
            return; // setLocale triggers reload, no need to continue
          }
        }
        setLocaleSynced(true);
      })
      .catch(() => setLocaleSynced(true));
  }, [user?.id]);

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

  const activeMemberships = memberships.filter(
    (m) => m.business.status === "active"
  );
  const hasAnyMembership = memberships.length > 0;
  const hasActiveMembership = activeMemberships.length > 0;

  // Reconcile currentBusinessId against memberships. Prefer an active
  // membership; never silently auto-select a suspended/pending one.
  useEffect(() => {
    if (!user?.id) return;
    const storedMatch = memberships.find(
      (m) => m.business.id === currentBusinessId
    );
    const storedIsActive = storedMatch?.business.status === "active";

    if (storedIsActive) return;

    if (activeMemberships.length > 0) {
      const nextId = activeMemberships[0].business.id;
      if (nextId !== currentBusinessId) {
        setCurrentBusinessId(nextId);
        localStorage.setItem("currentBusinessId", nextId);
      }
      return;
    }

    // No active membership — clear stale selection so stale IDs can't linger.
    if (currentBusinessId !== null) {
      setCurrentBusinessId(null);
      localStorage.removeItem("currentBusinessId");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, memberships.length, activeMemberships.length]);

  const membership =
    memberships.find((m) => m.business.id === currentBusinessId) ?? null;
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
        hasAnyMembership,
        hasActiveMembership,
        setCurrentBusiness,
        loading: isLoading || !localeSynced,
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
