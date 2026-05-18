"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/auth-provider";
import { applyTheme, getAccentFromSettings, getBackgroundFromSettings } from "@/utils/theme";
import { businessKeys, fetchMemberships } from "@/hooks/use-business-query";
import { getMyProfile } from "@/api";
import { endImpersonation } from "@/api/impersonation";
import { useImpersonation } from "@/contexts/impersonation-context";
import { API_BASE_URL, getAuthHeaders } from "@/api/client";
import { setLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/locale";
import { bumpRecentAccess, getRecentAccess, type RecentAccessMap } from "@/lib/recent-business-access";
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
  isImpersonating: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(
  undefined
);

async function fetchImpersonatedBusiness(businessId: string): Promise<Business | null> {
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}`, {
    headers: await getAuthHeaders(),
    credentials: "include",
  });
  if (!response.ok) return null;
  return response.json();
}

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { isImpersonating, session: impersonationSession } = useImpersonation();

  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("currentBusinessId") : null)
  );

  // Tracks the last time the user explicitly switched to each business so
  // the switcher / list can sort by recent access. Lives in localStorage.
  const [recentAccess, setRecentAccess] = useState<RecentAccessMap>(() => getRecentAccess());

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

  // Impersonation branch: fetch the impersonated business via backend; skip
  // the Supabase memberships query, which would resolve as the superadmin
  // and produce the wrong identity downstream.
  const { data: impersonatedBusiness } = useQuery({
    queryKey: ["impersonated-business", impersonationSession?.business_id],
    queryFn: () => fetchImpersonatedBusiness(impersonationSession!.business_id),
    enabled: isImpersonating && !!impersonationSession?.business_id,
  });

  const {
    data: rawMemberships = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: businessKeys.memberships(user?.id ?? ""),
    queryFn: () => fetchMemberships(user!.id),
    enabled: !!user?.id && !isImpersonating,
  });

  // Memoised so the sort below only re-runs when the underlying memberships
  // actually change ref (after a refetch). Without this memo the inline
  // `.map(...)` recreated `unsortedMemberships` on every render, which would
  // force the sort to re-run on every render.
  const unsortedMemberships = useMemo<Membership[]>(() => {
    if (isImpersonating && impersonatedBusiness && impersonationSession) {
      return [{
        id: `imp-${impersonationSession.session_id}`,
        role: impersonationSession.target_role as MembershipRole,
        business: impersonatedBusiness,
      }];
    }
    return rawMemberships.map((m) => ({
      id: m.id,
      role: m.role as MembershipRole,
      business: m.businesses as unknown as Business,
    }));
  }, [isImpersonating, impersonatedBusiness, impersonationSession, rawMemberships]);

  // Sort by recent access: most-recently switched-to comes first. Ties
  // (never accessed) fall back to active-first, then alphabetical.
  //
  // Note: depends on `unsortedMemberships` directly, not just the IDs.
  // Earlier the dep array keyed by `ids.join(",")` so refetches that
  // returned identical IDs but updated business settings (e.g. after
  // saving `business_info`) didn't invalidate this memo — `currentBusiness`
  // kept serving the pre-save snapshot until the page reloaded.
  const memberships = useMemo(() => {
    return [...unsortedMemberships].sort((a, b) => {
      const aT = recentAccess[a.business.id] ?? 0;
      const bT = recentAccess[b.business.id] ?? 0;
      if (aT !== bT) return bT - aT;
      const aActive = a.business.status === "active" ? 1 : 0;
      const bActive = b.business.status === "active" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (a.business.name || "").localeCompare(b.business.name || "");
    });
  }, [unsortedMemberships, recentAccess]);

  const activeMemberships = memberships.filter(
    (m) => m.business.status === "active"
  );
  const hasAnyMembership = memberships.length > 0;
  const hasActiveMembership = activeMemberships.length > 0;

  // Reconcile currentBusinessId against memberships. Prefer an active
  // membership; never silently auto-select a suspended/pending one.
  useEffect(() => {
    if (!user?.id) return;

    // During impersonation, force the impersonated business as the current
    // one regardless of localStorage state.
    if (isImpersonating && impersonatedBusiness) {
      if (currentBusinessId !== impersonatedBusiness.id) {
        setCurrentBusinessId(impersonatedBusiness.id);
      }
      return;
    }

    // Don't touch the stored selection until the memberships query has
    // resolved — otherwise on refresh we would clobber a valid stored ID
    // with the first active membership before knowing what's available.
    if (isLoading) return;

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
  }, [user?.id, isLoading, memberships.length, activeMemberships.length, isImpersonating, impersonatedBusiness?.id]);

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
    // STA-140: during impersonation the Supabase session belongs to the
    // superadmin; subscribing here would attach the wrong identity to the
    // realtime channel. The dashboard refresh button is enough in v1.
    if (isImpersonating) return;

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
  }, [currentBusiness?.id, currentBusiness?.status, isImpersonating]);

  const setCurrentBusiness = (business: Business) => {
    // Switching businesses while impersonating ends the session — the
    // operator is leaving the impersonated context, and the audit log
    // should reflect that as a clean exit, not a silent drift.
    if (isImpersonating) {
      void endImpersonation();
    }
    setCurrentBusinessId(business.id);
    localStorage.setItem("currentBusinessId", business.id);
    setRecentAccess(bumpRecentAccess(business.id));
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
        isImpersonating,
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
