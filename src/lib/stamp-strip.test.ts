import { describe, expect, test } from "bun:test";

import {
  boxFromMode,
  modeForBox,
  stampStripImageOpacity,
} from "./stamp-strip";

describe("boxFromMode", () => {
  test("maps each saved mode to its picker box", () => {
    expect(boxFromMode("preset")).toBe("preset");
    expect(boxFromMode("custom")).toBe("custom");
    expect(boxFromMode("image_only")).toBe("image_only");
  });

  test("defaults to preset when unset", () => {
    expect(boxFromMode(undefined)).toBe("preset");
  });
});

describe("modeForBox", () => {
  test("custom box persists 'preset' until at least one icon is uploaded", () => {
    // A half-configured custom panel must keep the design rendering presets.
    expect(modeForBox("custom", false)).toBe("preset");
    expect(modeForBox("custom", true)).toBe("custom");
  });

  test("image_only persists immediately, with or without icons", () => {
    expect(modeForBox("image_only", false)).toBe("image_only");
    expect(modeForBox("image_only", true)).toBe("image_only");
  });

  test("preset always persists preset", () => {
    expect(modeForBox("preset", true)).toBe("preset");
    expect(modeForBox("preset", false)).toBe("preset");
  });
});

describe("stampStripImageOpacity", () => {
  test("image_only shows the image at full opacity, whatever is stored", () => {
    expect(
      stampStripImageOpacity({ stamp_icon_mode: "image_only", strip_background_opacity: 40 })
    ).toBe(1);
    expect(stampStripImageOpacity({ stamp_icon_mode: "image_only" })).toBe(1);
  });

  test("other modes use the stored percentage", () => {
    expect(
      stampStripImageOpacity({ stamp_icon_mode: "preset", strip_background_opacity: 55 })
    ).toBe(0.55);
    expect(
      stampStripImageOpacity({ stamp_icon_mode: "custom", strip_background_opacity: 0 })
    ).toBe(0);
  });

  test("defaults to 40% when no opacity is stored", () => {
    expect(stampStripImageOpacity({ stamp_icon_mode: "preset" })).toBe(0.4);
    expect(stampStripImageOpacity({})).toBe(0.4);
  });
});
