'use client';

import { Info } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/use-media-query';

interface FieldTooltipProps {
  content: string;
}

const triggerClassName =
  'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const bubbleClassName =
  'w-auto max-w-[250px] rounded-md border-0 bg-foreground px-3 py-1.5 text-sm text-background shadow-md';

// Radix Tooltip is hover-only and ignores taps, so touch devices never
// got to see the info bubbles. Branch on `(hover: hover)`: hover-capable
// pointers (mouse / trackpad) keep the original hover-to-reveal Tooltip;
// touch-only devices get a Popover, which gives tap-to-open + tap-outside-
// to-close. The `(hover: hover)` media query is the standard way to
// detect "this input has a real hover state."
export function FieldTooltip({ content }: Readonly<FieldTooltipProps>) {
  const hasHover = useMediaQuery('(hover: hover)');

  if (hasHover) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={triggerClassName}>
            <Info className="w-4 h-4" />
            <span className="sr-only">More info</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          {content}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName}>
          <Info className="w-4 h-4" />
          <span className="sr-only">More info</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className={bubbleClassName}>
        {content}
      </PopoverContent>
    </Popover>
  );
}

interface LabelWithTooltipProps {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip: string;
}

export function LabelWithTooltip({ htmlFor, children, tooltip }: Readonly<LabelWithTooltipProps>) {
  return (
    <div className="flex items-center gap-1.5">
      <label
        htmlFor={htmlFor}
        className="wiz-body-sm font-medium text-[var(--foreground)]"
      >
        {children}
      </label>
      <FieldTooltip content={tooltip} />
    </div>
  );
}
