'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { CardDesign, LoyaltyProgram } from '@/types';
import { getDesigns, deleteDesign, activateDesign, duplicateDesign, getPrograms, updateProgram as updateProgramApi } from '@/api';
import type { LoyaltyProgramUpdate } from '@/types';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { getPlanLimits, isLimitExceededError } from '@/lib/features';
import { ProgramNav } from '@/components/program/program-nav';

interface ProgramContextType {
  program: LoyaltyProgram | undefined;
  designs: CardDesign[];
  activeDesign: CardDesign | undefined;
  inactiveDesigns: CardDesign[];
  loading: boolean;
  error: string | null;
  isProPlan: boolean;
  refreshProgram: () => Promise<void>;
  refreshDesigns: () => Promise<void>;
  updateProgram: (data: LoyaltyProgramUpdate) => Promise<void>;
  handleDelete: (designId: string) => Promise<void>;
  handleActivate: (designId: string) => Promise<void>;
  handleDuplicate: (designId: string) => Promise<void>;
}

const ProgramContext = createContext<ProgramContextType | null>(null);

export function useProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within ProgramLayout');
  }
  return context;
}

export default function ProgramLayout({ children }: { children: ReactNode }) {
  const { currentBusiness } = useBusiness();
  const t = useTranslations('loyaltyProgram');
  const tDesign = useTranslations('designEditor');

  const [program, setProgram] = useState<LoyaltyProgram | undefined>();
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isProPlan = currentBusiness?.subscription_tier === 'pro';
  const activeDesign = designs.find((d) => d.is_active);
  const inactiveDesigns = designs.filter((d) => !d.is_active);

  useEffect(() => {
    if (!currentBusiness?.id) return;
    let cancelled = false;

    async function load() {
      try {
        const [programs, designData] = await Promise.all([
          getPrograms(currentBusiness!.id),
          getDesigns(currentBusiness!.id),
        ]);
        if (cancelled) return;
        const defaultProgram = programs.find((p) => p.is_default) || programs[0];
        setProgram(defaultProgram);
        setDesigns(designData);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentBusiness?.id]);

  const loadProgram = async () => {
    if (!currentBusiness?.id) return;
    try {
      const programs = await getPrograms(currentBusiness.id);
      const defaultProgram = programs.find((p) => p.is_default) || programs[0];
      setProgram(defaultProgram);
    } catch (err) {
      console.error('Failed to load program:', err);
    }
  };

  const loadDesigns = async () => {
    if (!currentBusiness?.id) return;
    try {
      const data = await getDesigns(currentBusiness.id);
      setDesigns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs');
    }
  };

  const handleUpdateProgram = async (data: LoyaltyProgramUpdate) => {
    if (!currentBusiness?.id || !program?.id) return;
    try {
      const updated = await updateProgramApi(currentBusiness.id, program.id, data);
      setProgram(updated);
      toast.success(t('toasts.programUpdated'));
    } catch (err) {
      console.error('Failed to update program:', err);
      toast.error(t('toasts.programUpdateFailed'));
      throw err;
    }
  };

  const handleDelete = async (designId: string) => {
    if (!currentBusiness?.id) return;
    if (!confirm(tDesign('deleteConfirm'))) return;
    try {
      await deleteDesign(currentBusiness.id, designId);
      await loadDesigns();
      toast.success(tDesign('toasts.cardDeleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleActivate = async (designId: string) => {
    if (!currentBusiness?.id) return;
    try {
      await activateDesign(currentBusiness.id, designId);
      await loadDesigns();
      toast.success(tDesign('toasts.cardActivated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate design');
    }
  };

  const handleDuplicate = async (designId: string) => {
    if (!currentBusiness?.id) return;
    const limits = getPlanLimits(currentBusiness.subscription_tier || 'pay');
    if (limits.max_card_designs !== null && designs.length >= limits.max_card_designs) {
      toast.error(`Design limit reached. Your plan allows ${limits.max_card_designs} design(s). Upgrade to Pro for unlimited designs.`);
      return;
    }
    try {
      await duplicateDesign(currentBusiness.id, designId);
      await loadDesigns();
      toast.success(tDesign('toasts.cardDuplicated'));
    } catch (err: unknown) {
      if (isLimitExceededError(err)) {
        toast.error(err.detail.message || 'Design limit reached. Upgrade to Pro for more designs.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to duplicate design');
    }
  };

  return (
    <ProgramContext.Provider
      value={{
        program,
        designs,
        activeDesign,
        inactiveDesigns,
        loading,
        error,
        isProPlan,
        refreshProgram: loadProgram,
        refreshDesigns: loadDesigns,
        updateProgram: handleUpdateProgram,
        handleDelete,
        handleActivate,
        handleDuplicate,
      }}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <ProgramNav />
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
            {error}
          </div>
        )}
        {children}
      </div>
    </ProgramContext.Provider>
  );
}
