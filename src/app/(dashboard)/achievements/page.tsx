"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/redesign";
import { AchievementBadge, BADGE_CATEGORY_COLOR } from "@/components/redesign/achievement-badge";
import { Card } from "@/components/ui/card";
import { InfoPopover } from "@/components/reusables/info-popover";
import { useBusiness } from "@/contexts/business-context";
import { useBusinessAchievements } from "@/hooks/use-business-achievements";
import {
  computeAchievements,
  metricValuesFromData,
  achievementsForDisplay,
  achievementTitle,
  achievementValueLabel,
  CATEGORY_ORDER,
  type DisplayAchievement,
} from "@/lib/achievements";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString();

function AchievementTile({
  a,
  t,
}: {
  a: DisplayAchievement;
  t: ReturnType<typeof useTranslations>;
}) {
  const color = BADGE_CATEGORY_COLOR[a.category];
  const state =
    a.display === "earned" ? "earned" : a.display === "current" ? "progress" : "locked";
  const earned = a.display === "earned";
  const teaser = a.display === "teaser";

  return (
    <Card
      hover={false}
      style={
        { "--fam": color, "--fam-tint": `${color}22`, "--fam-border": `${color}55` } as CSSProperties
      }
      className={cn(
        "group relative flex flex-col items-center p-5 text-center [perspective:600px]",
        earned
          ? "border-[color:var(--fam-border)] bg-[linear-gradient(180deg,var(--fam-tint),var(--card)_62%)] shadow-[0_10px_24px_-14px_var(--fam)]"
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

      {/* Hover an earned trophy → it flips a full 360° on the X axis. */}
      <div
        className={cn(
          "mb-3 transition-transform duration-700 ease-out [transform-style:preserve-3d]",
          earned && "group-hover:[transform:rotateX(360deg)]"
        )}
      >
        <AchievementBadge
          category={a.category}
          value={a.oneTime ? undefined : a.threshold}
          state={state}
          isFinalTier={a.isFinalTier}
          oneTime={a.oneTime}
          size={84}
        />
      </div>

      <p
        className={cn(
          "text-[13.5px] font-semibold leading-snug text-[var(--foreground)]",
          teaser && "select-none blur-[5px]"
        )}
        aria-hidden={teaser || undefined}
      >
        {achievementTitle(t, a)}
      </p>

      {earned ? (
        <p className="mt-1.5 text-[11px] font-semibold" style={{ color }}>
          {t("stateEarned")}
        </p>
      ) : a.oneTime || teaser ? (
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">{t("stateLocked")}</p>
      ) : (
        <div className="mt-3 w-full max-w-[220px]">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round(a.progress * 100)}%`, backgroundColor: color }}
            />
          </div>
          <p className="mt-1.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">
            {achievementValueLabel(a, fmt)}
          </p>
        </div>
      )}
    </Card>
  );
}

export default function AchievementsPage() {
  const t = useTranslations("achievements");
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { data } = useBusinessAchievements(businessId);

  const firstBroadcast = Boolean(currentBusiness?.settings?.first_broadcast_sent);
  const seen = currentBusiness?.settings?.achievements_seen;
  const computed = data
    ? computeAchievements(
        metricValuesFromData(data, firstBroadcast),
        Array.isArray(seen) ? seen : []
      )
    : null;

  const displayList = computed ? achievementsForDisplay(computed.all) : [];
  const earned = computed?.earnedCount ?? 0;
  const total = computed?.totalCount ?? 0;

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />

      <span className="text-[13px] font-medium text-[var(--muted-foreground)]">
        {t("earnedCount", { earned, total })}
      </span>

      {CATEGORY_ORDER.map((cat) => {
        const items = displayList.filter((a) => a.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t(`categories.${cat}`)}
              </h2>
              <InfoPopover content={t(`info.${cat}`)} label={t(`categories.${cat}`)} />
            </div>
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {items.map((a) => (
                <AchievementTile key={a.key} a={a} t={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
