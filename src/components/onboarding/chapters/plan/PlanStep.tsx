'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import { changeTier, createCheckoutSession } from '@/api/billing';
import {
  effectivePrice,
  isFoundingProgramOpen,
  type TierId,
} from '@/lib/pricing';
import { FoundingCountdown } from '@/components/ui/founding-countdown';
import { useWizardStep } from '../../wizard-context';

const TIERS: readonly TierId[] = ['starter', 'growth', 'pro'] as const;

/**
 * Final wizard step. Selecting a tier here is LOCAL only — no API call —
 * until the user clicks "Launch my program" (the footer Continue). At that
 * point we fire a single `changeTier` request and finalise the wizard.
 * No confirmation dialog: the user has already committed by reading the
 * cards and pressing Launch.
 *
 * Why this flow:
 *  - Every new business is created on a Pro trial so feature limits never
 *    block the wizard's setup steps. The plan step is when we lock that
 *    in or downgrade to Starter / Growth.
 *  - Each card click only mutates local React state — the user can flip
 *    selection a few times to compare price + features without hitting
 *    `/billing/change-tier` every time.
 *  - Continue is disabled until the user has picked a tier — being "on Pro"
 *    isn't a choice; it's a default. We force the explicit pick before
 *    they leave the wizard.
 *
 * Visual contract mirrors the showcase landing site's `FoundingPartnerStep`
 * on the `dev` branch.
 */
