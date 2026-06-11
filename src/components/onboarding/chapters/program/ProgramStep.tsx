'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NumberStepper } from '@/components/reusables/number-stepper';
import { SmoothHeight } from '@/components/reusables/smooth-height';
import { InfoPopover } from '@/components/reusables/info-popover';
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
import {
  getBusinessTypeDefaults,
  PROFILE_BUSINESS_TYPE_DRAFT_KEY,
} from '../../businessTypeDefaults';

const MAX_STAMPS = 21;

/**
 * Backend stock names we want to override with a business-personalised
 * default. Anything else is treated as a user-set name and preserved.
 */
const PLACEHOLDER_PROGRAM_NAMES = new Set([
  '',
  'My Loyalty Program',
  'New Loyalty Program',
  'Programme',
  'Programme de fidélité',
  'Fidélité',
]);

/**
 * Chapter 3 — required. The wizard's standalone program form (separate from
 * the dashboard's `ProgramDetailsForm`) so we can apply the wizard's design
 * language without disturbing the settings page.
 *
 * Composes wizard form primitives: `WizardField`, `WizardChipGroup`,
 * `StampsSelector`. The dashboard's existing form is unchanged.
 */
export function ProgramStep() {
  const t = useTranslations('onboardingBusiness.chapters.program.steps.program');
  const tLp = useTranslations('loyaltyProgram');
  const tErr = useTranslations('onboardingBusiness.errors');
  const tDef = useTranslations('onboardingBusiness.defaults');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { data: program } = useDefaultProgram(businessId);
  const { data: designs = [] } = useDesigns(businessId);
  const activeDesign = designs.find((d) => d.is_active) ?? null;
  const { mutateAsync: updateProgram } = useUpdateProgram(businessId);
  const ctx = useWizardStep();

  const businessName = currentBusiness?.name?.trim() ?? '';
  const defaultProgramName = businessName ? tLp('defaultProgramName', { businessName }) : '';
  // Smart defaults seeded from step 2's business-type chip. Read the draft
  // first — ProfileStep writes the picked chip synchronously, so the value is
  // always current even when the background save to `settings.business_type`
  // hasn't landed yet on the first mount of this step.
  const draftedBusinessType = ctx.getDraft<string>(PROFILE_BUSINESS_TYPE_DRAFT_KEY);
  const bizDefaults = getBusinessTypeDefaults(
    draftedBusinessType || currentBusiness?.settings?.business_type
  );

  // Drafted form state. Falls back to the program loaded from the server,
  // except for the name where we prefer a business-personalised default over
  // the backend's stock "My Loyalty Program" placeholder.
  const [programName, setProgramName] = useWizardDraft<string>(
    'program.programName',
    () => {
      const existing = program?.name?.trim();
      if (existing && !PLACEHOLDER_PROGRAM_NAMES.has(existing)) return existing;
      return defaultProgramName;
    }
  );
  const [totalStamps, setTotalStamps] = useWizardDraft<number>(
    'program.totalStamps',
    () => Math.min(program?.config?.total_stamps ?? bizDefaults.totalStamps, MAX_STAMPS)
  );
  const [rewardName, setRewardName] = useWizardDraft<string>(
    'program.rewardName',
    () => program?.reward_name || tDef(bizDefaults.rewardNameKey)
  );
  const [stackableRewards, setStackableRewards] = useWizardDraft<boolean>(
    'program.stackableRewards',
    () => program?.config?.stackable_rewards ?? false
  );
  const [maxStackedRewards, setMaxStackedRewards] = useWizardDraft<number | null>(
    'program.maxStackedRewards',
    () => program?.config?.max_stacked_rewards ?? null
  );
  const [initialStamps, setInitialStamps] = useWizardDraft<number>(
    'program.initialStamps',
    () => program?.config?.initial_stamps ?? 0
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
    () => ({
      programName,
      totalStamps,
      rewardName,
      stackableRewards,
      maxStackedRewards,
      initialStamps,
    }),
    [programName, totalStamps, rewardName, stackableRewards, maxStackedRewards, initialStamps]
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
                config: {
                  ...programConfig,
                  total_stamps: stamps,
                  stackable_rewards: snapshot.stackableRewards,
                  max_stacked_rewards: snapshot.maxStackedRewards,
                  // Clamp defensively: the stepper caps live, but the goal
                  // can shrink after the prestamp was drafted.
                  initial_stamps: Math.max(0, Math.min(snapshot.initialStamps, stamps - 1)),
                  user_configured: true,
                },
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
      <header className="flex flex-col gap-1 animate-slide-up">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-6 animate-slide-up delay-80">
        <WizardField
          label={tLp('programName')}
          htmlFor="program-name"
          helper={tLp('programNameHelp')}
          required
        >
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
            layout="stack"
          />
        </WizardField>

        <WizardField label={tLp('stampsToEarn')}>
          <StampsSelector
            value={totalStamps}
            onChange={setTotalStamps}
            activeDesign={activeDesign}
            max={MAX_STAMPS}
            ariaLabel={tLp('stampsToEarn')}
            dotColorMode="accent"
          />
        </WizardField>

        {/* Prestamp (head start) — same row layout as the settings page */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="text-[12px] font-semibold text-[#555]">
                {tLp('prestamp.label')}
              </label>
              <InfoPopover content={tLp('prestamp.help')} />
            </div>
            <NumberStepper
              value={initialStamps}
              onChange={(next) =>
                setInitialStamps(Math.max(0, Math.min(next ?? 0, totalStamps - 1)))
              }
              min={0}
              max={totalStamps - 1}
              aria-label={tLp('prestamp.label')}
            />
          </div>
          <p className="text-[11.5px] text-[#8A8A8A] leading-[1.4] mt-1">
            {tLp('prestamp.description')}
          </p>
        </div>

        <WizardField label={tLp('rewardLabel')} htmlFor="program-reward" required>
          <Input
            id="program-reward"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            placeholder={tLp('rewardNamePlaceholder')}
            className="h-11"
          />
        </WizardField>

        {/* Stackable rewards — same row layout as the settings page */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="text-[12px] font-semibold text-[#555]">
                {tLp('stackableRewards.label')}
              </label>
              <InfoPopover content={tLp('stackableRewards.help')} />
            </div>
            <Switch
              checked={stackableRewards}
              onCheckedChange={setStackableRewards}
              aria-label={tLp('stackableRewards.label')}
            />
          </div>
          <p className="text-[11.5px] text-[#8A8A8A] leading-[1.4] mt-1">
            {tLp('stackableRewards.description')}
          </p>
          <SmoothHeight>
            {stackableRewards && (
              <div className="flex items-center justify-between gap-3 pt-3 animate-slide-up">
                <div className="flex items-center gap-1.5 min-w-0">
                  <label className="text-[12px] font-semibold text-[#555]">
                    {tLp('stackableRewards.maxLabel')}
                  </label>
                  <InfoPopover content={tLp('stackableRewards.maxHelp')} />
                </div>
                <NumberStepper
                  value={maxStackedRewards}
                  onChange={setMaxStackedRewards}
                  min={1}
                  max={99}
                  allowEmpty
                  emptyLabel={tLp('stackableRewards.unlimited')}
                  aria-label={tLp('stackableRewards.maxLabel')}
                />
              </div>
            )}
          </SmoothHeight>
        </div>
      </div>
    </div>
  );
}
