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

export type AchievementCategory = "growth" | "engagement" | "momentum" | "loyalty" | "firsts";

export type LadderMetric =
  | "total_customers"
  | "total_stamps_given"
  | "stamps_last_30d"
  | "new_customers_last_30d"
  | "repeat_customers";

export type OneTimeMetric =
  | "first_reward"
  | "first_broadcast"
  | "owner_used_native_app"
  | "all_employees_use_native_app"
  | "printed_flyer";

export type AchievementMetric = LadderMetric | OneTimeMetric;

/** Resolved metric values the resolver scores against. */
export interface AchievementMetricValues {
  total_customers: number;
  total_stamps_given: number;
  stamps_last_30d: number;
  new_customers_last_30d: number;
  repeat_customers: number;
  first_reward: boolean;
  first_broadcast: boolean;
  owner_used_native_app: boolean;
  all_employees_use_native_app: boolean;
  printed_flyer: boolean;
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

/**
 * Ladders. Early rungs are deliberately tiny so a new shop unlocks something fast.
 * Lifetime ladders stack forever; the 30-day "momentum" ladders reward a strong
 * RECENT window and are treated as sticky (once earned, stay earned — see
 * computeAchievements) so a rolling window dropping never re-locks a trophy.
 */
export const ACHIEVEMENT_LADDERS: LadderDef[] = [
  {
    category: "growth",
    metric: "total_customers",
    thresholds: [1, 5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000],
    icon: "Users",
  },
  {
    category: "engagement",
    metric: "total_stamps_given",
    thresholds: [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 25000, 100000],
    icon: "Stamp",
  },
  {
    category: "momentum",
    metric: "stamps_last_30d",
    thresholds: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    icon: "TrendUp",
  },
  {
    category: "momentum",
    metric: "new_customers_last_30d",
    thresholds: [5, 10, 25, 50, 100, 250, 500],
    icon: "UserPlus",
  },
  {
    category: "loyalty",
    metric: "repeat_customers",
    thresholds: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    icon: "Repeat",
  },
];

/** One-time "first" badges (delightful moments, fire once). */
export const ACHIEVEMENT_ONE_TIMES: OneTimeDef[] = [
  { key: "first_reward", category: "firsts", metric: "first_reward", icon: "Gift" },
  { key: "first_broadcast", category: "firsts", metric: "first_broadcast", icon: "Megaphone" },
  // App-adoption (STA-174): the owner has scanned from the native app, and the
  // whole team has moved off the web scanner onto the native app.
  { key: "owner_uses_app", category: "firsts", metric: "owner_used_native_app", icon: "DeviceMobile" },
  { key: "team_uses_app", category: "firsts", metric: "all_employees_use_native_app", icon: "DeviceMobile" },
  // Ledger-driven (no RPC metric): unlocked when the owner downloads their
  // printable counter flyer. The /program/flyer screen records it on download.
  { key: "printed_flyer", category: "firsts", metric: "printed_flyer", icon: "Printer" },
];

/** Section order on the /achievements page. */
export const CATEGORY_ORDER: AchievementCategory[] = [
  "engagement",
  "growth",
  "momentum",
  "loyalty",
  "firsts",
];

/**
 * The single action that moves each metric — so a trophy can tell the owner not
 * just "you need 3 more" but HOW to get them. `labelKey` is under
 * `achievements.cta.*`; `external` resolves to NEXT_PUBLIC_SCAN_URL in the UI;
 * `featureGate` hides the CTA when the plan lacks that capability. first_reward is
 * omitted on purpose — it's customer-driven, nothing the owner can do directly.
 */
export interface AchievementCta {
  labelKey: string;
  href?: string;
  external?: boolean;
  featureGate?: string;
}

export const ACHIEVEMENT_CTA: Partial<Record<AchievementMetric, AchievementCta>> = {
  total_customers: { labelKey: "shareQr", href: "/program" },
  new_customers_last_30d: { labelKey: "shareQr", href: "/program" },
  total_stamps_given: { labelKey: "openScanner", external: true },
  stamps_last_30d: { labelKey: "openScanner", external: true },
  repeat_customers: { labelKey: "openScanner", external: true },
  first_broadcast: {
    labelKey: "sendBroadcast",
    href: "/program/broadcasts",
    featureGate: "notifications.broadcast",
  },
  printed_flyer: { labelKey: "downloadFlyer", href: "/program/flyer" },
};

/** One recorded trophy from the server ledger (business_achievements, migration 96). */
export interface AchievementLedgerEntry {
  key: string;
  unlocked_at: string;
  acknowledged_at: string | null;
}

export interface ResolvedAchievement {
  /** Stable key — also the celebration ledger key in settings.achievements_seen. */
  key: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  icon: string;
  /** Target for this rung. For one-time achievements, 1. */
  threshold: number;
  /** Current metric value (absolute). */
  current: number;
  unlocked: boolean;
  /** The lowest unmet rung of its ladder — the "current goal". */
  isNext: boolean;
  /** The top rung of its ladder — the badge gets a gold rim. False for one-time. */
  isFinalTier: boolean;
  /** 0..1 fill toward this rung (1 once earned). */
  progress: number;
  /** Non-ladder (one-time) achievement. */
  oneTime: boolean;
  /** When this rung was earned (from the ledger), or null if not recorded yet. */
  unlockedAt: string | null;
  /** When its unlock was celebrated; null = earned but celebration still pending. */
  acknowledgedAt: string | null;
}

export interface ComputedAchievements {
  /** Every rung + one-time, with resolved state. */
  all: ResolvedAchievement[];
  earnedCount: number;
  totalCount: number;
  /** The current goal per ladder, sorted most-progressed first (widget). */
  inProgress: ResolvedAchievement[];
  /** Keys currently unlocked — diff against settings.achievements_seen to celebrate. */
  unlockedKeys: string[];
}

function rungKey(metric: AchievementMetric, threshold: number): string {
  return `${metric}_${threshold}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Resolve the catalog against current values.
 *
 * The `ledger` (recorded unlocks from the server) makes every trophy **sticky**:
 * once a key has been earned and recorded, it stays unlocked even if the live
 * value later drops below the threshold. This is essential for the rolling 30-day
 * ladders, whose value naturally falls as the window moves — without it a trophy
 * would re-lock. For monotonic lifetime ladders it is a harmless no-op. The ledger
 * also carries each unlock's timestamp + acknowledged state, attached per rung.
 */
export function computeAchievements(
  values: AchievementMetricValues,
  ledger: AchievementLedgerEntry[] = []
): ComputedAchievements {
  const byKey = new Map(ledger.map((e) => [e.key, e]));
  const seen = new Set(byKey.keys());
  const all: ResolvedAchievement[] = [];

  for (const ladder of ACHIEVEMENT_LADDERS) {
    const current = values[ladder.metric];
    let nextMarked = false;
    ladder.thresholds.forEach((threshold, i) => {
      const key = rungKey(ladder.metric, threshold);
      const unlocked = current >= threshold || seen.has(key);
      const isNext = !unlocked && !nextMarked;
      if (isNext) nextMarked = true;
      const entry = byKey.get(key);
      all.push({
        key,
        category: ladder.category,
        metric: ladder.metric,
        icon: ladder.icon,
        threshold,
        current,
        unlocked,
        isNext,
        isFinalTier: i === ladder.thresholds.length - 1,
        progress: unlocked ? 1 : clamp01(threshold > 0 ? current / threshold : 0),
        oneTime: false,
        unlockedAt: entry?.unlocked_at ?? null,
        acknowledgedAt: entry?.acknowledged_at ?? null,
      });
    });
  }

  for (const ot of ACHIEVEMENT_ONE_TIMES) {
    const unlocked = Boolean(values[ot.metric]) || seen.has(ot.key);
    const entry = byKey.get(ot.key);
    all.push({
      key: ot.key,
      category: ot.category,
      metric: ot.metric,
      icon: ot.icon,
      threshold: 1,
      current: unlocked ? 1 : 0,
      unlocked,
      isNext: false,
      isFinalTier: false,
      progress: unlocked ? 1 : 0,
      oneTime: true,
      unlockedAt: entry?.unlocked_at ?? null,
      acknowledgedAt: entry?.acknowledged_at ?? null,
    });
  }

  const inProgress = all
    .filter((a) => a.isNext)
    .sort((a, b) => b.progress - a.progress);

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
    stamps_last_30d: number;
    new_customers_last_30d: number;
    repeat_customers: number;
    total_rewards_redeemed: number;
    owner_used_native_app: boolean;
    all_employees_use_native_app: boolean;
  },
  firstBroadcastSent: boolean
): AchievementMetricValues {
  return {
    total_customers: data.total_customers,
    total_stamps_given: data.total_stamps_given,
    stamps_last_30d: data.stamps_last_30d,
    new_customers_last_30d: data.new_customers_last_30d,
    repeat_customers: data.repeat_customers,
    first_reward: data.total_rewards_redeemed >= 1,
    first_broadcast: firstBroadcastSent,
    owner_used_native_app: data.owner_used_native_app,
    all_employees_use_native_app: data.all_employees_use_native_app,
    // No server metric: this trophy is unlocked purely via the ledger when the
    // owner downloads the flyer (see /program/flyer). False here is correct.
    printed_flyer: false,
  };
}

export type DisplayState = "earned" | "current" | "teaser";

export interface DisplayAchievement extends ResolvedAchievement {
  display: DisplayState;
}

/**
 * Page display rules (suspense without overwhelm): per ladder show every earned
 * rung + the current goal clearly, the rung right after it BLURRED (a teaser so
 * the owner knows another challenge exists), and hide everything beyond. One-time
 * badges show earned, or blurred when not yet earned.
 */
export function achievementsForDisplay(all: ResolvedAchievement[]): DisplayAchievement[] {
  const byMetric = new Map<string, ResolvedAchievement[]>();
  for (const a of all) {
    const arr = byMetric.get(a.metric) ?? [];
    arr.push(a);
    byMetric.set(a.metric, arr);
  }

  const out: DisplayAchievement[] = [];
  for (const rungs of byMetric.values()) {
    if (rungs[0]?.oneTime) {
      for (const r of rungs) out.push({ ...r, display: r.unlocked ? "earned" : "teaser" });
      continue;
    }
    const nextIdx = rungs.findIndex((r) => r.isNext);
    rungs.forEach((r, i) => {
      if (r.unlocked) out.push({ ...r, display: "earned" });
      else if (nextIdx === -1) {
        /* all unlocked — handled above */
      } else if (i === nextIdx) out.push({ ...r, display: "current" });
      else if (i === nextIdx + 1) out.push({ ...r, display: "teaser" });
      // rungs beyond the teaser are hidden
    });
  }
  return out;
}

type TFunc = (key: string, values?: Record<string, string | number>) => string;

/** Display title for an achievement, via i18n. Keys are relative to the
 *  "achievements" namespace, so callers pass `useTranslations("achievements")`. */
export function achievementTitle(t: TFunc, a: ResolvedAchievement): string {
  if (a.oneTime) return t(`firsts.${a.key}`);
  switch (a.metric) {
    case "total_customers":
      return t("ladders.customers", { count: a.threshold });
    case "total_stamps_given":
      return t("ladders.stamps", { count: a.threshold });
    case "stamps_last_30d":
      return t("ladders.stamps30d", { count: a.threshold });
    case "new_customers_last_30d":
      return t("ladders.customers30d", { count: a.threshold });
    case "repeat_customers":
      return t("ladders.repeatCustomers", { count: a.threshold });
    default:
      return "";
  }
}

/** "740 / 1,000" — the numeric progress under a rung. `fmt` localizes. */
export function achievementValueLabel(
  a: ResolvedAchievement,
  fmt: (n: number) => string
): string {
  return `${fmt(Math.min(a.current, a.threshold))} / ${fmt(a.threshold)}`;
}
