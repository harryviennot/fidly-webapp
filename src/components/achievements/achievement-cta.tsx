"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "@phosphor-icons/react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { ACHIEVEMENT_CTA, type AchievementMetric } from "@/lib/achievements";
import { cn } from "@/lib/utils";

/**
 * The single action that moves a metric, rendered as a link — so a trophy tells
 * the owner not just "3 more" but HOW. Resolves the metric's CTA, hides it when
 * the plan lacks the gated capability or the (external) scanner URL is unset, and
 * routes internal vs external automatically. Renders nothing when there's no CTA
 * (e.g. first_reward, which is customer-driven). Reused by tiles + the hero.
 */
export function AchievementCtaLink({
  metric,
  className,
}: {
  metric: AchievementMetric;
  className?: string;
}) {
  const t = useTranslations("achievements");
  const { hasFeature } = useEntitlements();

  const cta = ACHIEVEMENT_CTA[metric];
  if (!cta) return null;
  if (cta.featureGate && !hasFeature(cta.featureGate)) return null;

  const href = cta.external ? process.env.NEXT_PUBLIC_SCAN_URL : cta.href;
  if (!href) return null;

  const classes = cn(
    "inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--accent)] transition-colors hover:underline",
    className
  );
  const content = (
    <>
      {t(`cta.${cta.labelKey}`)}
      <ArrowRight className="h-3.5 w-3.5" weight="bold" />
    </>
  );

  return cta.external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {content}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