export function PlanStep() {
  const t = useTranslations('onboardingBusiness.chapters.plan');
  const tp = useTranslations('pricing');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const currentTier = currentBusiness?.subscription_tier;
  const requiresCardUpfront = !!currentBusiness?.requires_card_upfront;
  const isFoundingPartner = !!currentBusiness?.is_founding_partner;
  const foundingOpen = isFoundingProgramOpen();
  const showFoundingPricing = isFoundingPartner && foundingOpen;
  const showcaseUrl =
    process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';

  // Pre-select if the user has already chosen Starter / Growth in a prior
  // visit. For the default Pro trial we leave selection blank so the user
  // is forced to make an explicit pick.
  const [selectedTier, setSelectedTier] = useState<TierId | null>(() => {
    if (currentTier === 'starter' || currentTier === 'growth') return currentTier;
    return null;
  });

  useEffect(() => {
    ctx.setCanProceed(!!selectedTier);
  }, [ctx, selectedTier]);

  // Card-upfront new signups go to Stripe Checkout, so the footer CTA reflects
  // that ("Démarrer mon essai" rather than "Lancer mon programme"). Legacy
  // no-card businesses keep the registry default. Set from the step so it wins
  // over the shell's per-navigation label reset (same ordering that lets the
  // submit handler below survive).
  useEffect(() => {
    if (requiresCardUpfront) ctx.setNextLabel(t('ctaCheckout'));
  }, [ctx, requiresCardUpfront, t]);

  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      if (!selectedTier || !businessId) return { ok: false };

      // New-signup card-upfront flow: hand off to Stripe Checkout. The chosen
      // tier rides along in the checkout session; the 30-day trial starts (and
      // the tier is persisted) when Stripe's subscription webhook fires. The
      // shell finalises setup_progress BEFORE following `redirectTo`, so a
      // user who returns without paying lands on the dashboard checkout gate,
      // not back in the wizard.
      if (requiresCardUpfront) {
        try {
          const origin = window.location.origin;
          const { checkout_url } = await createCheckoutSession(
            businessId,
            selectedTier,
            `${origin}/?checkout=success`,
            `${origin}/?checkout=cancelled`
          );
          return { ok: true, redirectTo: checkout_url };
        } catch (err) {
          toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
          return {
            ok: false,
            reason: err instanceof Error ? err.message : tErr('saveFailed'),
          };
        }
      }

      // Legacy no-card flow: persist the chosen tier and finish (no payment).
      // No tier change → just finalise, skip the API call.
      if (currentTier === selectedTier) return { ok: true };

      try {
        await changeTier(businessId, selectedTier);
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return {
          ok: false,
          reason: err instanceof Error ? err.message : tErr('saveFailed'),
        };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [ctx, selectedTier, businessId, currentTier, requiresCardUpfront, tErr]);

  const hasSelection = selectedTier !== null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center animate-slide-up">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto w-full animate-slide-up delay-80">
        {TIERS.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            isFoundingPartner={isFoundingPartner}
            isSelected={selectedTier === tier}
            hasSelection={hasSelection}
            onSelect={() => setSelectedTier(tier)}
            tp={tp}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 max-w-2xl mx-auto text-center animate-slide-up delay-160">
        {requiresCardUpfront && (
          <p className="wiz-helper font-medium text-[var(--foreground)]">
            {t('checkoutReassurance')}
          </p>
        )}
        <p className="wiz-helper text-[#7A7A7A]">
          {tp('ctaSubtext')}
        </p>
        <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
          {tp.rich('legalNotice', {
            terms: (chunks) => (
              <a
                href={`${showcaseUrl}/terms`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--foreground)] transition-colors"
              >
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a
                href={`${showcaseUrl}/privacy`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--foreground)] transition-colors"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  );
}

interface TierCardProps {
  tier: TierId;
  isFoundingPartner: boolean;
  isSelected: boolean;
  /** True when ANY tier has been selected — used to demote Growth's
   *  default "recommended" treatment so two cards don't fight for the
   *  accent color simultaneously. */
  hasSelection: boolean;
  onSelect: () => void;
  tp: ReturnType<typeof useTranslations>;
}

function TierCard({
  tier,
  isFoundingPartner,
  isSelected,
  hasSelection,
  onSelect,
  tp,
}: TierCardProps) {
  const isGrowth = tier === 'growth';

  // Growth always carries the "most popular" framing — accent-colored when
  // nothing is selected (or when Growth itself is the pick), black-toned
  // when a different tier is selected so the chosen card stays
  // unambiguous but Growth doesn't lose its recommendation badge entirely.
  const isGrowthAccented = isGrowth && (isSelected || !hasSelection);
  const isGrowthDimmed = isGrowth && hasSelection && !isSelected;

  // Resolve the outer border color in a single expression so the border-
  // WIDTH stays `border-2` on every card and selecting a tier doesn't
  // bump dimensions on its neighbours (no ring-vs-border layout swap).
  // Growth-dimmed gets a muted neutral instead of pure foreground so it
  // still reads as "recommended" without competing with the chosen card.
  const borderColorClass = isSelected
    ? 'border-[var(--accent)]'
    : isGrowthAccented
      ? 'border-[var(--accent)]'
      : isGrowthDimmed
        ? 'border-[#9A9A9A]'
        : 'border-[var(--border)]';

  const { displayPrice, regularPrice, isFoundingDiscount } = effectivePrice(
    tier,
    isFoundingPartner
  );

  const features = (tp.raw(`${tier}.features`) as string[]) ?? [];

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border-2 p-5 bg-white transition-colors',
        borderColorClass,
        isSelected && 'shadow-lg',
        isGrowthAccented && !isSelected && 'shadow-md'
      )}
    >
      {/* Top badge: SELECTED beats POPULAR (Growth keeps its popular badge
          whether it's the chosen tier or someone else was picked — only
          Growth itself becoming the selected card replaces the badge with
          "SELECTED"). */}
      {isSelected ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--accent)] text-white whitespace-nowrap">
            <Check className="w-3 h-3" weight="bold" />
            {tp('selected')}
          </span>
        </div>
      ) : isGrowth ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap',
              isGrowthDimmed
                ? 'bg-[#9A9A9A] text-white'
                : 'bg-[var(--accent)] text-white'
            )}
          >
            {tp('popular')}
          </span>
        </div>
      ) : null}

      <div className="mb-4 mt-1">
        <h3 className="text-lg font-bold leading-tight text-[var(--foreground)]">
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
              <span className="text-3xl font-extrabold tabular-nums text-[var(--foreground)]">
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
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[var(--accent)]">
                <Check className="w-2.5 h-2.5 text-white" weight="bold" />
              </span>
              <span className="text-[var(--foreground)]">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          // Fixed height + flex layout — keeps the button identical in
          // size whether it renders "Commencer" or the "✓ Sélectionné"
          // icon+label combo. Without `h-11` the inline-flex wrapper for
          // the selected state shifts the button height by a hair.
          'w-full h-11 px-4 flex items-center justify-center gap-1.5 wiz-body-sm font-semibold rounded-full transition-colors duration-200 border-2',
          isSelected
            ? 'bg-[var(--accent)] border-[var(--accent)] text-white cursor-default shadow-md shadow-[var(--accent)]/25'
            : isGrowthAccented
              ? 'bg-[var(--accent)] border-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/25'
              : 'bg-white border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white'
        )}
      >
        {isSelected && <Check className="w-3.5 h-3.5" weight="bold" />}
        {isSelected ? tp('selected') : tp('cta')}
      </button>
    </div>
  );
}
