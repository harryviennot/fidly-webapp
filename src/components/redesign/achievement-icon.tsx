"use client";

import {
  Users,
  Stamp,
  Repeat,
  ArrowsClockwise,
  Gift,
  Megaphone,
  Trophy,
} from "@phosphor-icons/react";

type IconWeight = "regular" | "bold" | "fill";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; weight?: IconWeight }>
> = {
  Users,
  Stamp,
  Repeat,
  ArrowsClockwise,
  Gift,
  Megaphone,
  Trophy,
};

/** Resolves an achievement's icon name (from the achievements config) to a
 *  Phosphor component. Falls back to a trophy. */
export function AchievementIcon({
  name,
  className,
  weight = "bold",
}: {
  name: string;
  className?: string;
  weight?: IconWeight;
}) {
  const Icon = ICON_MAP[name] ?? Trophy;
  return <Icon className={className} weight={weight} />;
}
