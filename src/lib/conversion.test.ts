import { describe, expect, test } from "bun:test";
import {
  convertPointsToStamps,
  convertStampsToPoints,
  describeMigration,
  suggestedRate,
} from "./conversion";

// These fixtures mirror backend tests/test_program_conversion.py — the wizard's
// instant previews must agree with the numbers the commit actually applies.

describe("convertStampsToPoints", () => {
  const opts = { cheapestThreshold: 100, totalStamps: 10, maxBalance: null };

  test("plain balance at the rate, floored", () => {
    expect(convertStampsToPoints(7, 0, 20, "cheapest_reward_equivalent", opts))
      .toEqual({ points: 140, grant: 0, clamped: false, discardedRewards: 0 });
    expect(convertStampsToPoints(7, 0, 12.5, "cheapest_reward_equivalent", opts).points)
      .toBe(87); // floor(87.5)
  });

  test("cheapest_reward_equivalent grants the cheapest reward per banked", () => {
    const r = convertStampsToPoints(7, 2, 20, "cheapest_reward_equivalent", opts);
    expect(r.points).toBe(340);
    expect(r.grant).toBe(200);
  });

  test("full_card_equivalent grants a full card per banked, floored per card", () => {
    expect(convertStampsToPoints(7, 2, 20, "full_card_equivalent", opts).points).toBe(540);
    expect(convertStampsToPoints(0, 2, 12.5, "full_card_equivalent", opts).points).toBe(250);
  });

  test("discard drops banked rewards and discloses", () => {
    const r = convertStampsToPoints(7, 2, 20, "discard", opts);
    expect(r.points).toBe(140);
    expect(r.grant).toBe(0);
    expect(r.discardedRewards).toBe(2);
  });

  test("max_balance clamps and flags", () => {
    const r = convertStampsToPoints(50, 0, 20, "cheapest_reward_equivalent",
      { ...opts, maxBalance: 500 });
    expect(r.points).toBe(500);
    expect(r.clamped).toBe(true);
  });
});

describe("convertPointsToStamps", () => {
  const opts = { totalStamps: 10, maxStack: null };

  test("bank_full_cards banks whole cards + remainder", () => {
    expect(convertPointsToStamps(1200, 20, "bank_full_cards", opts))
      .toEqual({ stamps: 0, banked: 6, discarded: 0 });
    expect(convertPointsToStamps(1230, 20, "bank_full_cards", opts))
      .toEqual({ stamps: 1, banked: 6, discarded: 0 }); // floor(61.5) = 61
    expect(convertPointsToStamps(130, 20, "bank_full_cards", opts))
      .toEqual({ stamps: 6, banked: 0, discarded: 0 });
  });

  test("bank_full_cards respects max_stack (full blocked card on truncation)", () => {
    const r = convertPointsToStamps(540, 20, "bank_full_cards",
      { totalStamps: 10, maxStack: 1 });
    expect(r).toEqual({ stamps: 10, banked: 1, discarded: 7 });
  });

  test("bank_one caps at one banked + a full card of leftover", () => {
    expect(convertPointsToStamps(540, 20, "bank_one", opts))
      .toEqual({ stamps: 10, banked: 1, discarded: 7 });
    expect(convertPointsToStamps(260, 20, "bank_one", opts))
      .toEqual({ stamps: 3, banked: 1, discarded: 0 });
    expect(convertPointsToStamps(140, 20, "bank_one", opts))
      .toEqual({ stamps: 7, banked: 0, discarded: 0 });
  });

  test("cap_card clamps at the card size", () => {
    expect(convertPointsToStamps(1200, 20, "cap_card", opts))
      .toEqual({ stamps: 10, banked: 0, discarded: 50 });
  });
});

describe("suggestedRate", () => {
  test("one full card ~= the cheapest reward", () => {
    expect(suggestedRate(100, 10)).toBe(10);
    expect(suggestedRate(100, 12)).toBe(8.33);
  });
  test("falls back when unpriceable", () => {
    expect(suggestedRate(null, 10)).toBe(10);
    expect(suggestedRate(100, 0)).toBe(10);
  });
});

describe("describeMigration", () => {
  test("parses the balance_migrated wire metadata (09-conversion.md §7)", () => {
    const summary = describeMigration({
      from_type: "stamp", to_type: "points",
      value_before: 7, unit_before: "stamp",
      value_after: 340, unit_after: "point",
      rate: 20, policy: "cheapest_reward_equivalent",
      banked_rewards_honored: 2, grant_points: 200,
    });
    expect(summary).toEqual({
      valueBefore: 7, unitBefore: "stamp",
      valueAfter: 340, unitAfter: "point",
      bankedHonored: 2, bankedCards: 0, discarded: 0, merged: false,
    });
  });

  test("reverse direction with banked cards + discard disclosure", () => {
    const summary = describeMigration({
      from_type: "points", to_type: "stamp",
      value_before: 1200, unit_before: "point",
      value_after: 0, unit_after: "stamp",
      rate: 20, policy: "bank_full_cards",
      banked_cards: 6, discarded_stamps: 3, merged_post_flip: true,
    });
    expect(summary).toEqual({
      valueBefore: 1200, unitBefore: "point",
      valueAfter: 0, unitAfter: "stamp",
      bankedHonored: 0, bankedCards: 6, discarded: 3, merged: true,
    });
  });

  test("null / malformed metadata returns null", () => {
    expect(describeMigration(null)).toBeNull();
    expect(describeMigration({})).toBeNull();
  });
});
