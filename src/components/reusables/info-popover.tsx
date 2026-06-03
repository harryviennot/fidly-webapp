"use client";

import { Info } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InfoPopoverProps {
  /** The explanation shown when opened. String or rich content. */
  content: React.ReactNode;
  /** Accessible label for the trigger (defaults to a generic "More information"). */
  label?: string;
  /** Extra classes on the trigger button (e.g. size or color tweaks). */
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

/**
 * A click-to-open info bubble: a small "i" trigger that reveals a short
 * explanation. Built on Popover (not Tooltip) so it works on touch devices,
 * where hover tooltips never appear. Use for the "tell me more" / "what is this
 * metric" secondary context the copywriting skill says belongs in a popover.
 */
export function InfoPopover({
  content,
  label,
  className,
  side = "top",
  align = "center",
}: InfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label ?? "More information"}
          // Don't let opening the bubble trigger a parent row/link click.
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            className
          )}
        >
          <Info className="h-4 w-4" weight="bold" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-64 text-[13px] leading-relaxed text-[var(--muted-foreground)]"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
