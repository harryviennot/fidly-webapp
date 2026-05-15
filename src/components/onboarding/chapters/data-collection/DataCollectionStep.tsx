'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { Switch } from '@/components/ui/switch';
import { InfoBox } from '@/components/reusables/info-box';
import { cn } from '@/lib/utils';
import {
  useDirtySnapshot,
  useWizardDraft,
  useWizardStep,
} from '../../wizard-context';
import type {
  DataCollectionValue,
} from '@/components/program/forms/DataCollectionForm';
import type { FieldCollectionMode } from '@/types/business';

const DEFAULTS: DataCollectionValue = {
  collect_name: 'required',
  collect_email: 'required',
  collect_phone: 'off',
};

function normalize(value: FieldCollectionMode | boolean | undefined): FieldCollectionMode {
  if (value === true) return 'required';
  if (value === false || value === undefined) return 'off';
  return value;
}

type FieldKey = keyof DataCollectionValue;

interface FieldDef {
  key: FieldKey;
  emoji: string;
  recommended: boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'collect_name', emoji: '👤', recommended: true },
  { key: 'collect_email', emoji: '📧', recommended: true },
  { key: 'collect_phone', emoji: '📱', recommended: false },
];

/**
 * Chapter 3.2 — skippable. Choose which customer fields to collect at
 * sign-up. Tri-state per field: off / required / optional.
 *
 * Renders inline with the wizard's design language (wiz-* tokens, larger
 * tap targets) instead of importing the dashboard's shared form, so the
 * spacing matches the surrounding steps.
 */
