/**
 * Tests for the weekly scan goal (dashboard nudge).
 *
 * The series feeding it (`weekly_scan_series`) counts scans of either program
 * type, so the goal works identically for stamp and points businesses. The
 * framing rule under test: targets are gentle (rounded, floored at the
 * starter goal) and a slow week never produces a negative "remaining".
 */
import { describe, expect, test } from "bun:test";
import {
  autoWeeklyGoal,
  deriveGoalBaseline,
  resolveWeeklyGoal,
  STARTER_WEEKLY_GOAL,
  weeklyGoalStatus,
} from "./weekly-goal";
import type { WeeklyScanPoint } from "@/types/transaction";

const series = (...scans: number[]): WeeklyScanPoint[] =>
  scans.map((n, i) => ({ week_start: `2026-06-0${i + 1}T00:00:00Z`, scans: n }));

describe("deriveGoalBaseline", () => {
  test("averages the newest 4 complete weeks only", () => {
    // 5 weeks in, oldest first — the 239 outlier week must drop off.
    expect(deriveGoalBaseline(series(239, 100, 20, 20, 20))).toBe(40);
  });

  test("empty or missing series is zero", () => {
    expect(deriveGoalBaseline([])).toBe(0);
  });
});

describe("autoWeeklyGoal", () => {
  test("no history falls back to the starter goal", () => {
    expect(autoWeeklyGoal([])).toBe(STARTER_WEEKLY_GOAL);
  });

  test("rounds to the nearest 5 and floors at the starter goal", () => {
    expect(autoWeeklyGoal(series(23, 23, 23, 23))).toBe(25);
    expect(autoWeeklyGoal(series(2, 2, 2, 2))).toBe(STARTER_WEEKLY_GOAL);
  });
});

describe("resolveWeeklyGoal", () => {
  test("a positive owner override wins", () => {
    expect(resolveWeeklyGoal(37, series(100, 100, 100, 100))).toBe(37);
  });

  test("zero/undefined overrides fall back to the auto target", () => {
    expect(resolveWeeklyGoal(0, series(20, 20, 20, 20))).toBe(20);
    expect(resolveWeeklyGoal(undefined, [])).toBe(STARTER_WEEKLY_GOAL);
  });
});

describe("weeklyGoalStatus", () => {
  test("progress caps at 1 and remaining floors at 0 past the goal", () => {
    const status = weeklyGoalStatus(14, 10);
    expect(status.reached).toBe(true);
    expect(status.progress).toBe(1);
    expect(status.remaining).toBe(0);
  });

  test("mid-week status reports remaining scans", () => {
    const status = weeklyGoalStatus(4, 10);
    expect(status.reached).toBe(false);
    expect(status.progress).toBeCloseTo(0.4);
    expect(status.remaining).toBe(6);
  });
});
