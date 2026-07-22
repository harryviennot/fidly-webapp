/**
 * Weekly scan goal: a gentle, beatable target the dashboard nudges toward.
 *
 * Auto-derived from the trailing 4 complete weeks' average (smart default), with
 * an owner override stored in businesses.settings.weekly_goal. Framing is always
 * positive — a slow week never reads as failure. See web/docs/dashboard-achievements.md.
 */

import type { WeeklyScanPoint } from "@/types/transaction";

/** Floor for brand-new businesses (no history) and the minimum auto target. */
export const STARTER_WEEKLY_GOAL = 10;

function roundToNearest5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Average scans over the trailing 4 COMPLETE weeks. The RPC returns up to 5
 * complete weeks (current partial week excluded), so we take the newest 4.
 */
export function deriveGoalBaseline(series: WeeklyScanPoint[]): number {
  if (!series || series.length === 0) return 0;
  const recent = series.slice(-4);
  const sum = recent.reduce((acc, w) => acc + (w.scans || 0), 0);
  return recent.length > 0 ? sum / recent.length : 0;
}

/** A clean, achievable auto target near the recent average. */
export function autoWeeklyGoal(series: WeeklyScanPoint[]): number {
  const baseline = deriveGoalBaseline(series);
  if (baseline <= 0) return STARTER_WEEKLY_GOAL;
  return Math.max(STARTER_WEEKLY_GOAL, roundToNearest5(baseline));
}

/** Owner override wins (when a positive number); otherwise the auto target. */
export function resolveWeeklyGoal(
  override: number | undefined | null,
  series: WeeklyScanPoint[]
): number {
  if (typeof override === "number" && override > 0) return Math.round(override);
  return autoWeeklyGoal(series);
}

export interface WeeklyGoalStatus {
  current: number;
  target: number;
  /** 0..1 fill. */
  progress: number;
  /** Scans still needed to hit the goal (0 once reached). */
  remaining: number;
  reached: boolean;
}

export function weeklyGoalStatus(
  currentWeekScans: number,
  target: number
): WeeklyGoalStatus {
  const safeTarget = Math.max(1, target);
  return {
    current: currentWeekScans,
    target,
    progress: Math.min(1, currentWeekScans / safeTarget),
    remaining: Math.max(0, target - currentWeekScans),
    reached: currentWeekScans >= target,
  };
}
