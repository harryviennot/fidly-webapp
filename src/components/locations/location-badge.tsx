"use client";

import { MapPinIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface LocationBadgeProps {
  name: string;
  /** Subtle variant for inline metadata rows (activity feed, stats). */
  variant?: "default" | "subtle" | "removable";
  onRemove?: () => void;
  className?: string;
}

export function LocationBadge({
  name,
  variant = "default",
  onRemove,
  className,
}: LocationBadgeProps) {
  const isRemovable = variant === "removable" && !!onRemove;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-[11px] font-medium",
        variant === "subtle"
          ? "text-[#8A8A8A]"
          : "px-2 py-0.5 bg-[#F5F3EF] text-[#555] border border-[#EEEDEA]",
        className
      )}
    >
      <MapPinIcon className="h-3 w-3 shrink-0" weight="fill" />
      <span className="truncate max-w-[160px]">{name}</span>
      {isRemovable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 text-[#A0A0A0] hover:text-red-500 transition-colors"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
