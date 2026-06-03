"use client";

import { useId } from "react";
import type { AchievementCategory } from "@/lib/achievements";

/**
 * Glossy "enamel" SVG achievement badge. One silhouette + color per category,
 * the tier number set large in the center, a gold rim + sparkles on the final
 * rung of a ladder. Three states: earned (full color + lift shadow), progress
 * and locked (matte grey; locked swaps the number for a padlock).
 *
 * Geometry, gradients, shine, lift shadow and gold-rim markup are reused from
 * the design reference (acheivements-page-example.html). The silhouette +
 * edge-color helpers below let <AchievementCoin> extrude the same shape into a
 * 3D coin for the hover flip.
 */

export type BadgeState = "earned" | "progress" | "locked";

// Category silhouettes (viewBox 0 0 120 120). Circle has no path (rendered as
// two concentric circles); the rest are an outer shell + a 0.9-scaled inner face.
const HEXAGON =
  "M49.61 14.00 Q60.00 8.00 70.39 14.00 L94.64 28.00 Q105.03 34.00 105.03 46.00 L105.03 74.00 Q105.03 86.00 94.64 92.00 L70.39 106.00 Q60.00 112.00 49.61 106.00 L25.36 92.00 Q14.97 86.00 14.97 74.00 L14.97 46.00 Q14.97 34.00 25.36 28.00 Z";
const SHIELD =
  "M22 18 Q22 14 26 14 L94 14 Q98 14 98 18 L98 60 Q98 86 62 104 Q60 105 58 104 Q22 86 22 60 Z";
const OCTAGON =
  "M108.04 70.90 Q108.04 79.90 101.68 86.26 L86.26 101.68 Q79.90 108.04 70.90 108.04 L49.10 108.04 Q40.10 108.04 33.74 101.68 L18.32 86.26 Q11.96 79.90 11.96 70.90 L11.96 49.10 Q11.96 40.10 18.32 33.74 L33.74 18.32 Q40.10 11.96 49.10 11.96 L70.90 11.96 Q79.90 11.96 86.26 18.32 L101.68 33.74 Q108.04 40.10 108.04 49.10 Z";
const STAR =
  "M57.60 9.50 Q60.00 4.00 62.40 9.50 L72.88 33.47 Q75.28 38.97 81.25 39.55 L107.29 42.11 Q113.26 42.70 108.77 46.68 L89.21 64.05 Q84.73 68.03 86.01 73.89 L91.63 99.44 Q92.92 105.30 87.74 102.27 L65.18 89.04 Q60.00 86.00 54.82 89.04 L32.26 102.27 Q27.08 105.30 28.37 99.44 L33.99 73.89 Q35.27 68.03 30.79 64.05 L11.23 46.68 Q6.74 42.70 12.71 42.11 L38.75 39.55 Q44.72 38.97 47.12 33.47 Z";

interface CategoryStyle {
  /** Outer shell path; undefined → circle silhouette. */
  path?: string;
  /** Base accent (drives card tint + progress bar). */
  base: string;
  /** Enamel face gradient (top → bottom) when earned. */
  from: string;
  to: string;
  /** Darker shell behind the face when earned. */
  back: string;
  /** Widest the number may render (viewBox units) before it's squeezed to fit. */
  maxText: number;
}

const STYLES: Record<AchievementCategory, CategoryStyle> = {
  growth: { base: "#16A2B8", from: "#16A2B8", to: "#0C7A8C", back: "#0A5A68", maxText: 84 },
  engagement: { path: HEXAGON, base: "#F97316", from: "#F9852A", to: "#D9650F", back: "#A44C09", maxText: 82 },
  momentum: { path: SHIELD, base: "#6C54D6", from: "#7C63E4", to: "#5B43C9", back: "#4631A0", maxText: 66 },
  loyalty: { path: OCTAGON, base: "#E0568A", from: "#E0568A", to: "#BB3A6B", back: "#8C2A50", maxText: 80 },
  firsts: { path: STAR, base: "#F2A93B", from: "#F7C75A", to: "#E0991F", back: "#9C5C08", maxText: 60 },
};

/** Matte palette shared by progress + locked badges. */
const MATTE = { back: "#8E897C", from: "#C7C2B6", to: "#ABA597", num: "#F3F1EB" } as const;

/** Gold treatment for a ladder's final rung. */
const GOLD = { light: "#F4D38A", dark: "#8A5207" } as const;

/** Per-category base accent, for callers tinting cards/bars. */
export const BADGE_CATEGORY_COLOR = Object.fromEntries(
  (Object.entries(STYLES) as [AchievementCategory, CategoryStyle][]).map(([k, v]) => [k, v.base])
) as Record<AchievementCategory, string>;

/** Outer silhouette path for a category (undefined → circle). */
export function badgeShapePath(category: AchievementCategory): string | undefined {
  return STYLES[category].path;
}

/** Top→bottom edge gradient for the 3D coin rim. */
export function badgeEdgeColors(
  category: AchievementCategory,
  isFinalTier: boolean
): { light: string; dark: string } {
  if (isFinalTier) return GOLD;
  const s = STYLES[category];
  return { light: s.to, dark: s.back };
}

