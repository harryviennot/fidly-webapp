'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CardDesign } from '@/types';
import { getDesigns, deleteDesign, activateDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';

interface LoyaltyProgramContextType {
  designs: CardDesign[];
  activeDesign: CardDesign | undefined;
  inactiveDesigns: CardDesign[];
  loading: boolean;
  error: string | null;
  isProPlan: boolean;
  refreshDesigns: () => Promise<void>;
  handleDelete: (designId: string) => Promise<void>;
  handleActivate: (designId: string) => Promise<void>;
}

const LoyaltyProgramContext = createContext<LoyaltyProgramContextType | null>(null);

export function useLoyaltyProgram() {
  const context = useContext(LoyaltyProgramContext);
  if (!context) {
    throw new Error('useLoyaltyProgram must be used within LoyaltyProgramLayout');
  }
  return context;
}

export default function LoyaltyProgramLayout({ children }: { children: ReactNode }) {
  const { currentBusiness } = useBusiness();
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isProPlan = currentBusiness?.subscription_tier === 'pro';
  const activeDesign = designs.find((d) => d.is_active);
  const inactiveDesigns = designs.filter((d) => !d.is_active);

  const loadDesigns = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const data = await getDesigns(currentBusiness.id);
      setDesigns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const handleDelete = async (designId: string) => {
    if (!currentBusiness?.id) return;
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await deleteDesign(currentBusiness.id, designId);
      await loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleActivate = async (designId: string) => {
    if (!currentBusiness?.id) return;

    try {
      await activateDesign(currentBusiness.id, designId);
      await loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate design');
    }
  };

  return (
    <LoyaltyProgramContext.Provider
      value={{
        designs,
        activeDesign,
        inactiveDesigns,
        loading,
        error,
        isProPlan,
        refreshDesigns: loadDesigns,
        handleDelete,
        handleActivate,
      }}
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
            {error}
          </div>
        )}
        {children}
      </div>
    </LoyaltyProgramContext.Provider>
  );
}
