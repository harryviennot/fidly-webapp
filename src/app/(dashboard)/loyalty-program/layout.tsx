'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CardDesign } from '@/types';
import { getDesigns, deleteDesign, activateDesign, duplicateDesign } from '@/api';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { getPlanLimits, isLimitExceededError } from '@/lib/features';

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
  handleDuplicate: (designId: string) => Promise<void>;
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

  const handleDuplicate = async (designId: string) => {
    if (!currentBusiness?.id) return;

    // Check design limit before duplicating
    const limits = getPlanLimits(currentBusiness.subscription_tier || 'pay');
    if (limits.max_card_designs !== null && designs.length >= limits.max_card_designs) {
      toast.error(`Design limit reached. Your plan allows ${limits.max_card_designs} design(s). Upgrade to Pro for unlimited designs.`);
      return;
    }

    try {
      await duplicateDesign(currentBusiness.id, designId);
      await loadDesigns();
      toast.success('Card duplicated');
    } catch (err: unknown) {
      // Handle backend limit error
      if (isLimitExceededError(err)) {
        toast.error(err.detail.message || 'Design limit reached. Upgrade to Pro for more designs.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to duplicate design');
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
        handleDuplicate,
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
