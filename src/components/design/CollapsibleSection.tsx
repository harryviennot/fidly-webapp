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
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: 'complete' | null;
  annotation?: string;
}

export function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
  icon,
  badge,
  annotation,
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-2xl overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium">{title}</span>
              {annotation && (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{annotation}</span>
              )}
              {badge === 'complete' && (
                <Check className="w-4 h-4 text-green-600" weight="bold" />
              )}
            </div>
            <CaretDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
              weight="bold"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="collapsible-content">
          <div className="p-4 border-t">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
