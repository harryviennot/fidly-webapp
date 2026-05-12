'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import {
  DataCollectionForm,
  type DataCollectionValue,
} from '@/components/program/forms/DataCollectionForm';
import {
  useDirtySnapshot,
  useWizardDraft,
  useWizardStep,
} from '../../wizard-context';
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

/**
 * Chapter 4 — skippable. Sensible defaults are pre-applied (name + email
 * required) so users who skip still have a working signup form.
 */
export function DataCollectionStep() {
  const t = useTranslations('onboardingBusiness.chapters.data-collection');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();

  // Draft-backed so toggling switches and navigating away preserves the
  // choice — `useUpdateBusiness`'s React-Query invalidation doesn't push the
  // change into the `currentBusiness` context, so re-seeding from the API
  // alone would lose unsaved tweaks.
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <DataCollectionForm value={value} onChange={setValue} />
    </div>
  );
}
