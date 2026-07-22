'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GearSix, Check, GiftIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { BusinessInfoEditor } from '@/components/settings/BusinessInfoEditor';
import {
  BUSINESS_INFO_TYPE_ICONS,
  getEntryPreview,
} from '@/lib/business-info-utils';
import type { BusinessInfoEntry } from '@/types/business';
import { isPointsProgram, type PassField, type RewardTier } from '@/types';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram } from '@/hooks/use-programs';
import { useDesignForm } from './DesignFormContext';

/** Copy overrides for the back-of-card form. Each field has a default that
 *  reads from `designEditor.editor.*`; the wizard passes its own onboarding
 *  copy here so the same component reads in the language of the surface it's
 *  embedded in. */
interface BackFormCopy {
  sharedSectionTitle?: string;
  sharedSectionHelper?: string;
  specificSectionTitle?: string;
  specificSectionHelper?: string;
  specificEmpty?: string;
  addFieldCta?: string;
}

interface BackFormProps {
  /** Hides the "Go to Settings" affordances. Used by the wizard's BackStep
   *  since the owner has no settings page to navigate to mid-onboarding. */
  hideSettingsLink?: boolean;
  /** Skip the leading explainer paragraph. The wizard's subtitle + section
   *  helpers already cover the same ground, so it's redundant there. */
  hideTopDescription?: boolean;
  /** Per-surface copy overrides (see `BackFormCopy`). */
  copy?: BackFormCopy;
}

const CUSTOM_ONLY: readonly ['custom'] = ['custom'];

/**
 * Back-of-card section: card-specific back fields plus a visibility-toggle
 * list of business-info entries inherited from /settings.
 *
 * Card-specific back fields are stored as `PassField` (key/label/value) but
 * rendered through `BusinessInfoEditor` in custom-only mode, so the form
 * card matches the dashboard's back-of-card editor exactly. The adapter
 * shuttles between the two shapes without leaking either type into the
 * other component.
 */
