'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowSquareOut,
  Broadcast as BroadcastIcon,
  PaintBrush,
  Stamp as StampIcon,
  Users,
} from '@phosphor-icons/react';
import { EditorCard } from '@/components/card/EditorCard';
import { useBusiness } from '@/contexts/business-context';
import { useActiveDesign } from '@/hooks/use-designs';
import { useDefaultProgram } from '@/hooks/use-programs';
import { getCustomer } from '@/api/customers';
import { getPendingInvitations } from '@/api/invitations';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';

/**
 * Recap chapter — visual summary before plan-pick. No mutations. Just renders
 * what the owner has built so they see a tangible outcome and feel ready to
 * commit (or keep their Pro trial).
 */
export function RecapStep() {
  const t = useTranslations('onboardingBusiness.chapters.recap');
  const ctx = useWizardStep();
  const { currentBusiness } = useBusiness();
  const { progress } = useWizardProgress();

  const businessId = currentBusiness?.id;
  const { data: design } = useActiveDesign(businessId);
  const { data: program } = useDefaultProgram(businessId);

  const broadcastSent = currentBusiness?.settings?.first_broadcast_sent === true;
  const customerId = progress.payload.demo_customer_id;

  const [stampsSent, setStampsSent] = useState<number>(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setNextLabel(t('nextLabel'));
    return () => {
      ctx.setNextLabel(null);
    };
  }, [ctx, t]);

  useEffect(() => {
    if (!businessId || !customerId) return;
    let cancelled = false;
    getCustomer(businessId, customerId)
      .then((customer) => {
        if (cancelled) return;
        const count = customer.enrollments?.[0]?.progress?.stamps ?? customer.stamps ?? 0;
        setStampsSent(count);
      })
      .catch(() => { /* leave at 0 */ });
    return () => { cancelled = true; };
  }, [businessId, customerId]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    getPendingInvitations(businessId)
      .then((invites) => {
        if (cancelled) return;
        setPendingInvitesCount(invites.length);
      })
      .catch(() => { /* leave at 0 */ });
    return () => { cancelled = true; };
  }, [businessId]);

  const totalStamps = program?.config?.total_stamps ?? 10;
  const rewardName = program?.reward_name ?? '';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {design && (
        <section className="flex flex-col gap-3">
          <h3 className="wiz-helper uppercase tracking-wider text-[#999] font-semibold">
            {t('cardLabel')}
          </h3>
          <div className="flex justify-center py-4 rounded-[16px] bg-[var(--paper)] border border-[var(--border-light)]">
            <EditorCard
              design={design}
              previewStamps={Math.min(stampsSent, totalStamps)}
              totalStamps={totalStamps}
              organizationName={currentBusiness?.name}
            />
          </div>
        </section>
      )}

      {program && (
        <section className="flex flex-col gap-2">
          <h3 className="wiz-helper uppercase tracking-wider text-[#999] font-semibold">
            {t('programLabel')}
          </h3>
          <p className="wiz-body font-medium text-[var(--foreground)]">
            {t('programDetail', { totalStamps, rewardName: rewardName || '—' })}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <StatRow
          icon={<StampIcon className="w-4 h-4 text-[var(--accent)]" weight="bold" />}
          label={t('stampsLabel', { count: stampsSent })}
        />
        <StatRow
          icon={<BroadcastIcon className="w-4 h-4 text-[var(--accent)]" weight="bold" />}
          label={
            broadcastSent
              ? t('broadcastLabel.sent')
              : t('broadcastLabel.notSent')
          }
        />
        <StatRow
          icon={<Users className="w-4 h-4 text-[var(--accent)]" weight="bold" />}
          label={t('teamLabel', { count: pendingInvitesCount })}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-white p-4">
        <h3 className="wiz-body-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
          <PaintBrush className="w-3.5 h-3.5 text-[#888]" weight="bold" />
          {t('tweakCta')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <TweakLink href="/loyalty-program/design" label={t('tweakLink.design')} />
          <TweakLink href="/loyalty-program/settings" label={t('tweakLink.program')} />
          <TweakLink href="/team" label={t('tweakLink.team')} />
        </div>
      </section>
    </div>
  );
}

function StatRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-[var(--paper)] border border-[var(--border-light)]">
      <span className="flex-shrink-0">{icon}</span>
      <p className="wiz-body text-[var(--foreground)]">{label}</p>
    </div>
  );
}

function TweakLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2.5 wiz-helper font-medium text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors"
    >
      <span>{label}</span>
      <ArrowSquareOut className="w-3.5 h-3.5 text-[#888]" weight="bold" />
    </Link>
  );
}
