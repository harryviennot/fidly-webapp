'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon } from '@phosphor-icons/react';
import { StampIconSvg, type StampIconType } from '@/components/design/StampIconPicker';
import { Switch } from '@/components/ui/switch';
import { InfoPopover } from '@/components/reusables/info-popover';
import { NumberStepper } from '@/components/reusables/number-stepper';
import { SmoothHeight } from '@/components/reusables/smooth-height';
import { computeCardColors } from '@/lib/card-utils';
import { cn } from '@/lib/utils';
import type { CardDesign } from '@/types';

export interface ProgramDetailsValue {
  programName: string;
  totalStamps: number;
  rewardName: string;
  /** Prestamp: stamps a new customer starts with (0 = none). */
  initialStamps: number;
  /** Stackable rewards: full card banks a reward, stamping continues. */
  stackableRewards: boolean;
  /** Max banked rewards; null = unlimited. */
  maxStackedRewards: number | null;
}

interface ProgramDetailsFormProps {
  value: ProgramDetailsValue;
  onChange: (next: ProgramDetailsValue) => void;
  activeDesign?: CardDesign | null;
}

const MIN_STAMPS = 2;
const MAX_STAMPS = 21;
const STAMP_RANGE = MAX_STAMPS - MIN_STAMPS;

/**
 * Shared form for the loyalty program's core configuration (name, total
 * stamps, reward). Pure UI — accepts `value` + `onChange`, leaves
 * persistence to the parent (debounced save on the dashboard page, save-on-
 * submit in the wizard).
 *
 * Card preview is NOT rendered here — parents typically show the live card
 * preview alongside this form in a separate column.
 */
