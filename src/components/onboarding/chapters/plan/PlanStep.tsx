'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import { changeTier } from '@/api/billing';
import {
  effectivePrice,
  isFoundingProgramOpen,
  type TierId,
} from '@/lib/pricing';
import { FoundingCountdown } from '@/components/ui/founding-countdown';
import { useWizardStep } from '../../wizard-context';

const TIERS: readonly TierId[] = ['starter', 'growth', 'pro'] as const;

/**
 * Final wizard step. Picks the subscription tier and finalises the wizard.
 *
 * Visual contract mirrors the showcase landing site's `FoundingPartnerStep`
 * (`showcase/components/onboarding/steps/FoundingPartnerStep.tsx` on the
 * `dev` branch) so customers see the same plan picker they previewed before
 * signing up:
 *  - 3 cards in a `md:grid-cols-3` grid, capped at `max-w-4xl`
 *  - Growth is the highlighted tier (accent ring + "MOST POPULAR" badge)
 *  - Pro is locked behind a "COMING SOON" pill, dimmed to 50%
 *  - Founding-partner pricing: strikethrough regular price + bold founding
 *    price + "/mo for life" — gated on the business's `is_founding_partner`
 *    flag AND `isFoundingProgramOpen()`. After the cutoff, the discount UI
 *    disappears even for existing FPs (their underlying Stripe price stays
 *    locked server-side).
 *
 * Non-blocking: picking a tier PATCHes `subscription_tier` via the existing
 * billing endpoint and advances the wizard. No Stripe checkout, no payment
 * gate — payment method is linked later from the dashboard's billing tab.
 */
export function PlanStep() {
  const t = useTranslations('onboardingBusiness.chapters.plan');
  const tp = useTranslations('pricing');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness, refetch: refetchBusiness } = useBusiness();
  const ctx = useWizardStep();

  const isFoundingPartner = !!currentBusiness?.is_founding_partner;
  const foundingOpen = isFoundingProgramOpen();
  const showFoundingPricing = isFoundingPartner && foundingOpen;

  useEffect(() => {
    // No pre-submit work — picking a tier inside the grid is the action.
    // We still register an ok-handler so the footer Continue (which
    // finalises with the current tier) advances cleanly.
    ctx.setSubmitHandler(async () => ({ ok: true }));
    return () => ctx.setSubmitHandler(null);
  }, [ctx]);

  const handleSelectTier = async (tier: TierId) => {
    if (!currentBusiness?.id) return;
    if (tier === 'pro') return; // disabled — coming soon
    try {
      if (currentBusiness.subscription_tier !== tier) {
        await changeTier(currentBusiness.id, tier);
        await refetchBusiness();
      }
      ctx.advance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A] max-w-xl">
          {showFoundingPricing ? t('subtitleFounding') : t('subtitle')}
        </p>
        {showFoundingPricing && (
          <div className="mt-2">
            <FoundingCountdown variant="badge" />
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto w-full">
        {TIERS.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            isFoundingPartner={isFoundingPartner}
            onSelect={() => handleSelectTier(tier)}
            tp={tp}
          />
        ))}
      </div>

      <p className="wiz-helper text-center text-[#9A9A9A] max-w-2xl mx-auto">
        {tp('ctaSubtext')}
      </p>
    </div>
  );
}

interface TierCardProps {
  tier: TierId;
  isFoundingPartner: boolean;
  onSelect: () => void;
  tp: ReturnType<typeof useTranslations>;
}

function TierCard({ tier, isFoundingPartner, onSelect, tp }: TierCardProps) {
  const isPro = tier === 'pro';
  const isGrowth = tier === 'growth';

  const { displayPrice, regularPrice, isFoundingDiscount } = effectivePrice(
    tier,
    isFoundingPartner
  );

  // Features come from i18n as an array. `tp.raw` returns the parsed JSON
  // value so we can iterate the list directly.
  const features = (tp.raw(`${tier}.features`) as string[]) ?? [];

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-5 bg-white transition-all',
        isPro
          ? 'opacity-50 border-[var(--border)]'
          : isGrowth
            ? 'border-[var(--accent)] shadow-lg ring-1 ring-[var(--accent)]'
            : 'border-[var(--border)]'
      )}
    >
      {isGrowth && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--accent)] text-white whitespace-nowrap">
            {tp('popular')}
          </span>
        </div>
      )}
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--paper)] text-[#7A7A7A] whitespace-nowrap">
            {tp('comingSoon')}
          </span>
        </div>
      )}

      <div className="mb-4 mt-1">
        <h3
          className={cn(
            'text-lg font-bold leading-tight',
            isPro ? 'text-[#7A7A7A]' : 'text-[var(--foreground)]'
          )}
        >
          {tp(`${tier}.name`)}
        </h3>
        <p className="wiz-helper text-[#7A7A7A] mt-0.5 leading-snug">
          {tp(`${tier}.tagline`)}
        </p>

        <div className="mt-3">
          {isFoundingDiscount ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="wiz-body-sm line-through text-[#9A9A9A] tabular-nums">
                  €{regularPrice}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tabular-nums text-[var(--foreground)]">
                  €{displayPrice}
                </span>
                <span className="wiz-helper text-[#7A7A7A]">
                  {tp('forLife')}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  'text-3xl font-extrabold tabular-nums',
                  isPro ? 'text-[#7A7A7A]' : 'text-[var(--foreground)]'
                )}
              >
                €{regularPrice}
              </span>
              <span className="wiz-helper text-[#7A7A7A]">
                {tp('perMonth')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-2 text-[#7A7A7A]">
          {tp(`${tier}.featuresLabel`)}
        </p>
        <ul className="space-y-1.5">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 wiz-helper">
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isPro ? 'bg-[var(--paper)]' : 'bg-[var(--accent)]'
                )}
              >
                <Check
                  className={cn(
                    'w-2.5 h-2.5',
                    isPro ? 'text-[#9A9A9A]' : 'text-white'
                  )}
                  weight="bold"
                />
              </span>
              <span
                className={isPro ? 'text-[#7A7A7A]' : 'text-[var(--foreground)]'}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isPro ? (
        <div className="w-full py-3 px-4 text-center wiz-body-sm font-semibold rounded-full border-2 border-[var(--border)] text-[#9A9A9A] cursor-not-allowed">
          {tp('ctaComingSoon')}
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'w-full py-3 px-4 wiz-body-sm font-semibold rounded-full transition-all duration-200',
            isGrowth
              ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:scale-[1.01] hover:shadow-lg hover:shadow-[var(--accent)]/25'
              : 'border-2 border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white'
          )}
        >
          {tp('cta')}
        </button>
      )}
    </div>
  );
}
