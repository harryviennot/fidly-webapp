'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { OptionCard } from '../../OptionCard';
import { useWizardStep } from '../../wizard-context';

const TYPE_OPTIONS = [
  { id: 'cafe', emoji: '☕' },
  { id: 'restaurant', emoji: '🍽️' },
  { id: 'bakery', emoji: '🥐' },
  { id: 'beauty', emoji: '💇' },
  { id: 'retail', emoji: '🛍️' },
  { id: 'fitness', emoji: '🏋️' },
  { id: 'services', emoji: '🛠️' },
  { id: 'other', emoji: '✨' },
] as const;

const SIZE_OPTIONS = ['solo', 'small', 'medium', 'large'] as const;
const LOCATIONS_OPTIONS = ['one', 'few', 'several', 'many'] as const;
const GOAL_OPTIONS = [
  { id: 'retention', emoji: '🔁' },
  { id: 'frequency', emoji: '📈' },
  { id: 'basket', emoji: '🛒' },
  { id: 'acquisition', emoji: '🎯' },
] as const;

/**
 * Single profile screen — replaces v2's Type/Size/Locations/Objectives sub-
 * steps. Four chip groups, optional. Picking the "Other" type chip reveals a
 * free-text input bound to `settings.business_type_other`.
 */
export function ProfileStep() {
  const t = useTranslations('onboardingBusiness.chapters.business.steps.profile');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();

  const [businessType, setBusinessType] = useState<string>(
    () => currentBusiness?.settings?.business_type ?? ''
  );
  const [businessTypeOther, setBusinessTypeOther] = useState<string>(
    () => currentBusiness?.settings?.business_type_other ?? ''
  );
  const [teamSize, setTeamSize] = useState<string>(
    () => currentBusiness?.settings?.team_size ?? ''
  );
  const [locationsCount, setLocationsCount] = useState<string>(
    () => currentBusiness?.settings?.locations_count ?? ''
  );
  const [primaryGoal, setPrimaryGoal] = useState<string>(
    () => currentBusiness?.settings?.primary_goal ?? ''
  );

  // All four chip groups must be answered. If the type is "Other", the
  // free-text input must also be non-empty.
  const isValid =
    businessType !== '' &&
    (businessType !== 'other' || businessTypeOther.trim().length > 0) &&
    teamSize !== '' &&
    locationsCount !== '' &&
    primaryGoal !== '';

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setCanProceed(isValid);
  }, [ctx, isValid]);

  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      if (!currentBusiness || !isValid) return { ok: false };
      const patch: Record<string, unknown> = {
        business_type: businessType,
        team_size: teamSize,
        locations_count: locationsCount,
        primary_goal: primaryGoal,
      };
      if (businessType === 'other') {
        patch.business_type_other = businessTypeOther.trim();
      }

      try {
        await updateBusiness({
          settings: { ...(currentBusiness.settings ?? {}), ...patch },
        });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [
    businessType,
    businessTypeOther,
    teamSize,
    locationsCount,
    primaryGoal,
    isValid,
    currentBusiness,
    updateBusiness,
    ctx,
    tErr,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="wiz-body-sm font-medium text-[var(--foreground)]">
          {t('typeLabel')}
        </h3>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              active={businessType === opt.id}
              onClick={() => setBusinessType(opt.id)}
              emoji={opt.emoji}
              label={t(`typeOptions.${opt.id}`)}
            />
          ))}
        </div>
        {businessType === 'other' && (
          <div className="flex flex-col gap-3 mt-1">
            <label
              htmlFor="biz-type-other"
              className="wiz-body-sm font-medium text-[var(--foreground)]"
            >
              {t('otherFreeText')}
            </label>
            <Input
              id="biz-type-other"
              value={businessTypeOther}
              onChange={(e) => setBusinessTypeOther(e.target.value)}
              placeholder={t('otherPlaceholder')}
              className="h-11"
              maxLength={80}
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="wiz-body-sm font-medium text-[var(--foreground)]">
          {t('sizeLabel')}
        </h3>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
          {SIZE_OPTIONS.map((id) => (
            <OptionCard
              key={id}
              active={teamSize === id}
              onClick={() => setTeamSize(id)}
              label={t(`sizeOptions.${id}`)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="wiz-body-sm font-medium text-[var(--foreground)]">
          {t('locationsLabel')}
        </h3>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
          {LOCATIONS_OPTIONS.map((id) => (
            <OptionCard
              key={id}
              active={locationsCount === id}
              onClick={() => setLocationsCount(id)}
              label={t(`locationsOptions.${id}`)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="wiz-body-sm font-medium text-[var(--foreground)]">
          {t('goalLabel')}
        </h3>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              active={primaryGoal === opt.id}
              onClick={() => setPrimaryGoal(opt.id)}
              emoji={opt.emoji}
              label={t(`goalOptions.${opt.id}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
