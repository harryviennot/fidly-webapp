'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/contexts/business-context';
import { InviteDialog } from '@/components/team/invite-dialog';
import { useWizardStep } from '../../wizard-context';

/**
 * Chapter 10 — optional. Opens the existing `InviteDialog` so the wizard
 * reuses the dashboard's team-invite flow verbatim (single source of truth
 * for invitation logic).
 */
export function TeamStep() {
  const t = useTranslations('onboardingBusiness.chapters.team');
  const { currentBusiness } = useBusiness();
  const ctx = useWizardStep();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="rounded-[12px] border border-[var(--border)] bg-white p-4 min-h-[64px] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[var(--foreground)]">{t('inviteLabel')}</p>
          <p className="text-[12px] text-[#7A7A7A]">{t('inviteHint')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm" className="flex-shrink-0">
          <Plus className="w-4 h-4" weight="bold" />
          {t('inviteCta')}
        </Button>
      </div>

      {currentBusiness && (
        <InviteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          businessId={currentBusiness.id}
          onInvited={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
