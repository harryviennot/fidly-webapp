"use client";

import { useState, type CSSProperties } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/redesign";
import {
  AchievementBadge,
  AchievementCoin,
  AchievementCtaLink,
  AchievementHero,
  BADGE_CATEGORY_COLOR,
  RecentlyEarned,
} from "@/components/achievements";
import { Card } from "@/components/ui/card";
import { InfoPopover } from "@/components/reusables/info-popover";
import { ProgressBar } from "@/components/reusables/progress-bar";
import { useBusiness } from "@/contexts/business-context";
import { useComputedAchievements } from "@/hooks/use-business-achievements";
import {
  achievementsForDisplay,
  achievementTitle,
  achievementValueLabel,
  ACHIEVEMENT_CTA,
  CATEGORY_ORDER,
  type DisplayAchievement,
} from "@/lib/achievements";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString();

/** Group a category's tiles into rows: one row per ladder metric, but all
 *  one-time "firsts" trophies share a single row. */
function buildRows(items: DisplayAchievement[]): DisplayAchievement[][] {
  if (items.every((a) => a.oneTime)) return [items];
  const order: string[] = [];
  const byMetric = new Map<string, DisplayAchievement[]>();
  for (const a of items) {
    if (!byMetric.has(a.metric)) {
      byMetric.set(a.metric, []);
      order.push(a.metric);
    }
    byMetric.get(a.metric)!.push(a);
  }
  return order.map((m) => byMetric.get(m)!);
}

function AchievementTile({
  a,
  t,
  showCta = false,
}: {
  a: DisplayAchievement;
  t: ReturnType<typeof useTranslations>;
  /** The CTA is shown once per section (on the first uncompleted, actionable
   *  tile) — after that the owner knows the lever, so repeating it just clutters. */
  showCta?: boolean;
}) {
  const format = useFormatter();
  const color = BADGE_CATEGORY_COLOR[a.category];

  const earned = a.display === "earned";
  // Keep the SUSPENSE blur only for the next locked LADDER rung. One-time
  // "firsts" stay readable + actionable so owners know the milestone exists.
  const isLadderTeaser = a.display === "teaser" && !a.oneTime;
  const isOneTimeLocked = a.oneTime && !earned;
  const isCurrent = a.display === "current";

  // Replay the flip/shake on each trigger. Driven from mouseenter (desktop) and
  // tap (touch) rather than CSS `:hover`, which on touch sticks on first tap and
  // can't repeat — owners can now tap a tile again and again to replay it.
  const [playing, setPlaying] = useState(false);
  const play = () => {
    setPlaying(false);
    requestAnimationFrame(() => setPlaying(true));
  };

  return (
    <Card
      flat
      onMouseEnter={play}
      onClick={play}
      onAnimationEnd={() => setPlaying(false)}
      style={
        { "--fam": color, "--fam-tint": `${color}22`, "--fam-border": `${color}55` } as CSSProperties
      }
      className={cn(
        // `flat` per web/CLAUDE.md — achievement tiles carry no shadow.
        "group relative flex flex-col items-center p-5 text-center",
        playing && "ach-play",
        earned
          ? "border-[color:var(--fam-border)] bg-[linear-gradient(180deg,var(--fam-tint),var(--card)_62%)]"
          : "border-[var(--border)]"
      )}
    >
      {earned && (
        <CheckCircle
          className="absolute right-3 top-3 h-[22px] w-[22px]"
          style={{ color }}
          weight="fill"
        />
      )}

      {/* Earned → full coin flip; in-progress → half flip; locked → static badge. */}
      <div className={cn("mb-3", isLadderTeaser && "ach-shake")}>
        {earned ? (
          <AchievementCoin
            category={a.category}
            value={a.oneTime ? undefined : a.threshold}
            state="earned"
            isFinalTier={a.isFinalTier}
            oneTime={a.oneTime}
            flip="full"
            size={84}
          />
        ) : isCurrent ? (
          <AchievementCoin
            category={a.category}
            value={a.threshold}
            state="progress"
            isFinalTier={a.isFinalTier}
            flip="half"
            size={84}
          />
        ) : (
          <AchievementBadge
            category={a.category}
            value={a.oneTime ? undefined : a.threshold}
            state="locked"
            isFinalTier={a.isFinalTier}
            oneTime={a.oneTime}
            size={84}
          />
        )}
      </div>

      <p
        className={cn(
          "text-[13.5px] font-semibold leading-snug text-[var(--foreground)]",
          isLadderTeaser && "select-none blur-[5px]"
        )}
        aria-hidden={isLadderTeaser || undefined}
      >
        {achievementTitle(t, a)}
      </p>

      {earned ? (
        <p className="mt-1.5 text-[11px] font-semibold" style={{ color }}>
          {t("stateEarned")}
          {a.unlockedAt && (
            <span className="font-normal text-[var(--muted-foreground)]">
              {" · "}
              {format.relativeTime(new Date(a.unlockedAt))}
            </span>
          )}
        </p>
      ) : isOneTimeLocked ? (
        <div className="mt-1.5 flex flex-col items-center gap-2">
          <p className="text-[11px] text-[var(--muted-foreground)]">{t("stateLocked")}</p>
          {showCta && <AchievementCtaLink metric={a.metric} />}
        </div>
      ) : isCurrent ? (
        <div className="mt-3 w-full max-w-[220px]">
          <ProgressBar value={a.progress} color={color} />
          <p className="mt-1.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">
            {achievementValueLabel(a, fmt)}
          </p>
          {showCta && <AchievementCtaLink metric={a.metric} className="mt-2.5 mx-auto" />}
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">{t("stateLocked")}</p>
      )}
    </Card>
  );
}

export default function AchievementsPage() {
  const t = useTranslations("achievements");
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const firstBroadcast = Boolean(currentBusiness?.settings?.first_broadcast_sent);
  const { computed } = useComputedAchievements(businessId, firstBroadcast);

  const displayList = computed ? achievementsForDisplay(computed.all) : [];

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />

      {computed && <AchievementHero computed={computed} />}
      {computed && <RecentlyEarned all={computed.all} />}

      {CATEGORY_ORDER.map((cat) => {
        const items = displayList.filter((a) => a.category === cat);
        if (items.length === 0) return null;

        // One row per achievement type: a category like "momentum" runs two
        // separate ladders, which shouldn't share a row. One-time "firsts" are
        // standalone trophies, so they stay together on a single row.
        const rows = buildRows(items);

        // Show the action button once per section: on the first uncompleted tile
        // that actually has a lever (current ladder rung or a locked "first").
        const ctaKey = items.find(
          (a) =>
            (a.display === "current" || (a.oneTime && a.display !== "earned")) &&
            ACHIEVEMENT_CTA[a.metric]
        )?.key;

        return (
          <section key={cat} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t(`categories.${cat}`)}
                </h2>
                <InfoPopover content={t(`info.${cat}`)} label={t(`categories.${cat}`)} />
              </div>
              {/* One line that both DEFINES the metric and frames why it matters,
                  so comprehension no longer depends on opening the popover. */}
              <p className="text-[12.5px] text-[var(--muted-foreground)]">{t(`why.${cat}`)}</p>
            </div>
            <div className="flex flex-col gap-5">
              {rows.map((row) => (
                <div
                  key={row[0].metric}
                  className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                >
                  {row.map((a) => (
                    <AchievementTile key={a.key} a={a} t={t} showCta={a.key === ctaKey} />
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
