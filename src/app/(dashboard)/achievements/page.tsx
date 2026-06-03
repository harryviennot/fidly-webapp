"use client";

import { useTranslations } from "next-intl";
import { CheckCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/redesign";
import { AchievementIcon } from "@/components/redesign/achievement-icon";
import { useBusiness } from "@/contexts/business-context";
import { useBusinessAchievements } from "@/hooks/use-business-achievements";
import {
  computeAchievements,
  metricValuesFromData,
  achievementTitle,
  achievementValueLabel,
  type AchievementCategory,
  type ResolvedAchievement,
} from "@/lib/achievements";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString();
const CATEGORY_ORDER: AchievementCategory[] = ["growth", "engagement", "loyalty", "firsts"];

function AchievementTile({
  a,
  t,
}: {
  a: ResolvedAchievement;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 transition-colors",
        a.unlocked
          ? "border-[var(--accent)]/30 bg-[var(--accent-light)]/30"
          : "border-[var(--border)] bg-[var(--card)]"
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            a.unlocked
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
          )}
        >
          <AchievementIcon
            name={a.icon}
            className="h-[18px] w-[18px]"
            weight={a.unlocked ? "fill" : "bold"}
          />
        </div>
        {a.unlocked && (
          <CheckCircle className="h-5 w-5 text-[var(--accent)]" weight="fill" />
        )}
      </div>

      <p className="text-[13px] font-semibold leading-snug text-[var(--foreground)]">
        {achievementTitle(t, a)}
      </p>

      {a.oneTime ? (
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
          {a.unlocked ? t("stateEarned") : t("stateLocked")}
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
  const computed = data
    ? computeAchievements(metricValuesFromData(data, firstBroadcast))
    : null;

  const earned = computed?.earnedCount ?? 0;
  const total = computed?.totalCount ?? 0;

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />

      <span className="text-[13px] font-medium text-[var(--muted-foreground)]">
        {t("earnedCount", { earned, total })}
      </span>

      {CATEGORY_ORDER.map((cat) => {
        const items = computed?.all.filter((a) => a.category === cat) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={cat} className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t(`categories.${cat}`)}
            </h2>
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
