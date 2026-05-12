'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram, useUpdateProgram } from '@/hooks/use-programs';
import { useDesigns } from '@/hooks/use-designs';
import {
  StampsSelector,
  WizardChipGroup,
  WizardField,
  type ChipGroupOption,
} from '../../form';
import {
  useDirtySnapshot,
  useWizardDraft,
  useWizardStep,
} from '../../wizard-context';

const DEFAULTS = {
  programName: '',
  totalStamps: 10,
  rewardName: '',
};

/**
 * Chapter 3 — required. The wizard's standalone program form (separate from
 * the dashboard's `ProgramDetailsForm`) so we can apply the wizard's design
 * language without disturbing the settings page.
 *
 * Composes wizard form primitives: `WizardField`, `WizardChipGroup`,
 * `StampsSelector`. The dashboard's existing form is unchanged.
 */
export function ProgramStep() {
  const t = useTranslations('onboardingBusiness.chapters.program');
  const tLp = useTranslations('loyaltyProgram');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { data: program } = useDefaultProgram(businessId);
  const { data: designs = [] } = useDesigns(businessId);
  const activeDesign = designs.find((d) => d.is_active) ?? null;
  const { mutateAsync: updateProgram } = useUpdateProgram(businessId);
  const ctx = useWizardStep();

  // Drafted form state. Falls back to the program loaded from the server.
  const [programName, setProgramName] = useWizardDraft<string>(
    'program.programName',
    () => program?.name ?? DEFAULTS.programName
  );
  const [totalStamps, setTotalStamps] = useWizardDraft<number>(
    'program.totalStamps',
    () => program?.config?.total_stamps ?? DEFAULTS.totalStamps
  );
  const [rewardName, setRewardName] = useWizardDraft<string>(
    'program.rewardName',
    () => program?.reward_name ?? DEFAULTS.rewardName
  );

  // Only one type is currently active; the others render as disabled chips
  // with a "Coming soon" badge so the user sees the roadmap.
  const loyaltyTypeOptions: ChipGroupOption[] = useMemo(
    () => [
      {
        id: 'stamps',
        label: tLp('stampsType'),
        description: tLp('stampsTypeDesc'),
        emoji: '⭐',
      },
      {
        id: 'points',
        label: tLp('pointsType'),
        description: tLp('pointsTypeDesc'),
        emoji: '🎯',
        disabled: true,
        badge: tLp('comingSoonBadge'),
      },
      {
        id: 'tiered',
        label: tLp('tieredType'),
        description: tLp('tieredTypeDesc'),
        emoji: '🏆',
        disabled: true,
        badge: tLp('comingSoonBadge'),
      },
    ],
    [tLp]
  );

  const snapshot = useMemo(
    () => ({ programName, totalStamps, rewardName }),
    [programName, totalStamps, rewardName]
  );
  const { isDirty, markSaved } = useDirtySnapshot('program', snapshot);

  const isValid = programName.trim().length > 0 && rewardName.trim().length > 0;

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setCanProceed(isValid);
  }, [ctx, isValid]);

  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      if (!program?.id) {
        toast.error(tErr('saveFailed'));
        return { ok: false };
      }
      if (!programName.trim()) {
        toast.error(tErr('programNameRequired'));
        return { ok: false };
      }
      if (!rewardName.trim()) {
        toast.error(tErr('rewardRequired'));
        return { ok: false };
      }
      if (!isDirty) return { ok: true };

      const programId = program.id;
      const programConfig = program.config;
      const { programName: name, totalStamps: stamps, rewardName: reward } = snapshot;

      return {
        ok: true,
        save: async () => {
          try {
            await updateProgram({
              programId,
              data: {
                name,
                config: { ...programConfig, total_stamps: stamps, user_configured: true },
                reward_name: reward,
              },
            });
            markSaved();
            return { ok: true };
          } catch (err) {
            return {
              ok: false,
              reason: err instanceof Error ? err.message : tErr('saveFailed'),
            };
          }
        },
      };
    });
    return () => ctx.setSubmitHandler(null);
  }, [
    program,
    programName,
    rewardName,
    snapshot,
    isDirty,
    markSaved,
    updateProgram,
    ctx,
    tErr,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-6">
        <WizardField label={tLp('programName')} htmlFor="program-name">
          <Input
            id="program-name"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder={tLp('programNamePlaceholder')}
            className="h-11"
          />
        </WizardField>

        <WizardField label={tLp('loyaltyTypeLabel')}>
          <WizardChipGroup
            value="stamps"
            onChange={() => {
              /* points/tiered are disabled — no-op */
            }}
            options={loyaltyTypeOptions}
          />
        </WizardField>

        <WizardField label={tLp('stampsToEarn')}>
          <StampsSelector
            value={totalStamps}
            onChange={setTotalStamps}
            activeDesign={activeDesign}
            ariaLabel={tLp('stampsToEarn')}
          />
        </WizardField>

        <WizardField label={tLp('rewardLabel')} htmlFor="program-reward">
          <Input
            id="program-reward"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            placeholder={tLp('rewardNamePlaceholder')}
            className="h-11"
          />
        </WizardField>

        <div className="rounded-[12px] bg-[var(--paper)] border border-[var(--border-light)] px-4 py-3 wiz-body text-[#555] leading-relaxed">
          <span className="text-[#8A8A8A]">{tLp('previewSentence')}</span>{' '}
          <span className="font-semibold text-[var(--foreground)]">
            {tLp('previewText', {
              stamps: totalStamps,
              reward: rewardName || tLp('rewardFallback'),
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
