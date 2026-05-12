'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DeviceMobile, Plus, ShieldCheckered } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/contexts/business-context';
import { InviteDialog } from '@/components/team/invite-dialog';
import { useWizardStep } from '../../wizard-context';

/**
 * Chapter 10 — optional. Two role cards explain Admin vs Scanner access,
 * then the existing dashboard `InviteDialog` (sole source of truth for
 * invitation logic) handles the actual invite.
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
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="wiz-body font-semibold text-[var(--foreground)]">
          {t('rolesTitle')}
        </h3>
        <div className="grid grid-cols-1 min-[640px]:grid-cols-2 gap-3">
          <RoleCard
            icon={<ShieldCheckered className="w-5 h-5 text-[var(--accent)]" weight="bold" />}
            label={t('adminRole.label')}
            description={t('adminRole.description')}
          />
          <RoleCard
            icon={<DeviceMobile className="w-5 h-5 text-[var(--accent)]" weight="bold" />}
            label={t('scannerRole.label')}
            description={t('scannerRole.description')}
          />
        </div>
      </section>

      <div className="rounded-[12px] border border-[var(--border)] bg-white p-4 min-h-[64px] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="wiz-body font-semibold text-[var(--foreground)]">{t('inviteLabel')}</p>
          <p className="wiz-helper text-[#7A7A7A]">{t('inviteHint')}</p>
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

function RoleCard({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          {icon}
        </span>
        <p className="wiz-body font-semibold text-[var(--foreground)]">{label}</p>
      </div>
      <p className="wiz-helper text-[#666] leading-relaxed">{description}</p>
    </div>
  );
}
