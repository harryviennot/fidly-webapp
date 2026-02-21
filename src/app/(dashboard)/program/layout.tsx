'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import type { CardDesign, LoyaltyProgram, LoyaltyProgramUpdate } from '@/types';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { getPlanLimits, isLimitExceededError } from '@/lib/features';
import { useDefaultProgram, useUpdateProgram, programKeys } from '@/hooks/use-programs';
import {
  useDesigns,
  useDeleteDesign,
  useActivateDesign,
  useDuplicateDesign,
  designKeys,
} from '@/hooks/use-designs';

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
  const queryClient = useQueryClient();
  const businessId = currentBusiness?.id;

  const isProPlan = currentBusiness?.subscription_tier === 'pro';

  // Queries
  const {
    data: program,
    isLoading: programLoading,
    error: programError,
  } = useDefaultProgram(businessId);

  const {
    data: designs = [],
    isLoading: designsLoading,
    error: designsError,
  } = useDesigns(businessId);

  // Derived
  const activeDesign = useMemo(() => designs.find((d) => d.is_active), [designs]);
  const inactiveDesigns = useMemo(() => designs.filter((d) => !d.is_active), [designs]);
  const loading = programLoading || designsLoading;
  const error = programError?.message || designsError?.message || null;

  // Mutations
  const updateProgramMutation = useUpdateProgram(businessId);
  const deleteMutation = useDeleteDesign(businessId);
  const activateMutation = useActivateDesign(businessId);
  const duplicateMutation = useDuplicateDesign(businessId);

  const handleUpdateProgram = async (data: LoyaltyProgramUpdate) => {
    if (!businessId || !program?.id) return;
    try {
      await updateProgramMutation.mutateAsync({ programId: program.id, data });
      toast.success(t('toasts.programUpdated'));
    } catch (err) {
      console.error('Failed to update program:', err);
      toast.error(t('toasts.programUpdateFailed'));
      throw err;
    }
  };

  const handleDelete = async (designId: string) => {
    if (!businessId) return;
    if (!confirm(tDesign('deleteConfirm'))) return;
    try {
      await deleteMutation.mutateAsync(designId);
      toast.success(tDesign('toasts.cardDeleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleActivate = async (designId: string) => {
    if (!businessId) return;
    try {
      await activateMutation.mutateAsync(designId);
      toast.success(tDesign('toasts.cardActivated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate design');
    }
  };

  const handleDuplicate = async (designId: string) => {
    if (!businessId) return;
    const limits = getPlanLimits(currentBusiness?.subscription_tier || 'pay');
    if (limits.max_card_designs !== null && designs.length >= limits.max_card_designs) {
      toast.error(`Design limit reached. Your plan allows ${limits.max_card_designs} design(s). Upgrade to Pro for unlimited designs.`);
      return;
    }
    try {
      await duplicateMutation.mutateAsync(designId);
      toast.success(tDesign('toasts.cardDuplicated'));
    } catch (err: unknown) {
      if (isLimitExceededError(err)) {
        toast.error(err.detail.message || 'Design limit reached. Upgrade to Pro for more designs.');
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate design');
    }
  };

  const refreshProgram = async () => {
    if (!businessId) return;
    await queryClient.invalidateQueries({ queryKey: programKeys.default(businessId) });
  };

  const refreshDesigns = async () => {
    if (!businessId) return;
    await queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
  };

  return (
    <ProgramContext.Provider
      value={{
        program: program ?? undefined,
        designs,
        activeDesign,
        inactiveDesigns,
        loading,
        error,
        isProPlan,
        refreshProgram,
        refreshDesigns,
        updateProgram: handleUpdateProgram,
        handleDelete,
        handleActivate,
        handleDuplicate,
      }}
    >
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6">
          {error}
        </div>
      )}
      {children}
    </ProgramContext.Provider>
  );
}
