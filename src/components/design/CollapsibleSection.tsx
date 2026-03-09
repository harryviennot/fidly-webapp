'use client';

import { CaretDown, Check } from '@phosphor-icons/react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: 'complete' | null;
  annotation?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
  icon,
  badge,
  annotation,
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="bg-white border border-[#EEEDEA] rounded-xl overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full px-4 py-4 flex items-center gap-2.5 cursor-pointer border-none bg-transparent hover:bg-muted/30 transition-colors text-left"
          >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-foreground">{title}</div>
              {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
            </div>
            {annotation && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">{annotation}</span>
            )}
            {badge === 'complete' && (
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" weight="bold" />
            )}
            <CaretDown
              className={cn(
                'w-3.5 h-3.5 text-muted-foreground transition-transform duration-250 flex-shrink-0',
                isOpen && 'rotate-180'
              )}
              weight="bold"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="collapsible-content">
          <div className="px-5 pb-5">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
