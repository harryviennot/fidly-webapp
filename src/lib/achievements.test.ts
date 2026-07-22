/**
 * Tests for the achievements resolver (points launch, scans rename).
 *
 * The metrics are scan counts for BOTH program types (a scan = stamp_added or
 * points_earned; migrations 125/132), so the same trophies resolve for stamp
 * and points businesses. The critical regression here is the ledger-key
 * normalization: rows recorded before the rename ("total_stamps_given_10")
 * must keep their stickiness, unlock dates and acknowledged state — momentum
 * trophies would otherwise re-lock as the 30-day window moves, and already
 * celebrated trophies would re-celebrate.
 */
import { describe, expect, test } from "bun:test";
import {
  computeAchievements,
  metricValuesFromData,
  type AchievementMetricValues,
} from "./achievements";

const ZERO: AchievementMetricValues = {
  total_customers: 0,
  total_scans: 0,
  scans_last_30d: 0,
  new_customers_last_30d: 0,
  repeat_customers: 0,
  first_reward: false,
  first_broadcast: false,
  owner_used_native_app: false,
  all_employees_use_native_app: false,
  printed_flyer: false,
};

describe("computeAchievements", () => {
  test("unlocked keys use the scan-named metrics", () => {
    const { unlockedKeys } = computeAchievements({ ...ZERO, total_scans: 12, scans_last_30d: 10 });
    expect(unlockedKeys).toContain("total_scans_10");
    expect(unlockedKeys).toContain("scans_last_30d_10");
    expect(unlockedKeys.some((k) => k.includes("stamps"))).toBe(false);
  });

  test("legacy ledger keys keep momentum trophies sticky", () => {
    // 30-day window has dropped below the rung, but the ledger recorded the
    // unlock under the pre-rename key: the trophy must stay unlocked.
    const { all } = computeAchievements({ ...ZERO, scans_last_30d: 3 }, [
      { key: "stamps_last_30d_10", unlocked_at: "2026-06-01T00:00:00Z", acknowledged_at: "2026-06-02T00:00:00Z" },
    ]);
    const rung = all.find((a) => a.key === "scans_last_30d_10");
    expect(rung?.unlocked).toBe(true);
    expect(rung?.unlockedAt).toBe("2026-06-01T00:00:00Z");
    expect(rung?.acknowledgedAt).toBe("2026-06-02T00:00:00Z");
  });

  test("legacy lifetime keys carry their celebration state", () => {
    // Without normalization this rung would look freshly earned
    // (acknowledgedAt null) and the celebration overlay would replay.
    const { all } = computeAchievements({ ...ZERO, total_scans: 15 }, [
      { key: "total_stamps_given_10", unlocked_at: "2026-05-01T00:00:00Z", acknowledged_at: "2026-05-02T00:00:00Z" },
    ]);
    const rung = all.find((a) => a.key === "total_scans_10");
    expect(rung?.acknowledgedAt).toBe("2026-05-02T00:00:00Z");
  });

  test("new-style ledger keys pass through untouched", () => {
    const { all } = computeAchievements({ ...ZERO, scans_last_30d: 0 }, [
      { key: "scans_last_30d_25", unlocked_at: "2026-06-10T00:00:00Z", acknowledged_at: null },
    ]);
    const rung = all.find((a) => a.key === "scans_last_30d_25");
    expect(rung?.unlocked).toBe(true);
    expect(rung?.acknowledgedAt).toBeNull();
  });

  test("isNext marks the lowest unmet rung per ladder", () => {
    const { all } = computeAchievements({ ...ZERO, total_scans: 12 });
    const next = all.filter((a) => a.isNext && a.metric === "total_scans");
    expect(next).toHaveLength(1);
    expect(next[0].threshold).toBe(20);
  });
});

describe("metricValuesFromData", () => {
  test("maps the renamed RPC fields onto the resolver input", () => {
    const values = metricValuesFromData(
      {
        total_customers: 219,
        total_scans: 7593,
        scans_last_30d: 83,
        new_customers_last_30d: 15,
        repeat_customers: 153,
        total_rewards_redeemed: 300,
        owner_used_native_app: true,
        all_employees_use_native_app: false,
      },
      true
    );
    expect(values.total_scans).toBe(7593);
    expect(values.scans_last_30d).toBe(83);
    expect(values.first_reward).toBe(true);
    expect(values.first_broadcast).toBe(true);
    // Ledger-driven only — never derived from the RPC.
    expect(values.printed_flyer).toBe(false);
  });
});
