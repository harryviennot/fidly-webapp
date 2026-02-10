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
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => {
          const filled = i < count;
          return (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-colors duration-300"
              style={
                filled
                  ? { backgroundColor: colors?.accentHex ?? "var(--accent)" }
                  : {
                      backgroundColor: colors?.emptyStampBg ?? "var(--muted)",
                      border: colors
                        ? `1px solid ${colors.emptyStampBorder}`
                        : undefined,
                    }
              }
            />
          );
        })}
        <span className="ml-2 text-sm text-[var(--muted-foreground)] tabular-nums">
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
            className="h-8 flex-1 rounded-full flex items-center justify-center transition-colors duration-300"
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
                className="w-3.5 h-3.5"
                color={colors?.iconColorHex ?? "white"}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
