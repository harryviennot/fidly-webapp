import type { PassField, RewardTier } from "@/types";

/**
 * The program-specific back-of-card fields a points card always carries: the
 * reward menu (one "Name — N pts" line per reward) plus the optional points
 * cap. Mirrors the backend's `_points_reward_backfields` (pass_generator.py) so
 * the editor preview matches the real pass. These are injected for preview /
 * display only — they're generated from the live program, never stored on the
 * design, and the merchant can't edit or remove them.
 */
export function buildPointsRewardBackFields(
  rewards: RewardTier[],
  maxBalance: number | null | undefined,
  labels: { menu: string; max: string; unit: string }
): PassField[] {
  const sorted = [...rewards].sort((a, b) => a.threshold - b.threshold);
  if (sorted.length === 0) return [];
  const value = sorted
    .map((r) => `${r.name || "Reward"} — ${r.threshold} ${labels.unit}`)
    .join("\n");
  const fields: PassField[] = [
    { key: "points_reward_menu", label: labels.menu, value },
  ];
  if (maxBalance) {
    fields.push({
      key: "points_max",
      label: labels.max,
      value: `${maxBalance} ${labels.unit}`,
    });
  }
  return fields;
}
