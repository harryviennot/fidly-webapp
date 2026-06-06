"use client";

import { useSyncExternalStore } from "react";
import { Info } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * True on mouse / fine-pointer devices. useSyncExternalStore keeps SSR and the
 * first client paint consistent (server snapshot = false), then re-renders to
 * the real value after hydration — no hydration mismatch, no setState-in-effect.
 */
function useHoverCapable(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(HOVER_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(HOVER_QUERY).matches,
    () => false
  );
}

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

const TRIGGER_CLASSES =
  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

// Popover content restyled to match the base TooltipContent (dark bubble, small
// text), so the two interaction modes look identical across the app.
const TOOLTIP_LOOK =
  "w-fit max-w-[16rem] border-0 bg-foreground p-0 px-3 py-2 text-[13px] leading-relaxed text-background shadow-md";

/**
 * A small "i" info bubble explaining a metric, field, or term.
 *
 * Adapts to the input device: **hover to view** on mouse / fine-pointer devices
 * (a real Tooltip), **tap to view** on touchscreens (a Popover, since hover
 * tooltips never fire on touch). Both wear the base Tooltip style. Use for any
 * "what is this / tell me more" secondary context.
 */
export function InfoPopover({
  content,
  label,
  className,
  side = "top",
  align = "center",
}: InfoPopoverProps) {
  const useHover = useHoverCapable();

  const trigger = (
    <button
      type="button"
      aria-label={label ?? "More information"}
      // Don't let opening the bubble trigger a parent row/link click.
      onClick={(e) => e.stopPropagation()}
      className={cn(TRIGGER_CLASSES, className)}
    >
      <Info className="h-4 w-4" weight="regular" />
    </button>
  );

  if (useHover) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side} align={align} className="max-w-[16rem] text-[13px] leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side={side} align={align} className={TOOLTIP_LOOK}>
        {content}
      </PopoverContent>
    </Popover>
  );
}
