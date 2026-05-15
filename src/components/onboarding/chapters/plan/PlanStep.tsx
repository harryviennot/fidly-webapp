'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FoundingCountdown } from '@/components/ui/founding-countdown';
import { useBusiness } from '@/contexts/business-context';
import { changeTier } from '@/api/billing';
import {
  effectivePrice,
  isFoundingProgramOpen,
  type TierId,
} from '@/lib/pricing';
import { useWizardStep } from '../../wizard-context';
import { cn } from '@/lib/utils';

interface TierConfig {
  id: TierId;
  features: string[];
  recommended?: boolean;
}

const TIERS: TierConfig[] = [
  {
    id: 'starter',
    features: ['starter.feat1', 'starter.feat2', 'starter.feat3'],
  },
  {
    id: 'growth',
    features: ['growth.feat1', 'growth.feat2', 'growth.feat3', 'growth.feat4'],
    recommended: true,
  },
  {
    id: 'pro',
    features: ['pro.feat1', 'pro.feat2', 'pro.feat3', 'pro.feat4', 'pro.feat5'],
  },
];

/**
 * Final wizard step. Picks the subscription tier and finalises the wizard.
 *
 * Non-blocking: the chosen tier is PATCHed onto the business and the wizard
 * advances straight to the dashboard. No Stripe checkout, no payment-method
 * gate — the user links a card later from the dashboard's billing tab.
 *
 * Founding partner pricing is read off `business.is_founding_partner`. The
 * flag is set server-side at signup and is grandfathered for life — this
 * step never updates it. When the program window has passed
 * (`FOUNDING_PROGRAM_END_DATE`), the discount + countdown disappear
 * automatically even for businesses still marked as founding partners.
 */
export function PlanStep() {
  const t = useTranslations('onboardingBusiness.chapters.plan');
  const tPricing = useTranslations('pricing');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness, refetch: refetchBusiness } = useBusiness();
  const ctx = useWizardStep();

  const isFoundingPartner = !!currentBusiness?.is_founding_partner;
  const showFoundingPricing = isFoundingPartner && isFoundingProgramOpen();

  useEffect(() => {
    // Continue button on this step matches the standard finish label
    // ("Launch my program"). The user picks a tier via the cards below and
    // we navigate forward to finalize the wizard.
    ctx.setSubmitHandler(async () => ({ ok: true }));
    return () => ctx.setSubmitHandler(null);
  }, [ctx]);

  const handlePickTier = async (tier: TierId) => {
    if (!currentBusiness?.id) return;
    try {
      // Use the dedicated billing endpoint so the backend handles tier-change
      // bookkeeping (Stripe metadata, entitlement recompute, etc.) consistently
      // with the dashboard's billing tab. Skip the call when the tier hasn't
      // changed — saves a needless server roundtrip.
      if (currentBusiness.subscription_tier !== tier) {
        await changeTier(currentBusiness.id, tier);
        await refetchBusiness();
      }
      // ctx.advance() runs the wizard's handleNext, which on the last step
      // finalises and routes to /.
      ctx.advance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {showFoundingPricing && (
        <div className="flex justify-center">
          <FoundingCountdown variant="badge" />
        </div>
      )}

      <div className="grid grid-cols-1 min-[1024px]:grid-cols-3 gap-3">
        {TIERS.map((tier) => {
          const { displayPrice, regularPrice, isFoundingDiscount } = effectivePrice(
            tier.id,
            isFoundingPartner
          );
          return (
            <TierCardView
              key={tier.id}
              tier={tier}
              label={t(`tiers.${tier.id}.label`)}
              tagline={t(`tiers.${tier.id}.tagline`)}
              features={tier.features.map((k) => t(`tiers.${k}`))}
              cta={t(`tiers.${tier.id}.cta`)}
              recommendedLabel={t('recommendedBadge')}
              displayPrice={displayPrice}
              regularPrice={regularPrice}
              isFoundingDiscount={isFoundingDiscount}
              foundingLabel={tPricing('foundingPartner')}
              forLifeLabel={tPricing('forLife')}
              perMonthLabel={tPricing('perMonth')}
              onPick={() => handlePickTier(tier.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TierCardViewProps {
  tier: TierConfig;
  label: string;
  tagline: string;
  features: string[];
  cta: string;
  recommendedLabel: string;
  displayPrice: number;
  regularPrice: number;
  isFoundingDiscount: boolean;
  foundingLabel: string;
  forLifeLabel: string;
  perMonthLabel: string;
  onPick: () => void;
}

function TierCardView({
  tier,
  label,
  tagline,
  features,
  cta,
  recommendedLabel,
  displayPrice,
  regularPrice,
  isFoundingDiscount,
  foundingLabel,
  forLifeLabel,
  perMonthLabel,
  onPick,
}: TierCardViewProps) {
  return (
    <Card
      hover={false}
      className={cn(
        'relative flex flex-col gap-4 p-5 transition-all duration-150',
        tier.recommended
          ? 'border-[1.5px] border-[var(--accent)] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]'
          : 'border-[1.5px]'
      )}
    >
      {tier.recommended && (
        <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-0.5 wiz-micro font-bold uppercase tracking-wider text-white">
          {recommendedLabel}
        </span>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="wiz-body font-semibold text-[var(--foreground)]">{label}</p>
          {isFoundingDiscount && (
            <span className="inline-flex items-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider px-1.5 py-px">
              {foundingLabel}
            </span>
          )}
        </div>
        <p className="wiz-helper text-[#7A7A7A]">{tagline}</p>
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        {isFoundingDiscount && (
          <span className="wiz-body-sm text-[#9A9A9A] line-through tabular-nums">
            €{regularPrice}
          </span>
        )}
        <span className="wiz-h font-bold tabular-nums text-[var(--foreground)]">
          €{displayPrice}
        </span>
        <span className="wiz-helper text-[#7A7A7A]">
          {isFoundingDiscount ? forLifeLabel : perMonthLabel}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2 wiz-body-sm">
            <Check className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0 mt-1" weight="bold" />
            <span className="text-[#333]">{feat}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onPick}
        variant={tier.recommended ? 'gradient' : 'outline'}
        className="w-full mt-auto min-h-[44px]"
      >
        {cta}
      </Button>
    </Card>
  );
}

