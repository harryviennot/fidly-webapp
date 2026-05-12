'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram, useUpdateProgram } from '@/hooks/use-programs';
import { useDesigns } from '@/hooks/use-designs';
import {
  ProgramDetailsForm,
  type ProgramDetailsValue,
} from '@/components/program/forms/ProgramDetailsForm';
import { useWizardStep } from '../../wizard-context';

const DEFAULT_VALUE: ProgramDetailsValue = {
  programName: '',
  totalStamps: 10,
  rewardName: '',
};

/**
 * Chapter 3 — required. Adapts the shared `ProgramDetailsForm` so the user
 * configures stamps + reward inline with the same component they'll see on
 * the dashboard later (recognition).
 */
export function ProgramStep() {
  const t = useTranslations('onboardingBusiness.chapters.program');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { data: program } = useDefaultProgram(businessId);
  const { data: designs = [] } = useDesigns(businessId);
  const activeDesign = designs.find((d) => d.is_active) ?? null;
  const { mutateAsync: updateProgram } = useUpdateProgram(businessId);
  const ctx = useWizardStep();

  // Stored edits override the server snapshot; null means "show server value."
  // This avoids the setState-in-effect anti-pattern when program loads.
  const [edits, setEdits] = useState<ProgramDetailsValue | null>(null);

  const value: ProgramDetailsValue = useMemo(
    () =>
      edits ?? {
        programName: program?.name ?? DEFAULT_VALUE.programName,
        totalStamps: program?.config?.total_stamps ?? DEFAULT_VALUE.totalStamps,
        rewardName: program?.reward_name ?? DEFAULT_VALUE.rewardName,
      },
    [edits, program]
  );

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setSubmitHandler(async () => {
      if (!program?.id) {
        toast.error(tErr('saveFailed'));
        return { ok: false };
      }
      if (!value.programName.trim()) {
        toast.error(tErr('programNameRequired'));
        return { ok: false };
      }
      if (!value.rewardName.trim()) {
        toast.error(tErr('rewardRequired'));
        return { ok: false };
      }
      try {
        await updateProgram({
          programId: program.id,
          data: {
            name: value.programName,
            config: { ...program.config, total_stamps: value.totalStamps, user_configured: true },
            reward_name: value.rewardName,
          },
        });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [program, value, updateProgram, ctx, tErr]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <ProgramDetailsForm value={value} onChange={setEdits} activeDesign={activeDesign} />
    </div>
  );
}