/** "1K" / "1.5K" / "2.5K" above 999, plain below. Badge-internal display only. */
export function formatBadgeNumber(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, "")}K`;
}

/** Shrink the font so 3–4 char labels still fit the face. */
function numberFontSize(label: string): number {
  const len = label.length;
  if (len <= 2) return 50;
  if (len === 3) return 44;
  if (len === 4) return 36;
  return 30;
}

/**
 * A single opaque silhouette layer in the category's edge gradient. Stacked
 * along Z by <AchievementCoin> to extrude a believable coin thickness — so the
 * flip never reveals a paper-thin nothing at 90°.
 */
export function BadgeSilhouette({
  category,
  isFinalTier = false,
  size = 84,
  className,
}: {
  category: AchievementCategory;
  isFinalTier?: boolean;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const path = STYLES[category].path;
  const { light, dark } = badgeEdgeColors(category, isFinalTier);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`edge_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      {path ? (
        <path d={path} fill={`url(#edge_${uid})`} />
      ) : (
        <circle cx="60" cy="60" r="52" fill={`url(#edge_${uid})`} />
      )}
    </svg>
  );
}

export function AchievementBadge({
  category,
  value,
  state,
  isFinalTier = false,
  oneTime = false,
  size = 96,
  /** Render the soft lift drop-shadow (suppressed when stacked into a coin). */
  lift = true,
  className,
}: {
  category: AchievementCategory;
  /** Tier threshold shown in the center. Omit for one-time (star) badges. */
  value?: number;
  state: BadgeState;
  /** Final rung of a ladder → gold rim + sparkles. */
  isFinalTier?: boolean;
  /** One-time "firsts" badge → no number even when earned. */
  oneTime?: boolean;
  size?: number;
  lift?: boolean;
  className?: string;
}) {
  // useId() can contain ":" which is awkward inside url(#…) refs — strip it.
  const uid = useId().replace(/:/g, "");
  const s = STYLES[category];
  const earned = state === "earned";
  const isCircle = !s.path;

  const faceFrom = earned ? s.from : MATTE.from;
  const faceTo = earned ? s.to : MATTE.to;
  const shellFill = earned ? (isFinalTier ? `url(#rim_${uid})` : s.back) : MATTE.back;
  const numShadow = earned ? s.back : MATTE.back;
  const numFill = earned ? "#FFFFFF" : MATTE.num;

  const label = value != null && !oneTime ? formatBadgeNumber(value) : null;
  const showNumber = state !== "locked" && label !== null;
  const showPadlock = state === "locked";
  const fontSize = label ? numberFontSize(label) : 50;

  // Squeeze the glyphs only when they'd otherwise overflow the silhouette.
  const approxWidth = label ? label.length * fontSize * 0.6 : 0;
  const textLength = label && approxWidth > s.maxText ? s.maxText : undefined;
  const lengthAdjust = textLength ? "spacingAndGlyphs" : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${category} ${label ?? ""} ${state}`.trim()}
    >
      <defs>
        <linearGradient id={`face_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={faceFrom} />
          <stop offset="1" stopColor={faceTo} />
        </linearGradient>
        <linearGradient id={`shine_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {isFinalTier && earned && (
          <linearGradient id={`rim_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE49B" />
            <stop offset="0.5" stopColor="#E9A93C" />
            <stop offset="1" stopColor="#9C5C08" />
          </linearGradient>
        )}
        {isCircle ? (
          <clipPath id={`clip_${uid}`}>
            <circle cx="60" cy="60" r="52" />
          </clipPath>
        ) : (
          <clipPath id={`clip_${uid}`}>
            <path d={s.path} />
          </clipPath>
        )}
        <filter id={`lift_${uid}`} x="-40%" y="-40%" width="180%" height="195%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#13212B" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter={earned && lift ? `url(#lift_${uid})` : undefined}>
        {isCircle ? (
          <>
            <circle cx="60" cy="60" r="52" fill={shellFill} />
            <circle cx="60" cy="60" r="46.8" fill={`url(#face_${uid})`} />
          </>
        ) : (
          <>
            <path d={s.path} fill={shellFill} />
            <path
              d={s.path}
              fill={`url(#face_${uid})`}
              transform="translate(60 60) scale(0.9) translate(-60 -60)"
            />
          </>
        )}

        <g clipPath={`url(#clip_${uid})`}>
          <rect x="0" y="0" width="120" height="120" fill={`url(#shine_${uid})`} />
        </g>

        {isFinalTier && earned && (
          <>
            <path
              d="M95 20.4 Q95.736 24.264 99.6 25 Q95.736 25.736 95 29.6 Q94.264 25.736 90.4 25 Q94.264 24.264 95 20.4 Z"
              fill="#FFE7A8"
            />
            <path
              d="M101 35.4 Q101.416 37.584 103.6 38 Q101.416 38.416 101 40.6 Q100.584 38.416 98.4 38 Q100.584 37.584 101 35.4 Z"
              fill="#FFE7A8"
            />
          </>
        )}

        {showNumber && (
          <>
            <text
              x="60"
              y="61.5"
              textAnchor="middle"
              dominantBaseline="central"
              textLength={textLength}
              lengthAdjust={lengthAdjust}
              fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              fontWeight="800"
              fontSize={fontSize}
              fill={numShadow}
              fillOpacity="0.35"
            >
              {label}
            </text>
            <text
              x="60"
              y="60"
              textAnchor="middle"
              dominantBaseline="central"
              textLength={textLength}
              lengthAdjust={lengthAdjust}
              fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              fontWeight="800"
              fontSize={fontSize}
              fill={numFill}
            >
              {label}
            </text>
          </>
        )}

        {showPadlock && (
          <g
            transform="translate(44 40)"
            fill="none"
            stroke="#8E897C"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="15" width="26" height="19" rx="3.6" />
            <path d="M8 15v-4a8 8 0 0 1 16 0v4" />
          </g>
        )}
      </g>
    </svg>
  );
}
