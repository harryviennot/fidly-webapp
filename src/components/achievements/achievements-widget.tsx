"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
import { SectionHeader } from "@/components/redesign/section-header";
import { InfoPopover } from "@/components/reusables/info-popover";
import { ProgressBar } from "@/components/reusables/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementBadge } from "./achievement-badge";
import { useBusiness } from "@/contexts/business-context";
import { useUpdateBusiness } from "@/hooks/use-business-query";
import { useComputedAchievements } from "@/hooks/use-business-achievements";
import {
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

function RungRow({ a, t }: { a: ResolvedAchievement; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-3.5">
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
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
            {achievementTitle(t, a)}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted-foreground)]">
            {achievementValueLabel(a, fmt)}
          </span>
        </div>
        <ProgressBar value={a.progress} trackClassName="h-2" />
      </div>
    </div>
  );
}

/** A freshly-earned trophy shown at 100% in the widget. The animation lives on
 *  /achievements (so the dashboard isn't interrupted), so this links there to play
 *  it. */
function CompletedRow({ a, t }: { a: ResolvedAchievement; t: ReturnType<typeof useTranslations> }) {
  return (
    <Link href="/achievements" className="group flex items-center gap-3.5">
      <AchievementBadge
        category={a.category}
        value={a.oneTime ? undefined : a.threshold}
        state="earned"
        isFinalTier={a.isFinalTier}
        oneTime={a.oneTime}
        size={40}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
            {achievementTitle(t, a)}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--accent)] group-hover:underline">
            {t("celebration.see")}
            <ArrowRight className="h-3.5 w-3.5" weight="bold" />
          </span>
        </div>
        <ProgressBar value={1} trackClassName="h-2" />
      </div>
    </Link>
  );
}

function WidgetSkeleton({ delay }: { delay: number }) {
  return (
    <Card flat className="animate-slide-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-6 w-24" />
      <Skeleton className="mt-3 h-2 w-full rounded-full" />
      <div className="my-5 h-px bg-[var(--border)]" />
      <Skeleton className="h-4 w-28" />
      <div className="mt-4 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3.5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-2 h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Card>
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
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold tabular-nums leading-none text-[var(--foreground)]">
          {goal.current}
          <span className="text-[15px] font-semibold text-[var(--muted-foreground)]"> / {goal.target}</span>
        </span>
        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
          {t("weeklyGoal.unit")}
        </span>
      </div>
      <ProgressBar value={goal.progress} trackClassName="h-2" />
      {goal.reached && (
        <p className="mt-2.5 text-[12px] text-[var(--muted-foreground)]">
          {t("weeklyGoal.reached", { current: goal.current, target: goal.target })}
        </p>
      )}

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
          {!isAuto && (
            <div className="-mt-3 flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-sm font-medium text-[var(--muted-foreground)] hover:bg-transparent hover:text-[var(--foreground)]"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
                disabled={saving}
              >
                {t("weeklyGoal.reset")}
              </Button>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
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
  const updateBiz = useUpdateBusiness(businessId);

  const settings = currentBusiness?.settings;
  const firstBroadcast = Boolean(settings?.first_broadcast_sent);
  const goalOverride = settings?.weekly_goal ?? null;

  // Read-only: recording is the headless AchievementRecorder's job (dashboard
  // layout); the unlock animation lives only on /achievements.
  const { data, computed, isLoading, isError } = useComputedAchievements(businessId, firstBroadcast);

  // Don't show a broken widget on a data error; show a skeleton while loading.
  if (isError) return null;
  if (isLoading || !data || !computed) return <WidgetSkeleton delay={delay} />;

  const series = data.weekly_scan_series ?? [];
  const target = resolveWeeklyGoal(goalOverride, series);
  const goal = weeklyGoalStatus(data.current_week_scans ?? 0, target);

  // Freshly-earned but not-yet-celebrated trophies — shown as "completed" rows
  // that link to /achievements (where the animation plays).
  const completed = computed.all
    .filter((a) => a.unlocked && a.acknowledgedAt === null)
    .slice(0, 3);
  const hasFreshUnlock = completed.length > 0;
  const topInProgress = computed.inProgress.slice(0, Math.max(0, 3 - completed.length));

  return (
    <Card flat className="animate-slide-up p-5" style={{ animationDelay: `${delay}ms` }}>
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

      <div className="my-5 h-px bg-[var(--border)]" />

      <SectionHeader
        title={t("title")}
        icon={<Trophy className="h-4 w-4 shrink-0 text-[var(--accent)]" weight="fill" />}
        badge={
          hasFreshUnlock ? (
            <Badge variant="success" className="ml-1 px-1.5 py-0 text-[9px]">
              {t("new")}
            </Badge>
          ) : undefined
        }
        action={{ label: t("viewAll"), href: "/achievements" }}
      />

      <div className="flex flex-col gap-4">
        {completed.map((a) => (
          <CompletedRow key={a.key} a={a} t={t} />
        ))}
        {topInProgress.map((a) => (
          <RungRow key={a.key} a={a} t={t} />
        ))}
        {completed.length === 0 && topInProgress.length === 0 && (
          <p className="py-1 text-[12px] text-[var(--muted-foreground)]">{t("allEarned")}</p>
        )}
      </div>
    </Card>
  );
}
