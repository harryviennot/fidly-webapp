'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import {
  DataCollectionForm,
  type DataCollectionValue,
} from '@/components/program/forms/DataCollectionForm';
import { useWizardStep } from '../../wizard-context';
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

  const [value, setValue] = useState<DataCollectionValue>(() => {
    const dc = currentBusiness?.settings?.customer_data_collection;
    if (!dc) return DEFAULTS;
    return {
      collect_name: normalize(dc.collect_name),
      collect_email: normalize(dc.collect_email),
      collect_phone: normalize(dc.collect_phone),
    };
  });

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!currentBusiness) return { ok: false };
      try {
        await updateBusiness({
          settings: {
            ...(currentBusiness.settings ?? {}),
            customer_data_collection: value,
          },
        });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [currentBusiness, value, updateBusiness, ctx, tErr]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <DataCollectionForm value={value} onChange={setValue} />
    </div>
  );
}
