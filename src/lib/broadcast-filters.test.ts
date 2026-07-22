/**
 * Tests for the broadcast target_filter helpers (points launch, scans rename).
 *
 * `normalizeTargetFilter` folds the legacy stamp_count_min/max keys stored on
 * pre-rename broadcast rows into the canonical value_min/max, and
 * `describeFilter` renders the same chips for the list row, detail sheet and
 * wizard review — with points wording when the program is a points program.
 */
import { describe, expect, test } from "bun:test";
import { describeFilter, normalizeTargetFilter } from "./broadcast-filters";

/** Fake translator: returns the key plus any interpolated values, so
 *  assertions can check both which key was picked and what was passed. */
const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

describe("normalizeTargetFilter", () => {
  test("folds legacy stamp_count keys into value keys", () => {
    expect(normalizeTargetFilter({ stamp_count_min: 3, stamp_count_max: 7 })).toEqual({
      value_min: 3,
      value_max: 7,
    });
  });

  test("canonical keys win when both spellings are present", () => {
    expect(
      normalizeTargetFilter({ value_min: 100, stamp_count_min: 3, stamp_count_max: 99 })
    ).toEqual({ value_min: 100, value_max: 99 });
  });

  test("passes unrelated keys through and handles null", () => {
    expect(normalizeTargetFilter({ all: true, inactive_days: 30 })).toEqual({
      all: true,
      inactive_days: 30,
      value_min: undefined,
      value_max: undefined,
    });
    expect(normalizeTargetFilter(null)).toEqual({});
    expect(normalizeTargetFilter(undefined)).toEqual({});
  });
});

describe("describeFilter", () => {
  test("empty / all filters collapse to the everyone chip", () => {
    expect(describeFilter(null, t)).toEqual([{ key: "all", label: "audience.all" }]);
    expect(describeFilter({}, t)).toEqual([{ key: "all", label: "audience.all" }]);
    expect(describeFilter({ all: true }, t)).toEqual([{ key: "all", label: "audience.all" }]);
  });

  test("stamp program renders stamp range chips", () => {
    const chips = describeFilter({ value_min: 3, value_max: 7 }, t);
    expect(chips.map((c) => c.label)).toEqual([
      'audience.chip.stamp_count_min:{"n":3}',
      'audience.chip.stamp_count_max:{"n":7}',
    ]);
  });

  test("points program renders pts chips for the same keys", () => {
    const chips = describeFilter({ value_min: 100, value_max: 200 }, t, { points: true });
    expect(chips.map((c) => c.label)).toEqual([
      'audience.chip.points_min:{"n":100}',
      'audience.chip.points_max:{"n":200}',
    ]);
  });

  test("legacy stored rows produce the same chips as canonical ones", () => {
    const legacy = describeFilter({ stamp_count_min: 5 }, t, { points: true });
    const canonical = describeFilter({ value_min: 5 }, t, { points: true });
    expect(legacy).toEqual(canonical);
  });

  test("chip order is deterministic across all filter kinds", () => {
    const chips = describeFilter(
      {
        enrolled_after_days: 14,
        value_min: 2,
        has_redeemed: true,
        inactive_days: 30,
      },
      t
    );
    expect(chips.map((c) => c.key)).toEqual([
      "enrolled_after_days",
      "value_min",
      "has_redeemed",
      "inactive_days",
    ]);
  });
});
