import type { StampIconMode } from "@/types/design";

/** The three boxes of the stamp strip-style picker (StampsForm). */
export type StampStripBox = "preset" | "custom" | "image_only";

/**
 * The picker box to show for a saved mode. A saved 'preset' can still mean a
 * half-configured custom panel (custom only persists once icons exist), so
 * the form keeps local box state — this only derives the INITIAL box.
 */
export function boxFromMode(mode: StampIconMode | undefined): StampStripBox {
  if (mode === "custom" || mode === "image_only") return mode;
  return "preset";
}

/**
 * The mode to PERSIST when a box is selected: the custom box saves 'preset'
 * until at least one icon is uploaded, so a half-configured custom panel
 * keeps the design rendering presets. image_only persists immediately (the
 * strip falls back to the solid canvas color until an image is uploaded,
 * mirroring the points image_only style).
 */
export function modeForBox(box: StampStripBox, hasCustomIcons: boolean): StampIconMode {
  if (box === "custom") return hasCustomIcons ? "custom" : "preset";
  return box;
}

/**
 * Preview opacity for the strip background image: image_only shows the raw
 * image edge-to-edge at full opacity; other modes dim it to the stored
 * percentage (backend default 40). Mirrors build_strip_config_from_design.
 */
export function stampStripImageOpacity(design: {
  stamp_icon_mode?: StampIconMode;
  strip_background_opacity?: number;
}): number {
  if (design.stamp_icon_mode === "image_only") return 1;
  return (design.strip_background_opacity ?? 40) / 100;
}
