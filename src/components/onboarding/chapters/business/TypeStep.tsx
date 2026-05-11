'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { OptionCard } from '../../OptionCard';
import { useWizardStep } from '../../wizard-context';

const OPTIONS = [
  { id: 'cafe', emoji: '☕' },
  { id: 'restaurant', emoji: '🍽️' },
  { id: 'bakery', emoji: '🥐' },
  { id: 'beauty', emoji: '💇' },
  { id: 'retail', emoji: '🛍️' },
  { id: 'fitness', emoji: '🏋️' },
  { id: 'services', emoji: '🛠️' },
  { id: 'other', emoji: '✨' },
] as const;

/** Chapter 2 sub-step — optional. Saves to `settings.business_type`. */
export function TypeStep() {
  const t = useTranslations('onboardingBusiness.chapters.business.steps.type');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();
  const [selected, setSelected] = useState<string>(
    () => currentBusiness?.settings?.business_type ?? ''
  );

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!selected || !currentBusiness) return { ok: true }; // empty = same as skip
      try {
        await updateBusiness({
          settings: { ...(currentBusiness.settings ?? {}), business_type: selected },
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

      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            active={selected === opt.id}
            onClick={() => setSelected(opt.id)}
            emoji={opt.emoji}
            label={t(`options.${opt.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
