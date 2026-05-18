'use client';

import { useTranslations } from 'next-intl';
import { UserIcon, EnvelopeIcon, PhoneIcon } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InfoBox } from '@/components/reusables/info-box';
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
 * Pure UI — no save side-effects. Each toggle flips a tri-state
 * (off / required / optional) and the parent persists.
 */
export function DataCollectionForm({ value, onChange }: DataCollectionFormProps) {
  const t = useTranslations('loyaltyProgram');

  const dataFields: Array<{
    key: FieldKey;
    label: string;
    description: string;
    icon: string;
    fieldIcon: typeof UserIcon;
    recommended: boolean;
  }> = [
    {
      key: 'collect_name',
      label: t('dataFields.name'),
      description: t('dataFields.nameDescription'),
      icon: '👤',
      fieldIcon: UserIcon,
      recommended: true,
    },
    {
      key: 'collect_email',
      label: t('dataFields.email'),
      description: t('dataFields.emailDescription'),
      icon: '📧',
      fieldIcon: EnvelopeIcon,
      recommended: true,
    },
    {
      key: 'collect_phone',
      label: t('dataFields.phone'),
      description: t('dataFields.phoneDescription'),
      icon: '📱',
      fieldIcon: PhoneIcon,
      recommended: false,
    },
  ];

  const handleToggle = (field: FieldKey) => {
    onChange({
      ...value,
      [field]: value[field] === 'off' ? 'required' : 'off',
    });
  };

  const handleRequiredToggle = (field: FieldKey) => {
    onChange({
      ...value,
      [field]: value[field] === 'required' ? 'optional' : 'required',
    });
  };

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
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] bg-[var(--paper)] border-[1.5px] border-[var(--border-light)]"
            >
              <span className="text-[22px] flex-shrink-0" aria-hidden="true">
                {field.icon}
              </span>
              <div className="flex-1 min-w-0">
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
              {isEnabled && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Switch
                    checked={mode === 'required'}
                    onCheckedChange={() => handleRequiredToggle(field.key)}
                    className="scale-75 flex-shrink-0"
                  />
                  <span
                    className={cn(
                      'text-[11px] font-medium whitespace-nowrap',
                      mode === 'required' ? 'text-[#1A1A1A]' : 'text-[#8A8A8A]'
                    )}
                  >
                    {mode === 'required' ? t('requiredField') : t('optionalField')}
                  </span>
                </div>
              )}
              <Switch
                checked={isEnabled}
                onCheckedChange={() => handleToggle(field.key)}
                className="flex-shrink-0"
              />
            </div>
          );
        })}
      </div>

      {isAnonymousMode ? (
        <InfoBox variant="warning" title={t('anonymousModeTitle')} message={t('anonymousModeWarning')} />
      ) : (
        <InfoBox variant="info" message={t('anonymousModeNote')} />
      )}
    </div>
  );
}
