"use client";

import type { CSSProperties } from "react";
import type { AchievementCategory } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { AchievementBadge, BadgeSilhouette } from "./achievement-badge";

/**
 * An earned badge given real coin thickness: a front face, a matching back
 * face, and a stack of silhouette layers extruded along Z to form a metallic
 * edge. Inside a `group`, hovering flips it a full vertical turn (see the
 * `.ach-coin*` rules in globals.css) — so mid-flip you see the edge and the
 * back, never a paper-thin nothing. Use for earned trophies only.
 */

// Layers forming the rim. More = a more solid edge at the 90° mid-flip; kept
// modest since a mature page can show dozens of earned coins at once.
const EDGE_LAYERS = 12;
/** Coin thickness, in the face's own px (size). Scaled with `size`. */
const DEPTH_RATIO = 13 / 84;

export function AchievementCoin({
  category,
  value,
  isFinalTier = false,
  oneTime = false,
  size = 84,
  className,
}: {
  category: AchievementCategory;
  value?: number;
  isFinalTier?: boolean;
  oneTime?: boolean;
  size?: number;
  className?: string;
}) {
  const depth = size * DEPTH_RATIO;
  const half = depth / 2;
  const layers = Array.from(
    { length: EDGE_LAYERS },
    (_, i) => -half + (depth * i) / (EDGE_LAYERS - 1)
  );

  const face = (
    <AchievementBadge
      category={category}
      value={value}
      state="earned"
      isFinalTier={isFinalTier}
      oneTime={oneTime}
      size={size}
      lift={false}
    />
  );

  return (
    <div className={cn("ach-coin-scene", className)} style={{ width: size, height: size }}>
      <div className="ach-coin">
        {/* Rim — opaque silhouette slabs stacked through the depth. */}
        {layers.map((z, i) => (
          <div
            key={i}
            className="ach-coin-layer"
            style={{ transform: `translateZ(${z}px)` } as CSSProperties}
          >
            <BadgeSilhouette category={category} isFinalTier={isFinalTier} size={size} />
          </div>
        ))}
        {/* Front face. */}
        <div className="ach-coin-face" style={{ transform: `translateZ(${half}px)` }}>
          {face}
        </div>
        {/* Back face — same trophy, so the flip's far side is never blank. */}
        <div
          className="ach-coin-face"
          style={{ transform: `rotateX(180deg) translateZ(${half}px)` }}
        >
          {face}
        </div>
      </div>
    </div>
  );
}
