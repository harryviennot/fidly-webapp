'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/contexts/business-context';
import { changeTier, createCheckoutSession } from '@/api/billing';
import { useMilestones, useNotificationTemplates } from '@/hooks/use-notifications';
import { useDesigns } from '@/hooks/use-designs';
import { computeStarterReverts, type RevertItem } from '@/lib/tier-revert';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import { cn } from '@/lib/utils';

type Tier = 'starter' | 'growth' | 'pro';

interface TierCard {
  id: Tier;
  price: number;
  features: string[];
  recommended?: boolean;
}

const TIERS: TierCard[] = [
  {
    id: 'starter',
    price: 20,
    features: ['starter.feat1', 'starter.feat2', 'starter.feat3'],
  },
  {
    id: 'growth',
    price: 40,
    features: ['growth.feat1', 'growth.feat2', 'growth.feat3', 'growth.feat4'],
  },
  {
    id: 'pro',
    price: 60,
    features: ['pro.feat1', 'pro.feat2', 'pro.feat3', 'pro.feat4', 'pro.feat5'],
    recommended: true,
  },
];

/**
 * Chapter 11 — final step. Lets the user pick a plan or stay on the Pro
 * trial. Downgrade-to-Starter goes through a confirmation modal that lists
 * what they'd lose (computed from current usage via `tier-revert.ts`).
 *
 * "Continue with trial" is the wizard's footer CTA — clicking it finalises
 * the wizard without any tier change.
 */
export function PlanStep() {
  const t = useTranslations('onboardingBusiness.chapters.plan');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { finalize } = useWizardProgress();
  const ctx = useWizardStep();

  const { data: templatesData } = useNotificationTemplates(businessId);
  const { data: milestonesData } = useMilestones(businessId);
  const { data: designs = [] } = useDesigns(businessId);

  const reverts = useMemo<RevertItem[]>(() => {
    const customizedCount = (templatesData?.items ?? []).filter((tpl) => tpl.is_customized).length;
    const milestones = milestonesData?.items?.length ?? 0;
    const activeDesign = designs.find((d) => d.is_active);
    const extra = Math.max(0, designs.length - 1);
    const hasStrip = !!activeDesign?.strip_background_url;
    return computeStarterReverts({
      customNotificationTemplates: customizedCount,
      milestoneCount: milestones,
      hasCustomStripBackground: hasStrip,
      extraDesignsCount: extra,
    });
  }, [templatesData, milestonesData, designs]);

  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setNextLabel(t('keepTrialCta'));
    // "Save & continue" on this step just finalises (keep trial).
    ctx.setSubmitHandler(async () => ({ ok: true }));
    return () => ctx.setSubmitHandler(null);
  }, [ctx, t]);

  const handlePickTier = async (tier: Tier) => {
    if (!businessId) return;
    if (tier === 'starter') {
      setPendingTier('starter');
      return;
    }
    setActing(true);
    try {
      // Finalise the wizard before redirecting so when the user returns
      // from Stripe checkout they land on / without bouncing into the
      // wizard again.
      await finalize();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { checkout_url } = await createCheckoutSession(
        businessId,
        tier,
        `${origin}/?upgraded=${tier}`,
        `${origin}/?upgrade_canceled=1`
      );
      window.location.href = checkout_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    } finally {
      setActing(false);
    }
  };

  const handleConfirmDowngrade = async () => {
    if (!businessId) return;
    setActing(true);
    try {
      await changeTier(businessId, 'starter');
      setPendingTier(null);
      ctx.advance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 min-[1024px]:grid-cols-3 gap-3">
        {TIERS.map((card) => (
          <TierCardView
            key={card.id}
            card={card}
            label={t(`tiers.${card.id}.label`)}
            tagline={t(`tiers.${card.id}.tagline`)}
            features={card.features.map((k) => t(`tiers.${k}`))}
            cta={t(`tiers.${card.id}.cta`)}
            recommendedLabel={t('recommendedBadge')}
            youdLoseLabel={t('youdLose')}
            moreLabel={(n) => t('andMore', { count: n })}
            pricePerMonth={t('perMonth')}
            disabled={acting}
            onPick={() => handlePickTier(card.id)}
            isStarter={card.id === 'starter'}
            starterReverts={card.id === 'starter' ? reverts : undefined}
          />
        ))}
      </div>

      <Dialog open={pendingTier === 'starter'} onOpenChange={(o) => !o && setPendingTier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warning className="w-5 h-5 text-amber-600" weight="bold" />
              {t('downgradeTitle')}
            </DialogTitle>
            <DialogDescription>{t('downgradeBody')}</DialogDescription>
          </DialogHeader>

          {reverts.length > 0 ? (
            <ul className="space-y-2 pt-1">
              {reverts.map((item) => (
                <li key={item.key} className="flex gap-2 text-[13px]">
                  <span className="text-amber-600 leading-none mt-0.5">•</span>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{item.label}</p>
                    <p className="text-[#7A7A7A]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[#7A7A7A]">{t('downgradeNoLosses')}</p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingTier(null)} disabled={acting}>
              {t('downgradeCancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDowngrade} disabled={acting}>
              {acting ? '…' : t('downgradeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TierCardViewProps {
  card: TierCard;
  label: string;
  tagline: string;
  features: string[];
  cta: string;
  recommendedLabel: string;
  youdLoseLabel: string;
  moreLabel: (n: number) => string;
  pricePerMonth: string;
  disabled: boolean;
  isStarter: boolean;
  starterReverts?: RevertItem[];
  onPick: () => void;
}

function TierCardView({
  card,
  label,
  tagline,
  features,
  cta,
  recommendedLabel,
  youdLoseLabel,
  moreLabel,
  pricePerMonth,
  disabled,
  isStarter,
  starterReverts,
  onPick,
}: TierCardViewProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-[16px] border-[1.5px] bg-white p-5 transition-all duration-150',
        card.recommended
          ? 'border-[var(--accent)] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]'
          : 'border-[var(--border)]'
      )}
    >
      {card.recommended && (
        <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {recommendedLabel}
        </span>
      )}

      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-[var(--foreground)]">{label}</p>
        <p className="text-[12.5px] text-[#7A7A7A]">{tagline}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[28px] font-bold tabular-nums text-[var(--foreground)]">€{card.price}</span>
        <span className="text-[12px] text-[#7A7A7A]">{pricePerMonth}</span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px]">
            <Check className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0 mt-1" weight="bold" />
            <span className="text-[#333]">{feat}</span>
          </li>
        ))}
      </ul>

      {isStarter && starterReverts && starterReverts.length > 0 && (
        <div className="rounded-[10px] bg-amber-50 border border-amber-200 px-3 py-2.5">
          <p className="text-[11.5px] font-semibold text-amber-900 mb-1">{youdLoseLabel}</p>
          <ul className="text-[11.5px] text-amber-800 space-y-0.5">
            {starterReverts.slice(0, 3).map((item) => (
              <li key={item.key}>• {item.label}</li>
            ))}
            {starterReverts.length > 3 && <li>{moreLabel(starterReverts.length - 3)}</li>}
          </ul>
        </div>
      )}

      <Button
        onClick={onPick}
        disabled={disabled}
        variant={card.recommended ? 'gradient' : 'outline'}
        className="w-full mt-auto min-h-[44px]"
      >
        {cta}
      </Button>
    </div>
  );
}
