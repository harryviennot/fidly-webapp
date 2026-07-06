'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NumberStepper } from '@/components/reusables/number-stepper';
import { SmoothHeight } from '@/components/reusables/smooth-height';
import { InfoPopover } from '@/components/reusables/info-popover';
import { RewardMenuEditor } from '@/components/program/forms/RewardMenuEditor';
import { StampsSelector, WizardField } from '@/components/onboarding/form';
import { useWizardDraft, useWizardStep } from '@/components/onboarding/wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns } from '@/hooks/use-designs';
import { currencySymbol } from '@/lib/currency';
import type { RewardTier } from '@/types';
import { useConvertWizard } from '../convert-context';
import { targetDraftDefaults, TARGET_DRAFT_KEYS } from '../target-draft';

const MAX_STAMPS = 21;

/**
 * Target-type program config, drafted to the wizard store ONLY — nothing is
 * written to the live program until the execute step commits the conversion.
 * Reuses the same pure form pieces as the onboarding program step.
 */
export function ProgramStep() {
  const t = useTranslations('conversion.steps.program');
  const tLp = useTranslations('loyaltyProgram');
  const ctx = useWizardStep();
  const { currentBusiness } = useBusiness();
  const { program, toType } = useConvertWizard();
  const { data: designs = [] } = useDesigns(currentBusiness?.id);
  const activeDesign = designs.find((d) => d.is_active) ?? null;

  const currency = currencySymbol(currentBusiness?.country, currentBusiness?.primary_locale);
  const defaults = useMemo(() => targetDraftDefaults(toType, program), [toType, program]);
  const isPoints = toType === 'points';

  // ── Stamp-target drafts ────────────────────────────────────────────────
  const [totalStamps, setTotalStamps] = useWizardDraft<number>(
    TARGET_DRAFT_KEYS.totalStamps,
    () => defaults.totalStamps
  );
  const [rewardName, setRewardName] = useWizardDraft<string>(
    TARGET_DRAFT_KEYS.rewardName,
    () => defaults.rewardName
  );
  const [stackableRewards, setStackableRewards] = useWizardDraft<boolean>(
    TARGET_DRAFT_KEYS.stackableRewards,
    () => defaults.stackableRewards
  );
  const [maxStackedRewards, setMaxStackedRewards] = useWizardDraft<number | null>(
    TARGET_DRAFT_KEYS.maxStackedRewards,
    () => defaults.maxStackedRewards
  );
  const [initialStamps, setInitialStamps] = useWizardDraft<number>(
    TARGET_DRAFT_KEYS.initialStamps,
    () => defaults.initialStamps
  );

  // ── Points-target drafts ───────────────────────────────────────────────
  const [pointsRate, setPointsRate] = useWizardDraft<number>(
    TARGET_DRAFT_KEYS.pointsRate,
    () => defaults.pointsRate
  );
  const [pointsRewards, setPointsRewards] = useWizardDraft<RewardTier[]>(
    TARGET_DRAFT_KEYS.pointsRewards,
    () => defaults.pointsRewards
  );
  const [maxBalance, setMaxBalance] = useWizardDraft<number | null>(
    TARGET_DRAFT_KEYS.maxBalance,
    () => defaults.maxBalance
  );

  const pointsValid =
    pointsRate > 0 &&
    pointsRewards.length >= 1 &&
    pointsRewards.every((r) => r.name.trim().length > 0 && r.threshold > 0);
  const isValid = isPoints ? pointsValid : rewardName.trim().length > 0;

  useEffect(() => {
    ctx.setCanProceed(isValid);
  }, [ctx, isValid]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold text-[var(--foreground)]">
          {isPoints ? t('titleToPoints') : t('titleToStamp')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">
          {isPoints ? t('subtitleToPoints') : t('subtitleToStamp')}
        </p>
      </header>

      {!isPoints && (
        <div className="flex flex-col gap-6">
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

          <WizardField label={tLp('rewardLabel')} htmlFor="convert-reward" required>
            <Input
              id="convert-reward"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              placeholder={tLp('rewardNamePlaceholder')}
              className="h-11"
            />
          </WizardField>

          {/* Prestamp (head start) — same row layout as the settings page */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <label className="text-[13px] font-medium text-[var(--foreground)]">
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
            <p className="mt-1 text-[11.5px] leading-[1.4] text-[#8A8A8A]">
              {tLp('prestamp.description')}
            </p>
          </div>

          {/* Stackable rewards */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <label className="text-[13px] font-medium text-[var(--foreground)]">
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
            <p className="mt-1 text-[11.5px] leading-[1.4] text-[#8A8A8A]">
              {tLp('stackableRewards.description')}
            </p>
            <SmoothHeight>
              {stackableRewards && (
                <div className="flex items-center justify-between gap-3 pt-3">
                  <div className="flex min-w-0 items-center gap-1.5">
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
      )}

      {isPoints && (
        <div className="flex flex-col gap-6">
          {/* Earn rate — how many points 1 unit of spend is worth */}
          <WizardField label={tLp('points.rateLabel')} helper={tLp('points.rateHelp')}>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#7A7A7A]">
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
              <span className="text-[13px] text-[#7A7A7A]">{tLp('points.ratePoints')}</span>
            </div>
          </WizardField>

          {/* Reward menu — priced rewards customers redeem against their balance */}
          <WizardField label={tLp('points.rewardMenuLabel')} helper={tLp('points.rewardMenuHelp')}>
            <RewardMenuEditor value={pointsRewards} onChange={setPointsRewards} />
          </WizardField>

          {/* Optional balance cap */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <label className="text-[13px] font-medium text-[var(--foreground)]">
                  {tLp('points.capLabel')}
                </label>
                <InfoPopover content={tLp('points.capHelp')} />
              </div>
              <Switch
                checked={maxBalance !== null}
                onCheckedChange={(on) => setMaxBalance(on ? maxBalance ?? 1000 : null)}
                aria-label={tLp('points.capLabel')}
              />
            </div>
            <p className="mt-1 text-[11.5px] leading-[1.4] text-[#8A8A8A]">
              {tLp('points.capDescription')}
            </p>
            <SmoothHeight>
              {maxBalance !== null && (
                <div className="flex items-center justify-between gap-3 pt-3">
                  <label className="text-[12px] font-semibold text-[#555]">
                    {tLp('points.capMaxLabel')}
                  </label>
                  <div className="relative w-32">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={maxBalance}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setMaxBalance(Number.isNaN(n) ? 1 : Math.max(1, n));
                      }}
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
        </div>
      )}
    </div>
  );
}