export function DataCollectionStep() {
  const t = useTranslations('onboardingBusiness.chapters.program.steps.data-collection');
  const tLp = useTranslations('loyaltyProgram');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();

  const [value, setValue] = useWizardDraft<DataCollectionValue>(
    'data-collection.value',
    () => {
      const dc = currentBusiness?.settings?.customer_data_collection;
      if (!dc) return DEFAULTS;
      return {
        collect_name: normalize(dc.collect_name),
        collect_email: normalize(dc.collect_email),
        collect_phone: normalize(dc.collect_phone),
      };
    }
  );

  const { isDirty, markSaved } = useDirtySnapshot('data-collection', value);

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!currentBusiness) return { ok: false };
      if (!isDirty) return { ok: true };

      const baseSettings = currentBusiness.settings ?? {};
      const snapshot = value;
      return {
        ok: true,
        save: async () => {
          try {
            await updateBusiness({
              settings: {
                ...baseSettings,
                customer_data_collection: snapshot,
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
  }, [currentBusiness, value, isDirty, markSaved, updateBusiness, ctx, tErr]);

  const isAnonymousMode = useMemo(
    () =>
      value.collect_name === 'off' &&
      value.collect_email === 'off' &&
      value.collect_phone === 'off',
    [value]
  );

  const handleToggle = (field: FieldKey) => {
    setValue({
      ...value,
      [field]: value[field] === 'off' ? 'required' : 'off',
    });
  };

  const handleRequiredToggle = (field: FieldKey) => {
    setValue({
      ...value,
      [field]: value[field] === 'required' ? 'optional' : 'required',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {/*
        Mobile slot for the anonymous-mode warning — sits between the header
        and the field list. Hidden ≥640px (the desktop slot below the fields
        takes over). Both slots use the grid-rows-[1fr]/[0fr] collapse trick
        so the box animates open/closed from its natural height.
      */}
      <AnimatedWarningSlot
        show={isAnonymousMode}
        className="min-[640px]:hidden"
      >
        <InfoBox
          variant="warning"
          title={tLp('anonymousModeTitle')}
          message={tLp('anonymousModeWarning')}
        />
      </AnimatedWarningSlot>

      <div className="flex flex-col gap-2.5">
        {FIELDS.map((field) => {
          const mode = value[field.key];
          const isEnabled = mode !== 'off';
          return (
            <div
              key={field.key}
              className={cn(
                // Match OptionCard tokens: 1.5px border, 12px radius, 64px min
                // tap target, white when enabled / paper when off. Keeps the
                // tri-state radio + Switch on the right untouched.
                'flex flex-col min-[640px]:flex-row min-[640px]:items-center gap-3 min-[640px]:gap-3.5 px-4 py-4 rounded-[12px] border-[1.5px] transition-colors min-h-[64px]',
                isEnabled
                  ? 'border-[var(--border)] bg-white'
                  : 'border-[var(--border-light)] bg-[var(--paper)]'
              )}
            >
              <div className="flex items-start gap-3.5 min-w-0 min-[640px]:flex-1">
                <span
                  className="text-[24px] flex-shrink-0 leading-none mt-0.5"
                  aria-hidden="true"
                >
                  {field.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className={cn(
                        'wiz-body leading-tight',
                        isEnabled ? 'text-[var(--foreground)]' : 'text-[#888]'
                      )}
                    >
                      {tLp(`dataFields.${field.key === 'collect_name' ? 'name' : field.key === 'collect_email' ? 'email' : 'phone'}`)}
                    </span>
                    {field.recommended && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded-full bg-[var(--accent-light)] text-[var(--accent)] whitespace-nowrap leading-[1.4]">
                        {tLp('recommended')}
                      </span>
                    )}
                  </div>
                  <p className="wiz-helper text-[#7A7A7A] leading-snug">
                    {tLp(
                      `dataFields.${field.key === 'collect_name' ? 'nameDescription' : field.key === 'collect_email' ? 'emailDescription' : 'phoneDescription'}`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 flex-shrink-0 self-end min-[640px]:self-auto">
                <div
                  role="radiogroup"
                  aria-label={`${field.key} requirement`}
                  aria-disabled={!isEnabled}
                  className={cn(
                    'inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--paper)] p-0.5 transition-opacity',
                    !isEnabled && 'opacity-50'
                  )}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'required'}
                    disabled={!isEnabled}
                    onClick={() => {
                      if (mode !== 'required') handleRequiredToggle(field.key);
                    }}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full wiz-micro font-medium transition-all whitespace-nowrap',
                      isEnabled ? 'cursor-pointer' : 'cursor-not-allowed',
                      mode === 'required' && isEnabled
                        ? 'bg-white text-[var(--foreground)] shadow-sm'
                        : 'text-[#888]',
                      isEnabled && mode !== 'required' && 'hover:text-[var(--foreground)]'
                    )}
                  >
                    {tLp('requiredField')}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'optional'}
                    disabled={!isEnabled}
                    onClick={() => {
                      if (mode !== 'optional') handleRequiredToggle(field.key);
                    }}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full wiz-micro font-medium transition-all whitespace-nowrap',
                      isEnabled ? 'cursor-pointer' : 'cursor-not-allowed',
                      mode === 'optional' && isEnabled
                        ? 'bg-white text-[var(--foreground)] shadow-sm'
                        : 'text-[#888]',
                      isEnabled && mode !== 'optional' && 'hover:text-[var(--foreground)]'
                    )}
                  >
                    {tLp('optionalField')}
                  </button>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(field.key)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop slot — appears under the field list. */}
      <AnimatedWarningSlot
        show={isAnonymousMode}
        className="hidden min-[640px]:block"
      >
        <InfoBox
          variant="warning"
          title={tLp('anonymousModeTitle')}
          message={tLp('anonymousModeWarning')}
        />
      </AnimatedWarningSlot>
    </div>
  );
}

/**
 * Collapsing wrapper for the anonymous-mode warning. Uses the
 * grid-rows-[1fr]/[0fr] trick so the inner content animates from / to
 * its natural height instead of jumping.
 */
function AnimatedWarningSlot({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!show}
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out',
        show
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0 -mt-6',
        className
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
