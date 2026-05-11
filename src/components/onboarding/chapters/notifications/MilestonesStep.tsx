'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram } from '@/hooks/use-programs';
import { MilestoneSection } from '@/components/notifications/MilestoneSection';
import { useWizardStep } from '../../wizard-context';

/**
 * Chapter 6 step 3 — optional. Reuses the dashboard's `MilestoneSection`
 * which already handles list + create + edit + delete via its own sheets.
 * The wizard's "Save & continue" just advances; per-milestone saves happen
 * inside the existing flow.
 */
export function MilestonesStep() {
  const t = useTranslations('onboardingBusiness.chapters.notifications.steps.milestones');
  const { currentBusiness } = useBusiness();
  const { data: program } = useDefaultProgram(currentBusiness?.id);
  const ctx = useWizardStep();

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  const totalStamps = program?.config?.total_stamps;
  const programName = program?.name ?? null;
  const rewardNameSet = !!program?.reward_name;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <MilestoneSection
        totalStamps={totalStamps}
        programName={programName}
        rewardNameSet={rewardNameSet}
      />
    </div>
  );
}
