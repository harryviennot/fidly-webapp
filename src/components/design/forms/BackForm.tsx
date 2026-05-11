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

/**
 * Back-of-card section: card-specific back fields plus a visibility-toggle
 * list of business-info entries inherited from /settings.
 */
export function BackForm() {
  const t = useTranslations('designEditor.editor');
  const { formData, businessInfo, updateField, toggleBusinessInfoKey } = useDesignForm();
  const hiddenKeys = formData.hidden_business_info_keys || [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('backDescription')}</p>

      <FieldEditor
        title={t('cardSpecific')}
        fields={formData.back_fields || []}
        onChange={(f) => updateField('back_fields', f)}
        maxFields={10}
      />

      <BusinessInfoFields
        businessInfo={businessInfo}
        hiddenKeys={hiddenKeys}
        onToggleKey={toggleBusinessInfoKey}
      />
    </div>
  );
}

interface BusinessInfoFieldsProps {
  businessInfo: BusinessInfoEntry[];
  hiddenKeys: string[];
  onToggleKey: (key: string) => void;
}

function BusinessInfoFields({ businessInfo, hiddenKeys, onToggleKey }: BusinessInfoFieldsProps) {
  const t = useTranslations('designEditor.editor');

  if (businessInfo.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 space-y-2">
        <p className="text-xs text-muted-foreground">{t('noBusinessInfo')}</p>
        <Link
          href="/settings"
          className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1"
        >
          <GearSix className="w-3 h-3" />
          {t('goToSettings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{t('fromBusinessSettings')}</span>
      </div>
      <div className="space-y-1.5">
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
              className={`flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-all text-left ${isHidden
                  ? 'bg-muted/30 border border-border'
                  : 'bg-[var(--accent-light)]/50 border border-[var(--accent)]/20'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${isHidden ? 'bg-white border border-border' : 'bg-[var(--accent)]'
                  }`}
              >
                {!isHidden && <Check className="w-3 h-3 text-white" weight="bold" />}
              </div>
              <Icon className={`w-4 h-4 flex-shrink-0 ${isHidden ? 'text-muted-foreground' : 'text-[var(--accent)]'}`} />
              <div className={`flex-1 min-w-0 ${isHidden ? 'opacity-40' : ''}`}>
                <span className="text-sm font-semibold">{getEntryLabel(entry)}</span>
                {preview && <p className="text-xs text-muted-foreground truncate">{preview}</p>}
              </div>
            </button>
          );
        })}
      </div>
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
    </div>
  );
}
