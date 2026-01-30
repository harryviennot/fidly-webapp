"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/auth-provider";
import { applyTheme, getAccentFromSettings } from "@/utils/theme";

interface Business {
  id: string;
  name: string;
  url_slug: string;
  subscription_tier: "pay" | "pro";
  settings: Record<string, unknown>;
  logo_url?: string | null;
}

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
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentBusiness, setCurrentBusinessState] = useState<Business | null>(
    null
  );
  const [currentRole, setCurrentRole] = useState<MembershipRole | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  const loadMemberships = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user's public profile by auth_id
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profileError || !profile) {
        setError("User profile not found");
        setLoading(false);
        return;
      }

      // Get memberships with business details
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("memberships")
        .select("id, role, businesses(*)")
        .eq("user_id", profile.id);

      if (membershipsError) {
        setError("Failed to load memberships");
        setLoading(false);
        return;
      }

      if (membershipsData && membershipsData.length > 0) {
        const formatted: Membership[] = membershipsData.map((m) => ({
          id: m.id,
          role: m.role as MembershipRole,
          business: m.businesses as unknown as Business,
        }));
        setMemberships(formatted);

        // Auto-select business from localStorage or first one
        const savedBusinessId = localStorage.getItem("currentBusinessId");
        const savedMembership = formatted.find(
          (m) => m.business.id === savedBusinessId
        );
        const defaultMembership = savedMembership || formatted[0];

        setCurrentBusinessState(defaultMembership.business);
        setCurrentRole(defaultMembership.role);

        // Apply theme from business settings
        const accentColor = getAccentFromSettings(defaultMembership.business.settings);
        applyTheme(accentColor);
      } else {
        // No memberships - user needs to create a business
        setMemberships([]);
        setCurrentBusinessState(null);
        setCurrentRole(null);
      }
    } catch (err) {
      setError("An error occurred while loading your businesses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setCurrentBusiness = (business: Business) => {
    setCurrentBusinessState(business);
    localStorage.setItem("currentBusinessId", business.id);
    const membership = memberships.find((m) => m.business.id === business.id);
    setCurrentRole(membership?.role || null);

    // Apply theme from business settings
    const accentColor = getAccentFromSettings(business.settings);
    applyTheme(accentColor);
  };

  return (
    <BusinessContext.Provider
      value={{
        memberships,
        currentBusiness,
        currentRole,
        setCurrentBusiness,
        loading,
        error,
        refetch: loadMemberships,
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
