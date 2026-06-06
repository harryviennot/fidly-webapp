"use client";

import { useMemo } from "react";
import { StampIconSvg, type StampIconType } from "@/components/design/StampIconPicker";
import { computeCardColors } from "@/lib/card-utils";
import type { CardDesign } from "@/types";

interface StampProgressProps {
  count: number;
  total: number;
  design?: CardDesign;
  size?: "sm" | "md";
}

export function StampProgress({ count, total, design, size = "sm" }: StampProgressProps) {
  const colors = useMemo(
    () => (design ? computeCardColors(design) : null),
    [design]
  );

  const stampIcon = (design?.stamp_icon as StampIconType) ?? "checkmark";
  const rewardIcon = (design?.reward_icon as StampIconType) ?? "gift";

  if (size === "sm") {
    // Filled circles use the design accent; empty circles use a fixed neutral
    // (theme tokens) rather than the design's empty colors. A card design tuned
    // for a dark background can have white/near-white empty stamps that vanish
    // on the white table — the neutral guarantees legibility for every business.
    const renderCircle = (i: number) => (
      <div
        key={i}
        className="w-3 h-3 rounded-full transition-colors duration-300"
        style={
          i < count
            ? { backgroundColor: colors?.accentHex ?? "var(--accent)" }
            : { backgroundColor: "var(--muted)", border: "1px solid var(--border)" }
        }
      />
    );

    // At most two rows: a single row up to 12 dots, otherwise split evenly into
    // two. Never more, so a long program stays compact instead of growing a tall
    // stack of dots.
    const twoRows = total > 12;
    const topCount = twoRows ? Math.ceil(total / 2) : total;

    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-1">
            {Array.from({ length: topCount }, (_, i) => renderCircle(i))}
          </div>
          {twoRows && (
            <div className="flex items-center gap-1">
              {Array.from({ length: total - topCount }, (_, i) => renderCircle(topCount + i))}
            </div>
          )}
        </div>
        <span className="text-sm text-[var(--muted-foreground)] tabular-nums shrink-0">
          {count}/{total}
        </span>
      </div>
    );
  }

  // "md" size — larger circles with icons
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const filled = i < count;
        const isLast = i === total - 1;
        const icon = isLast ? rewardIcon : stampIcon;

        return (
          <div
            key={i}
            className="flex-1 aspect-square max-h-10 rounded-full flex items-center justify-center transition-colors duration-300"
            style={
              filled
                ? {
                  backgroundColor: colors?.accentHex ?? "var(--accent)",
                  boxShadow: colors
                    ? `0 0 6px ${colors.accentHex}40`
                    : undefined,
                }
                : {
                  backgroundColor: colors?.emptyStampBg ?? "var(--muted)",
                  border: colors
                    ? `1px solid ${colors.emptyStampBorder}`
                    : undefined,
                }
            }
          >
            {filled && (
              <StampIconSvg
                icon={icon}
                className="w-3/5 h-3/5"
                color={colors?.iconColorHex ?? "white"}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
