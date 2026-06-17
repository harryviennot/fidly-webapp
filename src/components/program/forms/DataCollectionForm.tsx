'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { InfoBox } from '@/components/reusables/info-box';
import { ViewToggle, type ViewToggleOption } from '@/components/ui/view-toggle';
import { cn } from '@/lib/utils';
import type { FieldCollectionMode } from '@/types/business';

export interface DataCollectionValue {
  collect_name: FieldCollectionMode;
  collect_email: FieldCollectionMode;
  collect_phone: FieldCollectionMode;
}

type FieldKey = keyof DataCollectionValue;

interface DataCollectionFormProps {
  value: DataCollectionValue;
  onChange: (next: DataCollectionValue) => void;
}

/**
 * Shared form for choosing which customer fields to collect at sign-up.
 * Pure UI — no save side-effects. Each field has a single tri-state segmented
 * control (off / optional / required) and the parent persists.
 */
export function DataCollectionForm({ value, onChange }: DataCollectionFormProps) {
  const t = useTranslations('loyaltyProgram');

  const dataFields: Array<{
    key: FieldKey;
    label: string;
    description: string;
    icon: string;
    recommended: boolean;
  }> = [
    {
      key: 'collect_name',
      label: t('dataFields.name'),
      description: t('dataFields.nameDescription'),
      icon: '👤',
      recommended: true,
    },
    {
      key: 'collect_email',
      label: t('dataFields.email'),
      description: t('dataFields.emailDescription'),
      icon: '📧',
      recommended: true,
    },
    {
      key: 'collect_phone',
      label: t('dataFields.phone'),
      description: t('dataFields.phoneDescription'),
      icon: '📱',
      recommended: false,
    },
  ];

  const modeOptions: ViewToggleOption<FieldCollectionMode>[] = [
    { value: 'off', label: t('fieldOff') },
    { value: 'optional', label: t('optionalField') },
    { value: 'required', label: t('requiredField') },
  ];

  const setMode = (field: FieldKey, mode: FieldCollectionMode) =>
    onChange({ ...value, [field]: mode });

  const isAnonymousMode =
    value.collect_name === 'off' && value.collect_email === 'off' && value.collect_phone === 'off';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {dataFields.map((field) => {
          const mode = value[field.key];
          const isEnabled = mode !== 'off';
          return (
            <div
              key={field.key}
              className="flex flex-col gap-3 min-[600px]:flex-row min-[600px]:items-center min-[600px]:gap-4 px-4 py-3.5 rounded-[10px] bg-[var(--paper)] border-[1.5px] border-[var(--border-light)]"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <span className="text-[22px] flex-shrink-0" aria-hidden="true">
                  {field.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Label
                      className={cn(
                        'text-[14px] font-semibold',
                        isEnabled ? 'text-[#1A1A1A]' : 'text-[#888]'
                      )}
                    >
                      {field.label}
                    </Label>
                    {field.recommended && (
                      <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[var(--accent-light)] text-[var(--accent)]">
                        {t('recommended').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#8A8A8A] leading-[1.4]">{field.description}</p>
                </div>
              </div>
              {/* Full-width and tall on phones for easy tapping; collapses to an
                  inline control on the right once the row is wide enough. */}
              <ViewToggle
                variant="solid"
                fullWidth
                value={mode}
                onChange={(next) => setMode(field.key, next)}
                options={modeOptions}
                className="min-[600px]:w-auto min-[600px]:inline-flex [&>button]:min-h-[44px] [&>button]:py-2.5 [&>button]:text-[13px] min-[600px]:[&>button]:flex-none min-[600px]:[&>button]:min-h-[34px] min-[600px]:[&>button]:py-1 min-[600px]:[&>button]:text-xs"
              />
            </div>
          );
        })}
      </div>

      {isAnonymousMode ? (
        <InfoBox variant="info" title={t('anonymousModeTitle')} message={t('anonymousModeWarning')} />
      ) : (
        <InfoBox variant="note" message={t('anonymousModeNote')} />
      )}
    </div>
  );
}
