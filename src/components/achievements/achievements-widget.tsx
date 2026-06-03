"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy, PencilSimple, ArrowRight } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { InfoPopover } from "@/components/reusables/info-popover";
import { AchievementBadge } from "./achievement-badge";
import { useBusiness } from "@/contexts/business-context";
import { useUpdateBusiness } from "@/hooks/use-business-query";
import { useBusinessAchievements } from "@/hooks/use-business-achievements";
import {
  computeAchievements,
  metricValuesFromData,
  achievementTitle,
  achievementValueLabel,
  type ResolvedAchievement,
} from "@/lib/achievements";
import {
  resolveWeeklyGoal,
  weeklyGoalStatus,
  autoWeeklyGoal,
  type WeeklyGoalStatus,
} from "@/lib/weekly-goal";

const fmt = (n: number) => n.toLocaleString();

/** Thin progress bar, modeled on the wizard's CSS-width bar. */
function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "muted" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
        style={{ width: `${Math.round(value * 100)}%`, opacity: tone === "muted" ? 0.5 : 1 }}
      />
    </div>
  );
}

function RungRow({ a, t }: { a: ResolvedAchievement; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-3">
      {/* Colored (not matte) so the in-progress goals feel inviting; the bar
          below carries the "not yet earned" signal. No gold final-tier rim —
          these aren't completed. */}
      <AchievementBadge
        category={a.category}
        value={a.threshold}
        state="earned"
        size={40}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
            {achievementTitle(t, a)}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted-foreground)]">
            {achievementValueLabel(a, fmt)}
          </span>
        </div>
        <ProgressBar value={a.progress} />
      </div>
    </div>
  );
}

