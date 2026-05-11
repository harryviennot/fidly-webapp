'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { OptionCard } from '../../OptionCard';
import { useWizardStep } from '../../wizard-context';

const OPTIONS = ['one', 'few', 'several', 'many'] as const;

/** Chapter 2 sub-step — optional. Saves to `settings.locations_count` (as a bucket string). */
export function LocationsStep() {
  const t = useTranslations('onboardingBusiness.chapters.business.steps.locations');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();
  // Existing value is typed as number; we coerce here so the UI reads a bucket.
  // Stored as a string so the bucket label survives later.
  const [selected, setSelected] = useState<string>(
    () => currentBusiness?.settings?.locations_count ?? ''
  );

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!selected || !currentBusiness) return { ok: true };
      try {
        await updateBusiness({
          settings: { ...(currentBusiness.settings ?? {}), locations_count: selected },
        });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [selected, currentBusiness, updateBusiness, ctx, tErr]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((id) => (
          <OptionCard
            key={id}
            active={selected === id}
            onClick={() => setSelected(id)}
            label={t(`options.${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
