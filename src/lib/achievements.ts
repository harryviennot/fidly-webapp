/**
 * Achievement catalog + resolver for the dashboard gamification.
 *
 * Single source of truth for every trophy: its category, the metric it reads,
 * the thresholds (ladder rungs), and the icon. The UI layer formats labels via
 * i18n — this module stays pure (no React, no next-intl) so the same logic feeds
 * the dashboard widget and the /achievements page.
 *
 * Metric definitions come straight from get_business_achievements (migration 95),
 * so a trophy total always agrees with the dashboard StatCards.
 * See web/docs/dashboard-achievements.md.
 */

export type AchievementCategory = "growth" | "engagement" | "loyalty" | "firsts";

export type LadderMetric =
  | "total_customers"
  | "total_stamps_given"
  | "repeat_customers"
  | "repeat_rate";

export type OneTimeMetric = "first_reward" | "first_broadcast";

export type AchievementMetric = LadderMetric | OneTimeMetric;

/** Resolved metric values the resolver scores against. repeat_rate is a 0..1 fraction. */
export interface AchievementMetricValues {
  total_customers: number;
  total_stamps_given: number;
  repeat_customers: number;
  repeat_rate: number;
  first_reward: boolean;
  first_broadcast: boolean;
}

export interface LadderDef {
  category: AchievementCategory;
  metric: LadderMetric;
  thresholds: number[];
  /** Phosphor icon name, resolved to a component in the UI layer. */
  icon: string;
}

export interface OneTimeDef {
  key: string;
  category: AchievementCategory;
  metric: OneTimeMetric;
  icon: string;
}

/** Two continuous climbing ladders (Customers, Stamps) + a lighter Loyalty track. */
export const ACHIEVEMENT_LADDERS: LadderDef[] = [
  {
    category: "growth",
    metric: "total_customers",
    thresholds: [1, 10, 25, 50, 100, 250, 500, 1000, 2500],
    icon: "Users",
  },
  {
    category: "engagement",
    metric: "total_stamps_given",
    thresholds: [50, 250, 1000, 5000, 25000, 100000],
    icon: "Stamp",
  },
  {
    category: "loyalty",
    metric: "repeat_customers",
    thresholds: [1, 25, 100],
    icon: "Repeat",
  },
  {
    category: "loyalty",
    metric: "repeat_rate",
    thresholds: [0.25, 0.4, 0.6],
    icon: "ArrowsClockwise",
  },
];

/** One-time "first" badges (delightful moments, fire once). */
export const ACHIEVEMENT_ONE_TIMES: OneTimeDef[] = [
  { key: "first_reward", category: "firsts", metric: "first_reward", icon: "Gift" },
  { key: "first_broadcast", category: "firsts", metric: "first_broadcast", icon: "Megaphone" },
];

export interface ResolvedAchievement {
  /** Stable key — also the celebration ledger key in settings.achievements_seen. */
  key: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  icon: string;
  /** Target for this rung. For one-time achievements, 1. */
  threshold: number;
  /** Current metric value (absolute; repeat_rate is a 0..1 fraction). */
  current: number;
  unlocked: boolean;
  /** 0..1 fill toward this rung. */
  progress: number;
  /** repeat_rate rungs — UI formats as a percentage. */
  isRate: boolean;
  /** Non-ladder (one-time) achievement. */
  oneTime: boolean;
}

export interface ComputedAchievements {
  /** Every rung + one-time, with resolved state. */
  all: ResolvedAchievement[];
  earnedCount: number;
  totalCount: number;
  /** Lowest unmet rung per ladder metric, sorted most-progressed first (widget). */
  inProgress: ResolvedAchievement[];
  /** Keys currently unlocked — diff against settings.achievements_seen to celebrate. */
  unlockedKeys: string[];
}

