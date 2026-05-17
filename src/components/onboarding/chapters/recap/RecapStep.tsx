'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Broadcast as BroadcastIcon,
  Eye,
  Stamp as StampIcon,
  Users,
} from '@phosphor-icons/react';
import { EditorCard } from '@/components/card/EditorCard';
import { BusinessUrlCard } from '@/components/program/BusinessUrlCard';
import { Card } from '@/components/ui/card';
import { useBusiness } from '@/contexts/business-context';
import { useActiveDesign } from '@/hooks/use-designs';
import { useDefaultProgram } from '@/hooks/use-programs';
import { getCustomers } from '@/api/customers';
import { getPendingInvitations } from '@/api/invitations';
import { entryToBackPassField } from '@/lib/business-info-utils';
import type { BusinessInfoEntry } from '@/types/business';
import { useWizardStep } from '../../wizard-context';

/**
 * Recap chapter — visual summary before plan-pick. No mutations. Just renders
 * what the owner has built so they see a tangible outcome and feel ready to
 * commit (or keep their Pro trial).
 */
export function RecapStep() {
  const t = useTranslations('onboardingBusiness.chapters.recap');
  const tDesign = useTranslations('designEditor.editor');
  const tCardInfo = useTranslations('settings.cardInfo.types');
  const ctx = useWizardStep();
  const { currentBusiness } = useBusiness();

  const businessId = currentBusiness?.id;
  const { data: design } = useActiveDesign(businessId);
  const { data: program } = useDefaultProgram(businessId);

  const broadcastSent = currentBusiness?.settings?.first_broadcast_sent === true;

  const [stampsSent, setStampsSent] = useState<number>(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setNextLabel(t('nextLabel'));
    return () => {
      ctx.setNextLabel(null);
    };
  }, [ctx, t]);

  // Total stamps fired in the wizard = sum of every demo customer's
  // enrollment stamps. Pre-launch the only customers a business has are
  // the wizard's own demo installs, so this maps 1:1 to "stamps you sent
  // yourself".
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    getCustomers(businessId, 100, 0)
      .then((page) => {
        if (cancelled) return;
        const total = (page.data ?? []).reduce(
          (sum, c) => sum + (c.enrollments?.[0]?.progress?.stamps ?? c.stamps ?? 0),
          0
        );
        setStampsSent(total);
      })
      .catch(() => { /* leave at 0 */ });
    return () => { cancelled = true; };
  }, [businessId]);

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

  // Mirror DesignPreviewPane: the back of the card shows card-specific
  // back_fields FIRST, then the business-info entries the owner enabled
  // for this card (i.e. not in hidden_business_info_keys). Without this
  // merge, brand-new cards — which start with empty back_fields — show
  // a blank back in the recap even when the owner has populated their
  // business info in settings.
  const backDesign = design
    ? (() => {
        const businessInfo =
          (currentBusiness?.settings?.business_info as BusinessInfoEntry[]) || [];
        const hiddenKeys = new Set(design.hidden_business_info_keys ?? []);
        const businessBackFields = businessInfo
          .filter((entry) => !hiddenKeys.has(entry.key))
          .map((entry) => entryToBackPassField(entry, tCardInfo));
        return {
          ...design,
          back_fields: [...(design.back_fields ?? []), ...businessBackFields],
        };
      })()
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 animate-slide-up">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {design && (
        <div className="flex flex-col items-center gap-3 animate-slide-up delay-80">
          {/* card-flip pattern (see DesignEditorV2): keep both faces in the
              DOM so the back inherits the front's outer dimensions — toggling
              `showBack` alone re-mounts the wrapper and the back ends up with
              a different shadow/margin profile than the front. */}
          <div className="w-full max-w-[260px] card-flip-container">
            <div className={`card-flip-inner ${showBack ? 'flipped' : ''}`}>
              <div className="card-flip-front">
                <EditorCard
                  design={design}
                  // Show the card fully stamped — the recap is about
                  // celebrating what they built, not auditing how many test
                  // stamps they fired. A half-stamped card on the trophy step
                  // reads as "incomplete."
                  previewStamps={totalStamps}
                  totalStamps={totalStamps}
                  showBack={false}
                />
              </div>
              <div className="card-flip-back">
                <EditorCard
                  design={backDesign ?? design}
                  previewStamps={totalStamps}
                  totalStamps={totalStamps}
                  showBack
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#7A7A7A] hover:text-[var(--foreground)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" weight="bold" />
            {showBack ? tDesign('viewFront') : tDesign('viewBack')}
          </button>
          {program && (
            <p className="wiz-helper text-center text-[#7A7A7A]">
              {t('programDetail', { totalStamps, rewardName: rewardName || '—' })}
            </p>
          )}
        </div>
      )}

      <section className="flex flex-col gap-2 animate-slide-up delay-160">
        {stampsSent > 0 && (
          <StatRow
            icon={<StampIcon className="w-4 h-4 text-[var(--accent)]" weight="bold" />}
            label={t('stampsLabel', { count: stampsSent })}
          />
        )}
        {/* Hide the broadcast row entirely when nothing was sent — the
            "No broadcast sent yet" copy reads as a missed task on the
            celebration step. Showing the row only on success keeps the
            recap focused on wins. */}
        {broadcastSent && (
          <StatRow
            icon={<BroadcastIcon className="w-4 h-4 text-[var(--accent)]" weight="bold" />}
            label={t('broadcastLabel.sent')}
          />
        )}
        <StatRow
          icon={<Users className="w-4 h-4 text-[var(--accent)]" weight="bold" />}
          label={t('teamLabel', { count: pendingInvitesCount })}
        />
      </section>

      <div className="animate-slide-up delay-240">
        <BusinessUrlCard />
      </div>
    </div>
  );
}

function StatRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Card
      hover={false}
      className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--paper)]"
    >
      <span className="flex-shrink-0">{icon}</span>
      <p className="wiz-body text-[var(--foreground)]">{label}</p>
    </Card>
  );
}
