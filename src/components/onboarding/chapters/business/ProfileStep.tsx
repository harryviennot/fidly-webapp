'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { OptionCard } from '../../OptionCard';
import {
  useDirtySnapshot,
  useWizardDraft,
  useWizardStep,
} from '../../wizard-context';

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

  // Drafts mirror the chip selections so navigating Back→Forward (or before
  // the submit refreshes `currentBusiness`) preserves the user's answers.
  const [businessType, setBusinessType] = useWizardDraft<string>(
    'profile.businessType',
    () => currentBusiness?.settings?.business_type ?? ''
  );
  const [businessTypeOther, setBusinessTypeOther] = useWizardDraft<string>(
    'profile.businessTypeOther',
    () => currentBusiness?.settings?.business_type_other ?? ''
  );
  const [teamSize, setTeamSize] = useWizardDraft<string>(
    'profile.teamSize',
    () => currentBusiness?.settings?.team_size ?? ''
  );
  const [locationsCount, setLocationsCount] = useWizardDraft<string>(
    'profile.locationsCount',
    () => currentBusiness?.settings?.locations_count ?? ''
  );
  const [primaryGoal, setPrimaryGoal] = useWizardDraft<string>(
    'profile.primaryGoal',
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

  // Snapshot of everything we'd send to the API. Compared against the last
  // successful save so a Back → Forward without edits skips the write.
  const snapshot = useMemo(
    () => ({
      business_type: businessType,
      business_type_other: businessType === 'other' ? businessTypeOther.trim() : '',
      team_size: teamSize,
      locations_count: locationsCount,
      primary_goal: primaryGoal,
    }),
    [businessType, businessTypeOther, teamSize, locationsCount, primaryGoal]
  );
  const { isDirty, markSaved } = useDirtySnapshot('profile', snapshot);

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setCanProceed(isValid);
  }, [ctx, isValid]);

  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      if (!currentBusiness || !isValid) return { ok: false };

      // No diff vs the last successful write → skip the API hop entirely.
      if (!isDirty) return { ok: true };

      // Validation passed; the heavy lifting runs in the background after
      // the shell navigates. Capture snapshot values in the closure so the
      // save sends the exact data the user saw at submit time.
      const settingsPatch: Record<string, unknown> = {
        business_type: snapshot.business_type,
        team_size: snapshot.team_size,
        locations_count: snapshot.locations_count,
        primary_goal: snapshot.primary_goal,
      };
      if (snapshot.business_type === 'other') {
        settingsPatch.business_type_other = snapshot.business_type_other;
      }
      const baseSettings = currentBusiness.settings ?? {};

      return {
        ok: true,
        save: async () => {
          try {
            await updateBusiness({
              settings: { ...baseSettings, ...settingsPatch },
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
  }, [
    snapshot,
    isValid,
    isDirty,
    markSaved,
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