function WeeklyGoalBlock({
  goal,
  isAuto,
  autoTarget,
  canEdit,
  onSave,
  onReset,
  saving,
  t,
}: {
  goal: WeeklyGoalStatus;
  isAuto: boolean;
  autoTarget: number;
  canEdit: boolean;
  onSave: (value: number) => void;
  onReset: () => void;
  saving: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(goal.target));

  // Seed the input from the current target each time the dialog opens (no effect
  // needed — react-hooks/set-state-in-effect).
  const openDialog = () => {
    setValue(String(goal.target));
    setOpen(true);
  };

  const handleSave = () => {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) onSave(n);
    setOpen(false);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {t("weeklyGoal.label")}
          </span>
          <InfoPopover content={t("info.weeklyGoal")} label={t("weeklyGoal.label")} />
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openDialog}
            aria-label={t("weeklyGoal.editTitle")}
            className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <PencilSimple className="h-3.5 w-3.5" weight="bold" />
          </button>
        )}
      </div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold tabular-nums leading-none text-[var(--foreground)]">
          {goal.current}
          <span className="text-[15px] font-semibold text-[var(--muted-foreground)]"> / {goal.target}</span>
        </span>
        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
          {t("weeklyGoal.unit")}
        </span>
      </div>
      <ProgressBar value={goal.progress} />
      <p className="mt-2 text-[12px] text-[var(--muted-foreground)]">
        {goal.reached
          && t("weeklyGoal.reached", { current: goal.current, target: goal.target })
        }
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("weeklyGoal.editTitle")}</DialogTitle>
            <DialogDescription>
              {t("weeklyGoal.editDescription", { auto: autoTarget })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-1">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              {t("weeklyGoal.fieldLabel")}
            </label>
            <Input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {!isAuto && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
                disabled={saving}
              >
                {t("weeklyGoal.reset")}
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("weeklyGoal.cancel")}
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {t("weeklyGoal.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Dashboard centerpiece: a gentle weekly goal + the achievements the owner is
 * closest to unlocking. Replaces the old momentum/insight cards. Self-contained,
 * fetches its own data. See web/docs/dashboard-achievements.md.
 */
export function AchievementsWidget({ delay = 0 }: { delay?: number }) {
  const t = useTranslations("achievements");
  const { currentBusiness, currentRole } = useBusiness();
  const businessId = currentBusiness?.id;
  const isOwner = currentRole === "owner";
  const { data } = useBusinessAchievements(businessId);
  const updateBiz = useUpdateBusiness(businessId);

  const settings = currentBusiness?.settings;
  const firstBroadcast = Boolean(settings?.first_broadcast_sent);
  const seen = settings?.achievements_seen;
  const goalOverride = settings?.weekly_goal ?? null;

  const seenList = Array.isArray(seen) ? seen : [];
  const computed = data
    ? computeAchievements(metricValuesFromData(data, firstBroadcast), seenList)
    : null;

  const series = data?.weekly_stamp_series ?? [];
  const target = resolveWeeklyGoal(goalOverride, series);
  const goal = weeklyGoalStatus(data?.current_week_stamps ?? 0, target);

  // One-time celebration. On the very first load (achievements_seen never set)
  // we silently seed the baseline so already-earned trophies never pop
  // retroactively; only future unlocks celebrate.
  const seededRef = useRef(false);
  const [hasFreshUnlock, setHasFreshUnlock] = useState(false);

  const unlockedKeys = computed?.unlockedKeys ?? [];
  const seenSignature = Array.isArray(seen) ? seen.join(",") : "__init__";

  useEffect(() => {
    // Settings writes (seeding + celebration ledger) are owner-only on the API.
    // Admins still see the widget; they just don't seed/celebrate.
    if (!isOwner) return;
    if (!computed || !businessId || updateBiz.isPending) return;
    if (!Array.isArray(seen)) {
      if (seededRef.current) return;
      seededRef.current = true;
      updateBiz.mutate({ settings: { achievements_seen: unlockedKeys } });
      return;
    }
    const fresh = unlockedKeys.filter((k) => !seen.includes(k));
    if (fresh.length === 0) return;
    const first = computed.all.find((a) => a.key === fresh[0]);
    const name = first ? achievementTitle(t, first) : "";
    toast.success(
      fresh.length === 1
        ? t("unlockedOne", { name })
        : t("unlockedMany", { count: fresh.length }),
      { icon: "🎉", duration: 5000 }
    );
    setHasFreshUnlock(true);
    updateBiz.mutate({
      settings: { achievements_seen: Array.from(new Set([...seen, ...unlockedKeys])) },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedKeys.join(","), seenSignature, updateBiz.isPending, businessId, isOwner]);

  const topInProgress = computed?.inProgress.slice(0, 3) ?? [];
  const earned = computed?.earnedCount ?? 0;
  const total = computed?.totalCount ?? 0;

  return (
    <Card hover={false} className="animate-slide-up p-4" style={{ animationDelay: `${delay}ms` }}>
      <WeeklyGoalBlock
        goal={goal}
        isAuto={goalOverride === null}
        autoTarget={autoWeeklyGoal(series)}
        canEdit={isOwner}
        onSave={(v) => updateBiz.mutate({ settings: { weekly_goal: v } })}
        onReset={() => updateBiz.mutate({ settings: { weekly_goal: null } })}
        saving={updateBiz.isPending}
        t={t}
      />

      <div className="my-4 h-px bg-[var(--border)]" />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-[var(--accent)]" weight="fill" />
          <span className="text-sm font-semibold text-[var(--foreground)]">{t("title")}</span>
          {hasFreshUnlock && (
            <Badge variant="success" className="ml-1 px-1.5 py-0 text-[9px]">
              {t("new")}
            </Badge>
          )}
        </div>
        <span className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
          {t("earnedCount", { earned, total })}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {topInProgress.map((a) => (
          <RungRow key={a.key} a={a} t={t} />
        ))}
        {computed && topInProgress.length === 0 && (
          <p className="py-1 text-[12px] text-[var(--muted-foreground)]">{t("allEarned")}</p>
        )}
      </div>

      <Link
        href="/achievements"
        className="mt-4 flex items-center justify-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline"
      >
        {t("viewAll")}
        <ArrowRight className="h-3.5 w-3.5" weight="bold" />
      </Link>
    </Card>
  );
}
