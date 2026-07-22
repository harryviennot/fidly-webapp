/**
 * The canvas 2D context defaults to `imageSmoothingQuality: 'low'`, which
 * downscales a large logo upload to the crop's output size with a cheap filter
 * — visibly softer/aliased than necessary. Both crop paths (the interactive
 * cropper and the non-interactive `cropToAspect`) route their context through
 * `applyHighQualitySmoothing` so the downscale uses the high-quality filter.
 *
 * The rest of image-crop.ts is canvas/DOM-bound (document, Image, toBlob) and
 * not unit-testable under bun:test, so this pins the one piece of pure logic.
 */
import { describe, expect, test } from "bun:test";
import { applyHighQualitySmoothing } from "./image-crop";

describe("applyHighQualitySmoothing", () => {
  test("enables smoothing at high quality", () => {
    const ctx = {} as CanvasRenderingContext2D;
    applyHighQualitySmoothing(ctx);
    expect(ctx.imageSmoothingEnabled).toBe(true);
    expect(ctx.imageSmoothingQuality).toBe("high");
  });

  test("overrides a context left at the browser default 'low'", () => {
    const ctx = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    } as CanvasRenderingContext2D;
    applyHighQualitySmoothing(ctx);
    expect(ctx.imageSmoothingEnabled).toBe(true);
    expect(ctx.imageSmoothingQuality).toBe("high");
  });
});
