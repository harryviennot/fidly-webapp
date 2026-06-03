"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AchievementBadge } from "./achievement-badge";
import { achievementTitle, type ResolvedAchievement } from "@/lib/achievements";

/**
 * A "recently earned" strip — the newest trophies with their unlock dates, so the
 * page itself feels like a record of wins rather than a static catalog. A trophy
 * still awaiting its celebration carries a "New" badge.
 */
export function RecentlyEarned({ all }: { all: ResolvedAchievement[] }) {
  const t = useTranslations("achievements");
  const format = useFormatter();

  const recent = all
    .filter((a) => a.unlocked && a.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 6);

  if (recent.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {t("recentlyEarned")}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recent.map((a) => (
          <div
            key={a.key}
            className="flex w-[120px] shrink-0 flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center"
          >
            <div className="relative">
              <AchievementBadge
                category={a.category}
                value={a.oneTime ? undefined : a.threshold}
                state="earned"
                isFinalTier={a.isFinalTier}
                oneTime={a.oneTime}
                size={52}
              />
              {a.acknowledgedAt === null && (
                <Badge
                  variant="success"
                  className="absolute -right-2 -top-1 px-1.5 py-0 text-[9px]"
                >
                  {t("new")}
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 text-[11.5px] font-medium leading-snug text-[var(--foreground)]">
              {achievementTitle(t, a)}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              {format.relativeTime(new Date(a.unlockedAt!))}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