/** repeat_rate keys use whole-percent to stay integer + stable (0.25 -> repeat_rate_25). */
function rungKey(metric: AchievementMetric, threshold: number): string {
  if (metric === "repeat_rate") return `repeat_rate_${Math.round(threshold * 100)}`;
  return `${metric}_${threshold}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function computeAchievements(values: AchievementMetricValues): ComputedAchievements {
  const all: ResolvedAchievement[] = [];

  for (const ladder of ACHIEVEMENT_LADDERS) {
    const current = values[ladder.metric];
    for (const threshold of ladder.thresholds) {
      all.push({
        key: rungKey(ladder.metric, threshold),
        category: ladder.category,
        metric: ladder.metric,
        icon: ladder.icon,
        threshold,
        current,
        unlocked: current >= threshold,
        progress: clamp01(threshold > 0 ? current / threshold : 0),
        isRate: ladder.metric === "repeat_rate",
        oneTime: false,
      });
    }
  }

  for (const ot of ACHIEVEMENT_ONE_TIMES) {
    const unlocked = Boolean(values[ot.metric]);
    all.push({
      key: ot.key,
      category: ot.category,
      metric: ot.metric,
      icon: ot.icon,
      threshold: 1,
      current: unlocked ? 1 : 0,
      unlocked,
      progress: unlocked ? 1 : 0,
      isRate: false,
      oneTime: true,
    });
  }

  // Widget "in progress": the lowest unmet rung per ladder metric (thresholds are
  // pushed ascending, so the first unmet is the next goal), most-progressed first
  // so the owner always sees an "almost there" target.
  const inProgress: ResolvedAchievement[] = [];
  for (const ladder of ACHIEVEMENT_LADDERS) {
    const next = all.find((a) => a.metric === ladder.metric && !a.unlocked);
    if (next) inProgress.push(next);
  }
  inProgress.sort((a, b) => b.progress - a.progress);

  const unlockedKeys = all.filter((a) => a.unlocked).map((a) => a.key);

  return {
    all,
    earnedCount: unlockedKeys.length,
    totalCount: all.length,
    inProgress,
    unlockedKeys,
  };
}

/** Build resolver input from the RPC payload + the business settings flag. */
export function metricValuesFromData(
  data: {
    total_customers: number;
    total_stamps_given: number;
    repeat_customers: number;
    repeat_rate: number;
    total_rewards_redeemed: number;
  },
  firstBroadcastSent: boolean
): AchievementMetricValues {
  return {
    total_customers: data.total_customers,
    total_stamps_given: data.total_stamps_given,
    repeat_customers: data.repeat_customers,
    repeat_rate: data.repeat_rate,
    first_reward: data.total_rewards_redeemed >= 1,
    first_broadcast: firstBroadcastSent,
  };
}

type TFunc = (key: string, values?: Record<string, string | number>) => string;

/** Display title for an achievement, via i18n. Keys are relative to the
 *  "achievements" namespace, so callers pass `useTranslations("achievements")`.
 *  Keeps label logic DRY across the widget and the page. */
export function achievementTitle(t: TFunc, a: ResolvedAchievement): string {
  if (a.oneTime) return t(`firsts.${a.key}`);
  switch (a.metric) {
    case "total_customers":
      return t("ladders.customers", { count: a.threshold });
    case "total_stamps_given":
      return t("ladders.stamps", { count: a.threshold });
    case "repeat_customers":
      return t("ladders.repeatCustomers", { count: a.threshold });
    case "repeat_rate":
      return t("ladders.repeatRate", { pct: Math.round(a.threshold * 100) });
    default:
      return "";
  }
}

/** "740 / 1,000" or "36% / 40%" — the numeric progress under a rung. `fmt` localizes. */
export function achievementValueLabel(
  a: ResolvedAchievement,
  fmt: (n: number) => string
): string {
  if (a.isRate) return `${Math.round(a.current * 100)}% / ${Math.round(a.threshold * 100)}%`;
  return `${fmt(Math.min(a.current, a.threshold))} / ${fmt(a.threshold)}`;
}
