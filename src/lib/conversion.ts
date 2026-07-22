/**
 * Client-side mirror of the backend conversion math
 * (backend/app/services/programs/conversion.py) for the conversion wizard's
 * INSTANT previews, plus the parser for `balance_migrated` transaction
 * metadata rendered in the customer timeline.
 *
 * The authoritative impact numbers come from POST /programs/.../convert/preview
 * — this lib only powers per-keystroke feedback (the sample row under the rate
 * input) and display formatting, and its tests pin the same fixtures as the
 * backend suite so the two implementations can never silently disagree.
 */

export type StampsToPointsPolicy =
  | "cheapest_reward_equivalent"
  | "full_card_equivalent"
  | "discard";
export type PointsToStampsPolicy = "bank_full_cards" | "bank_one" | "cap_card";
export type ConversionPolicy = StampsToPointsPolicy | PointsToStampsPolicy;

export const STAMPS_TO_POINTS_POLICIES: StampsToPointsPolicy[] = [
  "cheapest_reward_equivalent",
  "full_card_equivalent",
  "discard",
];
export const POINTS_TO_STAMPS_POLICIES: PointsToStampsPolicy[] = [
  "bank_full_cards",
  "bank_one",
  "cap_card",
];

export interface StampsToPointsOpts {
  /** Cheapest reward threshold in the NEW points menu (null = unpriced). */
  cheapestThreshold: number | null;
  /** Card size of the OLD stamp program. */
  totalStamps: number;
  maxBalance?: number | null;
}

export function convertStampsToPoints(
  stamps: number,
  banked: number,
  rate: number,
  policy: StampsToPointsPolicy,
  opts: StampsToPointsOpts,
): { points: number; grant: number; clamped: boolean; discardedRewards: number } {
  const base = Math.floor(stamps * rate);
  let grant = 0;
  let discardedRewards = 0;
  if (banked > 0) {
    if (policy === "cheapest_reward_equivalent") {
      grant = banked * (opts.cheapestThreshold ?? 0);
    } else if (policy === "full_card_equivalent") {
      grant = banked * Math.floor(opts.totalStamps * rate);
    } else {
      discardedRewards = banked;
    }
  }
  let points = base + grant;
  let clamped = false;
  if (opts.maxBalance != null && points > opts.maxBalance) {
    points = opts.maxBalance;
    clamped = true;
  }
  return { points, grant, clamped, discardedRewards };
}

export interface PointsToStampsOpts {
  /** Card size of the NEW stamp program. */
  totalStamps: number;
  maxStack?: number | null;
}

export function convertPointsToStamps(
  points: number,
  rate: number,
  policy: PointsToStampsPolicy,
  opts: PointsToStampsOpts,
): { stamps: number; banked: number; discarded: number } {
  const total = opts.totalStamps;
  const equivalent = Math.floor(points / rate);
  let banked = 0;
  let stamps = 0;
  let discarded = 0;
  if (policy === "bank_full_cards") {
    banked = Math.floor(equivalent / total);
    stamps = equivalent % total;
    if (opts.maxStack != null && banked > opts.maxStack) {
      // Cap truncation keeps a full blocked card (migration-105 shape).
      banked = opts.maxStack;
      stamps = total;
      discarded = equivalent - banked * total - total;
    }
  } else if (policy === "bank_one") {
    banked = equivalent >= total ? 1 : 0;
    const remainder = equivalent - banked * total;
    stamps = Math.min(remainder, total);
    discarded = remainder - stamps;
  } else {
    stamps = Math.min(equivalent, total);
    discarded = equivalent - stamps;
  }
  return { stamps, banked, discarded };
}

/** Default rate offered in the wizard: one full stamp card ~= the cheapest
 * priced reward (points per stamp, 2 decimals). Mirrors the backend. */
export function suggestedRate(
  cheapestThreshold: number | null,
  totalStamps: number,
): number {
  if (!cheapestThreshold || !totalStamps) return 10;
  return Math.round((cheapestThreshold / totalStamps) * 100) / 100;
}

/** Parsed view of a `balance_migrated` transaction's metadata. The row's
 * value columns are in DIFFERENT units (before = old type, after = new type),
 * so renderers must read this — never `delta`/`program_type`. */
export interface MigrationSummary {
  valueBefore: number;
  unitBefore: "stamp" | "point";
  valueAfter: number;
  unitAfter: "stamp" | "point";
  /** stamps->points: banked rewards honored as a points grant. */
  bankedHonored: number;
  /** points->stamps: full cards landed in the rewards bank. */
  bankedCards: number;
  /** Value dropped by the owner-chosen policy (rewards or stamps-worth). */
  discarded: number;
  /** The enrollment converted through the mid-flight retry merge path. */
  merged: boolean;
}

export function describeMigration(
  metadata: Record<string, unknown> | null | undefined,
): MigrationSummary | null {
  if (!metadata) return null;
  const unitBefore = metadata.unit_before;
  const unitAfter = metadata.unit_after;
  if (
    (unitBefore !== "stamp" && unitBefore !== "point") ||
    (unitAfter !== "stamp" && unitAfter !== "point")
  ) {
    return null;
  }
  return {
    valueBefore: Number(metadata.value_before ?? 0),
    unitBefore,
    valueAfter: Number(metadata.value_after ?? 0),
    unitAfter,
    bankedHonored: Number(metadata.banked_rewards_honored ?? 0),
    bankedCards: Number(metadata.banked_cards ?? 0),
    discarded: Number(
      metadata.discarded_rewards ?? metadata.discarded_stamps ?? 0,
    ),
    merged: metadata.merged_post_flip === true,
  };
}
