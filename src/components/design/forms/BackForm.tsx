'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GearSix, Check } from '@phosphor-icons/react';
import { BusinessInfoEditor } from '@/components/settings/BusinessInfoEditor';
import {
  BUSINESS_INFO_TYPE_ICONS,
  getEntryLabel,
  getEntryPreview,
} from '@/lib/business-info-utils';
import type { BusinessInfoEntry } from '@/types/business';
import type { PassField } from '@/types';
import { useDesignForm } from './DesignFormContext';

interface BackFormProps {
  /**
   * Hides the "Go to Settings" affordances. Used by the wizard's BackStep
   * since the owner has no settings page to navigate to mid-onboarding;
   * also lets the wizard surface its own explanation copy above the form.
   */
  hideSettingsLink?: boolean;
  /** Optional copy rendered above the card-specific editor. */
  designOnlyExplain?: string;
}

const CUSTOM_ONLY: readonly ['custom'] = ['custom'];

/**
 * Back-of-card section: card-specific back fields plus a visibility-toggle
 * list of business-info entries inherited from /settings.
 *
 * Card-specific back fields are stored as `PassField` (key/label/value) but
 * rendered through `BusinessInfoEditor` in custom-only mode, so the form
 * card matches the dashboard's back-of-card editor exactly (same chrome,
 * same label + value inputs). The adapter below shuttles between the two
 * shapes without leaking either type into the other component.
 */
export function BackForm({ hideSettingsLink, designOnlyExplain }: BackFormProps = {}) {
  const t = useTranslations('designEditor.editor');
  const tFE = useTranslations('designEditor.fieldEditor');
  const { formData, businessInfo, updateField, toggleBusinessInfoKey } =
    useDesignForm();
  const hiddenKeys = formData.hidden_business_info_keys || [];

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
      <p className="text-sm text-muted-foreground">{t('backDescription')}</p>

      <BusinessInfoFields
        businessInfo={businessInfo}
        hiddenKeys={hiddenKeys}
        onToggleKey={toggleBusinessInfoKey}
        hideSettingsLink={hideSettingsLink}
      />

      {designOnlyExplain && (
        <p className="wiz-helper text-[#888]">{designOnlyExplain}</p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">{t('cardSpecific')}</span>
        <BusinessInfoEditor
          value={backFieldsAsEntries}
          onChange={handleBackFieldsChange}
          allowedTypes={CUSTOM_ONLY}
          addLabel={tFE('addField')}
        />
      </div>
    </div>
  );
}

interface BusinessInfoFieldsProps {
  businessInfo: BusinessInfoEntry[];
  hiddenKeys: string[];
  onToggleKey: (key: string) => void;
  hideSettingsLink?: boolean;
}

/**
 * Toggle list of business-info entries — clicking a row flips its visibility
 * on the card back. Uses the same neutral surface as the editor cards below
 * (`bg-[#FAFAF8] border border-[#F0EFEB]`) and the same bordered icon box as
 * the BusinessInfoEditor entries (w-9 h-9 white square), so the back-of-card
 * section reads as one coherent block. Check sits on the right.
 */
function BusinessInfoFields({
  businessInfo,
  hiddenKeys,
  onToggleKey,
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
              className={`flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-all text-left bg-[#FAFAF8] border border-[#F0EFEB] ${
                isHidden ? 'opacity-60' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E5DE] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#777]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground">{getEntryLabel(entry)}</span>
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
