'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GearSix, Check } from '@phosphor-icons/react';
import FieldEditor from '@/components/design/FieldEditor';
import {
  BUSINESS_INFO_TYPE_ICONS,
  getEntryLabel,
  getEntryPreview,
} from '@/lib/business-info-utils';
import type { BusinessInfoEntry } from '@/types/business';
import { useDesignForm } from './DesignFormContext';

interface BackFormProps {
  /**
   * Hides the "Go to Settings" affordances. Used by the wizard's BackStep
   * since the owner has no settings page to navigate to mid-onboarding;
   * also lets the wizard surface its own explanation copy above the form.
   */
  hideSettingsLink?: boolean;
  /** Optional copy rendered above FieldEditor to explain design-only fields. */
  designOnlyExplain?: string;
}

/**
 * Back-of-card section: card-specific back fields plus a visibility-toggle
 * list of business-info entries inherited from /settings.
 */
export function BackForm({ hideSettingsLink, designOnlyExplain }: BackFormProps = {}) {
  const t = useTranslations('designEditor.editor');
  const { formData, businessInfo, updateField, toggleBusinessInfoKey, bgHex, textHex } =
    useDesignForm();
  const hiddenKeys = formData.hidden_business_info_keys || [];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{t('backDescription')}</p>

      <BusinessInfoFields
        businessInfo={businessInfo}
        hiddenKeys={hiddenKeys}
        onToggleKey={toggleBusinessInfoKey}
        cardBg={bgHex}
        cardText={textHex}
        hideSettingsLink={hideSettingsLink}
      />

      {designOnlyExplain && (
        <p className="wiz-helper text-[#888]">{designOnlyExplain}</p>
      )}

      <FieldEditor
        title={t('cardSpecific')}
        fields={formData.back_fields || []}
        onChange={(f) => updateField('back_fields', f)}
        maxFields={10}
      />
    </div>
  );
}

interface BusinessInfoFieldsProps {
  businessInfo: BusinessInfoEntry[];
  hiddenKeys: string[];
  onToggleKey: (key: string) => void;
  cardBg: string;
  cardText: string;
  hideSettingsLink?: boolean;
}

/**
 * Renders one row per business-info entry, with each visible row tinted in
 * the card's background + foreground colors so the user can preview at a
 * glance what'll appear on the card back. Hidden rows fall back to a muted
 * neutral so the active vs. hidden split reads instantly.
 */
function BusinessInfoFields({
  businessInfo,
  hiddenKeys,
  onToggleKey,
  cardBg,
  cardText,
  hideSettingsLink,
}: BusinessInfoFieldsProps) {
  const t = useTranslations('designEditor.editor');

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
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{t('fromBusinessSettings')}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {businessInfo.map((entry) => {
          const isHidden = hiddenKeys.includes(entry.key);
          const preview = getEntryPreview(entry);
          const Icon =
            BUSINESS_INFO_TYPE_ICONS[entry.type as keyof typeof BUSINESS_INFO_TYPE_ICONS] ||
            BUSINESS_INFO_TYPE_ICONS.custom;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => onToggleKey(entry.key)}
              style={
                isHidden
                  ? undefined
                  : { backgroundColor: cardBg, color: cardText }
              }
              className={`flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-all text-left ${
                isHidden ? 'bg-muted/30 border border-border opacity-60' : 'border border-transparent shadow-sm'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                  isHidden ? 'bg-white border border-border' : ''
                }`}
                style={isHidden ? undefined : { backgroundColor: cardText, color: cardBg }}
              >
                {!isHidden && <Check className="w-3 h-3" weight="bold" />}
              </div>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold">{getEntryLabel(entry)}</span>
                {preview && (
                  <p
                    className={`text-xs truncate ${isHidden ? 'text-muted-foreground' : 'opacity-80'}`}
                  >
                    {preview}
                  </p>
                )}
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
