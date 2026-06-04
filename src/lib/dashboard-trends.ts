/**
 * Week-over-week trend helper for the dashboard KPI cards.
 * See web/docs/dashboard-achievements.md.
 */

export interface Trend {
  /** Formatted magnitude, e.g. "18%". Undefined when there is no baseline to compare. */
  change?: string;
  /** True = up vs previous period, false = down. Undefined when no change. */
  positive?: boolean;
}

/**
 * Week-over-week trend from a current value and its previous-period baseline.
 * Honest about missing baselines: with no prior data (prev === 0) we show no
 * arrow rather than a fake "+100%".
 */
export function wowTrend(current: number, prev: number): Trend {
  if (prev <= 0 || current === prev) return {};
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return {};
  return { change: `${Math.abs(pct)}%`, positive: pct > 0 };
}
