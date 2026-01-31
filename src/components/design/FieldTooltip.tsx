'use client';

import { Info } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface FieldTooltipProps {
  content: string;
}

export function FieldTooltip({ content }: Readonly<FieldTooltipProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
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
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {children}
      </label>
      <FieldTooltip content={tooltip} />
    </div>
  );
}
