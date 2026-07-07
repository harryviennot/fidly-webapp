'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NumberStepper } from '@/components/reusables/number-stepper';
import { InfoBox } from '@/components/reusables/info-box';
import { maxBalanceFloor } from '@/lib/points-config';
import { SmoothHeight } from '@/components/reusables/smooth-height';
import { InfoPopover } from '@/components/reusables/info-popover';
import { RewardMenuEditor } from '@/components/program/forms/RewardMenuEditor';
import { useBusiness } from '@/contexts/business-context';
import {
  useDefaultProgram,
  useSwitchProgramType,
  useUpdateProgram,
} from '@/hooks/use-programs';
import { useDesigns } from '@/hooks/use-designs';
import { ApiError } from '@/api/client';
import { currencySymbol } from '@/lib/currency';
import { isPointsProgram, isStampProgram, type RewardTier } from '@/types';
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
import { useCustomerCount } from './useCustomerCount';
import { buildProgramSavePlan, MAX_SWITCH_CUSTOMERS } from './programSavePlan';
import { SwitchProgramTypeDialog } from './SwitchProgramTypeDialog';

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
  const { mutateAsync: switchType } = useSwitchProgramType(businessId);
  const ctx = useWizardStep();

  // How many customers already exist. A type switch after test installs
  // converts them in place (confirm dialog) and is blocked above MAX_SWITCH.
  const customerCount = useCustomerCount(businessId);

  // Switch-dialog interception: the confirm re-runs the submit with the ref
  // set (mirrors the convert wizard's ReviewStep). The shell owns the busy
  // state during the awaited switch.
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const confirmedSwitchRef = useRef(false);

  const currency = currencySymbol(currentBusiness?.country, currentBusiness?.primary_locale);

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
  const stampConfig = isStampProgram(program) ? program.config : null;
  const [totalStamps, setTotalStamps] = useWizardDraft<number>(
    'program.totalStamps',
    () => Math.min(stampConfig?.total_stamps ?? bizDefaults.totalStamps, MAX_STAMPS)
  );
  const [rewardName, setRewardName] = useWizardDraft<string>(
    'program.rewardName',
    () => program?.reward_name || tDef(bizDefaults.rewardNameKey)
  );
  const [stackableRewards, setStackableRewards] = useWizardDraft<boolean>(
    'program.stackableRewards',
    () => stampConfig?.stackable_rewards ?? false
  );
  const [maxStackedRewards, setMaxStackedRewards] = useWizardDraft<number | null>(
    'program.maxStackedRewards',
    () => stampConfig?.max_stacked_rewards ?? null
  );
  const [initialStamps, setInitialStamps] = useWizardDraft<number>(
    'program.initialStamps',
    () => stampConfig?.initial_stamps ?? 0
  );

  // Chip ids are plural ('stamps'); the backend type is singular ('stamp').
  const [loyaltyType, setLoyaltyType] = useWizardDraft<'stamps' | 'points'>(
    'program.loyaltyType',
    () => (program?.type === 'points' ? 'points' : 'stamps')
  );

  // Points config drafts. Seed the reward menu from an existing points program,
  // else a single starter reward using the business-type default name.
  const [pointsRate, setPointsRate] = useWizardDraft<number>(
    'program.pointsRate',
    () => (isPointsProgram(program) ? program.config.points_per_currency_unit ?? 1 : 1)
  );
  const [pointsRewards, setPointsRewards] = useWizardDraft<RewardTier[]>(
    'program.pointsRewards',
    () =>
      isPointsProgram(program) && program.config.rewards?.length
        ? program.config.rewards
        : [{ id: 'r_default', name: program?.reward_name || tDef(bizDefaults.rewardNameKey), threshold: 100 }]
  );
  const [maxBalance, setMaxBalance] = useWizardDraft<number | null>(
    'program.maxBalance',
    () => (isPointsProgram(program) ? program.config.max_balance ?? null : null)
  );

  // The cap must always cover the priciest reward (it would be unreachable
  // otherwise; the backend rejects such a config). Adding a bigger reward
  // auto-raises the cap — keyed on rewards only so typing isn't fought.
  useEffect(() => {
    if (maxBalance === null) return;
    const floor = maxBalanceFloor(pointsRewards);
    if (maxBalance < floor) setMaxBalance(floor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsRewards]);

  // Stamps and points are both selectable.
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
      },
    ],
    [tLp]
  );

  const isPoints = loyaltyType === 'points';

  const snapshot = useMemo(
    () => ({
      programName,
      loyaltyType,
      totalStamps,
      rewardName,
      stackableRewards,
      maxStackedRewards,
      initialStamps,
      pointsRate,
      pointsRewards,
      maxBalance,
    }),
    [
      programName, loyaltyType, totalStamps, rewardName, stackableRewards,
      maxStackedRewards, initialStamps, pointsRate, pointsRewards, maxBalance,
    ]
  );
  const { isDirty, markSaved } = useDirtySnapshot('program', snapshot);

  const pointsValid =
    pointsRate > 0 &&
    pointsRewards.length >= 1 &&
    pointsRewards.every((r) => r.name.trim().length > 0 && r.threshold > 0);
  const isValid =
    programName.trim().length > 0 &&
    (isPoints ? pointsValid : rewardName.trim().length > 0);

  // A type switch above the cap is a dead-end: block the CTA and explain
  // (the business is scanning real customers — finish setup, then convert).
  const typeChanged = program != null && (isPoints ? 'points' : 'stamp') !== program.type;
  const blockedByCustomers = typeChanged && customerCount > MAX_SWITCH_CUSTOMERS;

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setCanProceed(isValid && !blockedByCustomers);
  }, [ctx, isValid, blockedByCustomers]);

  // A fresh type selection invalidates a prior switch confirmation.
  useEffect(() => {
    confirmedSwitchRef.current = false;
  }, [loyaltyType]);

  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      const plan = buildProgramSavePlan({ program, snapshot, isDirty, customerCount });

      switch (plan.kind) {
        case 'invalid': {
          const key =
            plan.reason === 'programNameRequired'
              ? 'programNameRequired'
              : plan.reason === 'rewardRequired'
                ? 'rewardRequired'
                : 'saveFailed';
          toast.error(tErr(key));
          return { ok: false };
        }
        case 'noop':
          return { ok: true };
        case 'blocked':
          // The inline InfoBox already explains; keep the CTA a no-op.
          return { ok: false };
        case 'update':
          // Same-type edit: background save keeps the snappy forward nav.
          return {
            ok: true,
            save: async () => {
              try {
                await updateProgram({ programId: plan.programId, data: plan.data });
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
        case 'convert': {
          // Type change flips the program IN PLACE and converts the existing
          // test cards (reused, not deleted). When any card is out, confirm
          // first — the dialog re-runs this handler with the ref set. The
          // switch is AWAITED (not a background closure) so the flip + design
          // realignment finish before we navigate to the install step, which
          // reads their output.
          if (plan.needsConfirm && !confirmedSwitchRef.current) {
            setSwitchDialogOpen(true);
            return { ok: false };
          }
          if (!program?.id) {
            toast.error(tErr('saveFailed'));
            return { ok: false };
          }
          try {
            await switchType({
              programId: program.id,
              data: {
                to_type: plan.data.toType,
                config: plan.data.config,
                reward_name: plan.data.rewardName,
              },
            });
            markSaved();
            confirmedSwitchRef.current = false;
            return { ok: true };
          } catch (err) {
            confirmedSwitchRef.current = false;
            const reason =
              err instanceof ApiError && err.code === 'TOO_MANY_CUSTOMERS'
                ? tErr('tooManyCustomers')
                : err instanceof ApiError && err.code === 'SETUP_ALREADY_COMPLETE'
                  ? tErr('setupAlreadyComplete')
                  : err instanceof Error
                    ? err.message
                    : tErr('saveFailed');
            toast.error(reason);
            return { ok: false };
          }
        }
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [
    program,
    snapshot,
    isDirty,
    customerCount,
    markSaved,
    updateProgram,
    switchType,
    ctx,
    tErr,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 animate-slide-up">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{isPoints ? t('subtitlePoints') : t('subtitle')}</p>
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

        <WizardField
          label={tLp('loyaltyTypeLabel')}
          labelInfo={
            <InfoPopover
              label={t('typeHelp.label')}
              content={
                <div className="flex flex-col gap-2 text-left">
                  <div>
                    <p className="font-semibold">{t('typeHelp.stampsTitle')}</p>
                    <p>{t('typeHelp.stampsBody')}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{t('typeHelp.pointsTitle')}</p>
                    <p>{t('typeHelp.pointsBody')}</p>
                  </div>
                </div>
              }
            />
          }
        >
          <WizardChipGroup
            value={loyaltyType}
            onChange={(id) => setLoyaltyType(id as 'stamps' | 'points')}
            options={loyaltyTypeOptions}
            layout="stack"
          />
          {blockedByCustomers && (
            <InfoBox
              variant="warning"
              className="mt-3"
              message={t('typeBlocked', { count: customerCount })}
            />
          )}
        </WizardField>

        {!isPoints && (
          <>
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
                  <label className="wiz-body-sm font-medium text-[var(--foreground)]">
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
                  <label className="wiz-body-sm font-medium text-[var(--foreground)]">
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
          </>
        )}

        {isPoints && (
          <>
            {/* Earn rate — how many points 1 unit of spend is worth */}
            <WizardField label={tLp('points.rateLabel')} helper={tLp('points.rateHelp')}>
              <div className="flex items-center gap-2">
                <span className="wiz-body-sm text-[#7A7A7A]">
                  {tLp('points.ratePrefix', { currency })}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={Number.isFinite(pointsRate) ? pointsRate : ''}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    setPointsRate(Number.isNaN(n) ? 0 : n);
                  }}
                  className="h-11 w-24 text-center"
                  aria-label={tLp('points.rateLabel')}
                />
                <span className="wiz-body-sm text-[#7A7A7A]">{tLp('points.ratePoints')}</span>
              </div>
            </WizardField>

            {/* Reward menu — priced rewards customers redeem against their balance */}
            <WizardField label={tLp('points.rewardMenuLabel')} helper={tLp('points.rewardMenuHelp')}>
              <RewardMenuEditor value={pointsRewards} onChange={setPointsRewards} />
            </WizardField>

            {/* Optional balance cap */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <label className="wiz-body-sm font-medium text-[var(--foreground)]">
                    {tLp('points.capLabel')}
                  </label>
                  <InfoPopover content={tLp('points.capHelp')} />
                </div>
                <Switch
                  checked={maxBalance !== null}
                  onCheckedChange={(on) =>
                    setMaxBalance(
                      on ? maxBalance ?? Math.max(1000, maxBalanceFloor(pointsRewards)) : null
                    )
                  }
                  aria-label={tLp('points.capLabel')}
                />
              </div>
              <p className="text-[11.5px] text-[#8A8A8A] leading-[1.4] mt-1">
                {tLp('points.capDescription')}
              </p>
              <SmoothHeight>
                {maxBalance !== null && (
                  <div className="flex items-center justify-between gap-3 pt-3 animate-slide-up">
                    <label className="text-[12px] font-semibold text-[#555]">
                      {tLp('points.capMaxLabel')}
                    </label>
                    <div className="relative w-32">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={maxBalanceFloor(pointsRewards)}
                        value={maxBalance}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          setMaxBalance(Number.isNaN(n) ? 1 : Math.max(1, n));
                        }}
                        onBlur={() =>
                          setMaxBalance(Math.max(maxBalance, maxBalanceFloor(pointsRewards)))
                        }
                        className="h-11 pr-9 text-right"
                        aria-label={tLp('points.capMaxLabel')}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#9A9A9A]">
                        {tLp('points.rewardMenu.pointsSuffix')}
                      </span>
                    </div>
                  </div>
                )}
              </SmoothHeight>
            </div>
          </>
        )}
      </div>

      <SwitchProgramTypeDialog
        open={switchDialogOpen}
        toType={isPoints ? 'points' : 'stamp'}
        count={customerCount}
        onCancel={() => setSwitchDialogOpen(false)}
        onConfirm={() => {
          // Re-run the submit with the confirmation flag; advance() re-enters
          // the shell's handleNext, which awaits the in-place switch.
          confirmedSwitchRef.current = true;
          setSwitchDialogOpen(false);
          ctx.advance();
        }}
      />
    </div>
  );
}