export function BackForm({
  hideSettingsLink,
  hideTopDescription,
  copy,
}: BackFormProps = {}) {
  const t = useTranslations('designEditor.editor');
  const tFE = useTranslations('designEditor.fieldEditor');
  const tPts = useTranslations('designEditor.points');
  const { currentBusiness } = useBusiness();
  const { data: program } = useDefaultProgram(currentBusiness?.id);
  const { formData, businessInfo, updateField, toggleBusinessInfoKey } =
    useDesignForm();
  const hiddenKeys = formData.hidden_business_info_keys || [];

  // Points programs always carry a program-rewards block on the card back
  // (reward menu + cap), injected by the backend. Surface it read-only in the
  // editor between the card-specific and business sections so the merchant
  // sees it (it can't be edited or removed here — it follows the program).
  const isPoints = isPointsProgram(program);
  const pointsRewards = isPoints ? program.config.rewards : [];
  const pointsMax = isPoints ? program.config.max_balance ?? null : null;

  const sharedSectionTitle = copy?.sharedSectionTitle ?? t('fromBusinessSettings');
  const sharedSectionHelper = copy?.sharedSectionHelper;
  const specificSectionTitle = copy?.specificSectionTitle ?? t('cardSpecific');
  const specificSectionHelper = copy?.specificSectionHelper;
  const specificEmpty = copy?.specificEmpty;
  const addFieldCta = copy?.addFieldCta ?? tFE('addField');

  const backFieldsAsEntries = useMemo<BusinessInfoEntry[]>(
    () =>
      (formData.back_fields || []).map((f) => ({
        type: 'custom' as const,
        key: f.key,
        data: { label: f.label, value: f.value },
      })),
    [formData.back_fields]
  );

  const handleBackFieldsChange = (entries: BusinessInfoEntry[]) => {
    const next: PassField[] = entries.map((entry) => ({
      key: entry.key,
      label: (entry.data.label as string) || '',
      value: (entry.data.value as string) || '',
    }));
    updateField('back_fields', next);
  };

  return (
    <div className="flex flex-col gap-5">
      {!hideTopDescription && (
        <p className="text-sm text-muted-foreground">{t('backDescription')}</p>
      )}

      {/* Order mirrors the actual pass back: card-specific, then the
          program-rewards block (points only), then business info. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-medium">{specificSectionTitle}</span>
          {specificSectionHelper && (
            <p className="text-xs text-muted-foreground">{specificSectionHelper}</p>
          )}
        </div>
        <BusinessInfoEditor
          value={backFieldsAsEntries}
          onChange={handleBackFieldsChange}
          allowedTypes={CUSTOM_ONLY}
          addLabel={addFieldCta}
          emptyLabel={specificEmpty}
        />
      </div>

      {isPoints && pointsRewards.length > 0 && (
        <ProgramRewardsSection
          rewards={pointsRewards}
          maxBalance={pointsMax}
          title={t('programRewardsTitle')}
          helper={t('programRewardsHelper')}
          maxLabel={t('programRewardsMax')}
          formatPrice={(points) => tPts('rewardPrice', { points })}
        />
      )}

      <BusinessInfoFields
        businessInfo={businessInfo}
        hiddenKeys={hiddenKeys}
        onToggleKey={toggleBusinessInfoKey}
        hideSettingsLink={hideSettingsLink}
        title={sharedSectionTitle}
        helper={sharedSectionHelper}
      />
    </div>
  );
}

interface ProgramRewardsSectionProps {
  rewards: RewardTier[];
  maxBalance: number | null;
  title: string;
  helper: string;
  maxLabel: string;
  formatPrice: (points: number) => string;
}

/**
 * Read-only mirror of the program-rewards back-field block that the backend
 * always appends to a points card's back (reward menu + cap). Locked: it
 * follows the loyalty program, not this card style, so it can't be edited or
 * removed here. Sits between the card-specific and business sections.
 */
function ProgramRewardsSection({
  rewards,
  maxBalance,
  title,
  helper,
  maxLabel,
  formatPrice,
}: ProgramRewardsSectionProps) {
  const sorted = [...rewards].sort((a, b) => a.threshold - b.threshold);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-[15px] font-medium">
          {title}
          <LockSimpleIcon className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />
        </span>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
      <div className="flex flex-col gap-1.5 rounded-xl bg-[#FAFAF8] border border-[#F0EFEB] p-3">
        {sorted.map((reward) => (
          <div key={reward.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E5DE] flex items-center justify-center shrink-0">
              <GiftIcon className="w-4 h-4 text-[#777]" />
            </div>
            <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
              {reward.name}
            </span>
            <span className="text-xs font-semibold tabular-nums text-[var(--accent)] shrink-0">
              {formatPrice(reward.threshold)}
            </span>
          </div>
        ))}
        {maxBalance != null && (
          <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-[#EEEDEA]">
            <span className="text-xs text-muted-foreground">{maxLabel}</span>
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {formatPrice(maxBalance)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface BusinessInfoFieldsProps {
  businessInfo: BusinessInfoEntry[];
  hiddenKeys: string[];
  onToggleKey: (key: string) => void;
  hideSettingsLink?: boolean;
  title: string;
  helper?: string;
}

/**
 * Toggle list of business-info entries — clicking a row flips its visibility
 * on the card back. Uses the same neutral surface as the editor cards below
 * and the same bordered icon box as the BusinessInfoEditor entries, so the
 * back-of-card section reads as one coherent block. Check sits on the right.
 */
function BusinessInfoFields({
  businessInfo,
  hiddenKeys,
  onToggleKey,
  hideSettingsLink,
  title,
  helper,
}: BusinessInfoFieldsProps) {
  const t = useTranslations('designEditor.editor');
  const tTypes = useTranslations('settings.cardInfo.types');

  if (businessInfo.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{t('noBusinessInfo')}</p>
        {!hideSettingsLink && (
          <Link
            href="/settings"
            className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1"
          >
            <GearSix className="w-3 h-3" />
            {t('goToSettings')}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{title}</span>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        {businessInfo.map((entry) => {
          const isHidden = hiddenKeys.includes(entry.key);
          const preview = getEntryPreview(entry);
          const Icon =
            BUSINESS_INFO_TYPE_ICONS[entry.type as keyof typeof BUSINESS_INFO_TYPE_ICONS] ||
            BUSINESS_INFO_TYPE_ICONS.custom;
          // Localised type label — custom entries use the user-typed label,
          // everything else pulls from `settings.cardInfo.types.{type}` so
          // the back-of-card section reads in the same language as the rest
          // of the wizard.
          const label =
            entry.type === 'custom'
              ? ((entry.data.label as string) || tTypes('custom'))
              : tTypes(entry.type);
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => onToggleKey(entry.key)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-all text-left bg-[#FAFAF8] border border-[#F0EFEB] ${
                isHidden ? 'opacity-60' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E5DE] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#777]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                {preview && (
                  <p className="text-xs truncate text-muted-foreground">
                    {preview}
                  </p>
                )}
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                  isHidden
                    ? 'bg-white border border-border'
                    : 'bg-[var(--foreground)] text-white'
                }`}
              >
                {!isHidden && <Check className="w-3 h-3" weight="bold" />}
              </div>
            </button>
          );
        })}
      </div>
      {!hideSettingsLink && (
        <p className="text-xs text-muted-foreground mt-3">
          {t('businessInfoExplanation')}{' '}
          <Link
            href="/settings"
            className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
          >
            <GearSix className="w-3 h-3" />
            {t('goToSettings')}
          </Link>
        </p>
      )}
    </div>
  );
}
