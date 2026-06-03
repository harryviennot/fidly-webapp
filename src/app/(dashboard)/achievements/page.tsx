"use client";

import { useTranslations } from "next-intl";
import { CheckCircle, Lock } from "@phosphor-icons/react";
import { PageHeader } from "@/components/redesign";
import { AchievementIcon } from "@/components/redesign/achievement-icon";
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
  // Blurred teaser — a glimpse of the next challenge to create a bit of suspense.
  if (a.display === "teaser") {
    return (
      <div className="flex select-none flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)]">
          <Lock className="h-[18px] w-[18px]" weight="bold" />
        </div>
        <p
          aria-hidden
          className="text-[13px] font-semibold leading-snug text-[var(--foreground)] blur-[5px]"
        >
          {achievementTitle(t, a)}
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">{t("stateLocked")}</p>
      </div>
    );
  }

  const earned = a.display === "earned";
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 transition-colors",
        earned
          ? "border-[var(--accent)]/30 bg-[var(--accent-light)]/30"
          : "border-[var(--border)] bg-[var(--card)]"
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            earned
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
          )}
        >
          <AchievementIcon
            name={a.icon}
            className="h-[18px] w-[18px]"
            weight={earned ? "fill" : "bold"}
          />
        </div>
        {earned && <CheckCircle className="h-5 w-5 text-[var(--accent)]" weight="fill" />}
      </div>

      <p className="text-[13px] font-semibold leading-snug text-[var(--foreground)]">
        {achievementTitle(t, a)}
      </p>

      {earned || a.oneTime ? (
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
          {earned ? t("stateEarned") : t("stateLocked")}
        </p>
      ) : (
        <div className="mt-auto pt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round(a.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">
            {achievementValueLabel(a, fmt)}
          </p>
        </div>
      )}
    </div>
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