export function ProgramDetailsForm({ value, onChange, activeDesign }: ProgramDetailsFormProps) {
  const t = useTranslations('loyaltyProgram');

  const stampIcon = (activeDesign?.stamp_icon || 'checkmark') as StampIconType;
  const rewardIcon = (activeDesign?.reward_icon || 'gift') as StampIconType;
  const colors = activeDesign ? computeCardColors(activeDesign) : null;
  const accentHex = colors?.accentHex ?? 'var(--accent)';
  const iconColorHex = colors?.iconColorHex ?? '#fff';

  const patch = (next: Partial<ProgramDetailsValue>) => onChange({ ...value, ...next });

  return (
    <div className="flex flex-col gap-5">
      {/* Program Name */}
      <div>
        <label className="block text-[12px] font-semibold text-[#555] mb-1.5">
          {t('programName')}
        </label>
        <input
          type="text"
          value={value.programName}
          onChange={(e) => patch({ programName: e.target.value })}
          placeholder={t('programNamePlaceholder')}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-medium)] bg-white text-[13px] text-[#1A1A1A] outline-none transition-colors focus:border-[var(--accent)] min-h-[44px]"
        />
      </div>

      {/* Loyalty Type — stamps is the only type today, so confirm it rather
          than offering dead, un-clickable options. */}
      <div>
        <label className="block text-[12px] font-semibold text-[#555] mb-2">
          {t('loyaltyTypeLabel')}
        </label>
        <div className="flex items-center gap-2.5 p-3.5 px-4 rounded-[10px] border-2 border-[var(--accent)] bg-[var(--accent-light)]">
          <span className="text-[20px]" aria-hidden="true">⭐</span>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-[#1A1A1A]">{t('stampsType')}</div>
            <div className="text-[11.5px] text-[#8A8A8A] leading-[1.4]">{t('stampsTypeDesc')}</div>
          </div>
          <div className="w-[18px] h-[18px] rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
            <CheckIcon className="w-2.5 h-2.5 text-white" weight="bold" />
          </div>
        </div>
      </div>

      {/* Stamps to Earn */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[12px] font-semibold text-[#555]">{t('stampsToEarn')}</label>
          <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color: accentHex }}>
            {value.totalStamps}
          </span>
        </div>

        <div className="flex flex-wrap gap-[6px] mb-3">
          {Array.from({ length: MAX_STAMPS }, (_, i) => {
            const n = i + 1;
            const isActive = n <= value.totalStamps;
            const isLast = n === value.totalStamps;
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  if (n >= MIN_STAMPS) patch({ totalStamps: n });
                }}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-none',
                  !isActive && 'scale-[0.85] hover:scale-95'
                )}
                style={{
                  backgroundColor: isActive ? accentHex : 'var(--border)',
                  boxShadow: isActive ? `0 2px 8px ${accentHex}40` : 'none',
                  transitionDelay: isActive ? `${Math.min(i * 15, 150)}ms` : '0ms',
                }}
                aria-label={`${n} stamps`}
              >
                {isActive ? (
                  <StampIconSvg
                    icon={isLast ? rewardIcon : stampIcon}
                    className="w-3.5 h-3.5"
                    color={iconColorHex}
                  />
                ) : (
                  <span className="text-[9px] font-bold text-[#BBB]">{n}</span>
                )}
              </button>
            );
          })}
        </div>

        <input
          type="range"
          min={MIN_STAMPS}
          max={MAX_STAMPS}
          value={value.totalStamps}
          onChange={(e) => patch({ totalStamps: parseInt(e.target.value, 10) })}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-shadow [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-grab"
          style={{
            background: `linear-gradient(to right, ${accentHex} ${((value.totalStamps - MIN_STAMPS) / STAMP_RANGE) * 100}%, var(--border) ${((value.totalStamps - MIN_STAMPS) / STAMP_RANGE) * 100}%)`,
            WebkitAppearance: 'none',
          }}
          aria-label={t('stampsToEarn')}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            background: ${accentHex} !important;
            box-shadow: 0 2px 6px ${accentHex}50;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            box-shadow: 0 2px 10px ${accentHex}70;
          }
          input[type="range"]::-moz-range-thumb {
            background: ${accentHex} !important;
            box-shadow: 0 2px 6px ${accentHex}50;
          }
        `}</style>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#BBB]">{MIN_STAMPS}</span>
          <span className="text-[10px] text-[#BBB]">{MAX_STAMPS}</span>
        </div>
      </div>

      {/* Prestamp (head start) — right after the stamp goal: both are about
          the stamp count, before the reward block below. */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <label className="text-[12px] font-semibold text-[#555]">
              {t('prestamp.label')}
            </label>
            <InfoPopover content={t('prestamp.help')} />
          </div>
          <NumberStepper
            value={value.initialStamps}
            onChange={(next) =>
              patch({
                initialStamps: Math.max(0, Math.min(next ?? 0, value.totalStamps - 1)),
              })
            }
            min={0}
            max={value.totalStamps - 1}
            aria-label={t('prestamp.label')}
          />
        </div>
        <p className="text-[11.5px] text-[#8A8A8A] leading-[1.4] mt-1">
          {t('prestamp.description')}
        </p>
      </div>

      {/* Reward */}
      <div>
        <label className="block text-[12px] font-semibold text-[#555] mb-1.5">{t('rewardLabel')}</label>
        <input
          type="text"
          value={value.rewardName}
          onChange={(e) => patch({ rewardName: e.target.value })}
          placeholder={t('rewardNamePlaceholder')}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-medium)] bg-white text-[13px] text-[#1A1A1A] outline-none focus:border-[var(--accent)] transition-colors min-h-[44px]"
        />
      </div>

      {/* Stackable rewards */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <label className="text-[12px] font-semibold text-[#555]">
              {t('stackableRewards.label')}
            </label>
            <InfoPopover content={t('stackableRewards.help')} />
          </div>
          <Switch
            checked={value.stackableRewards}
            onCheckedChange={(checked) => patch({ stackableRewards: checked })}
            aria-label={t('stackableRewards.label')}
          />
        </div>
        <p className="text-[11.5px] text-[#8A8A8A] leading-[1.4] mt-1">
          {t('stackableRewards.description')}
        </p>
        <SmoothHeight>
          {value.stackableRewards && (
            <div className="flex items-center justify-between gap-3 pt-3 animate-slide-up">
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="text-[12px] font-semibold text-[#555]">
                  {t('stackableRewards.maxLabel')}
                </label>
                <InfoPopover content={t('stackableRewards.maxHelp')} />
              </div>
              <NumberStepper
                value={value.maxStackedRewards}
                onChange={(next) => patch({ maxStackedRewards: next })}
                min={1}
                max={99}
                allowEmpty
                emptyLabel={t('stackableRewards.unlimited')}
                aria-label={t('stackableRewards.maxLabel')}
              />
            </div>
          )}
        </SmoothHeight>
      </div>
    </div>
  );
}
