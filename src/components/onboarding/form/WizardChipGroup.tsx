'use client';

import { cn } from '@/lib/utils';
import { OptionCard } from '../OptionCard';

export interface ChipGroupOption {
  id: string;
  label: string;
  description?: string;
  emoji?: string;
  disabled?: boolean;
  /** Rendered in place of the check pill — e.g. "Coming soon". */
  badge?: string;
}

interface WizardChipGroupProps {
  value: string;
  onChange: (id: string) => void;
  options: ChipGroupOption[];
  /**
   * Layout variant:
   *  - `grid` (default) — two columns on ≥480px, one on mobile.
   *  - `stack` — always stacked single column. Use when descriptions are long
   *    enough that two columns would feel cramped.
   */
  layout?: 'grid' | 'stack';
}

/**
 * Wizard chip-group: wraps `OptionCard` to produce a radio-style picker with
 * consistent layout. Single-select; the disabled options stay visible (with
 * a `badge`) so the user can see what's coming.
 */
export function WizardChipGroup({
  value,
  onChange,
  options,
  layout = 'grid',
}: WizardChipGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-1 min-[480px]:grid-cols-2 gap-2'
          : 'flex flex-col gap-2'
      )}
    >
      {options.map((opt) => (
        <OptionCard
          key={opt.id}
          active={value === opt.id}
          onClick={() => {
            if (!opt.disabled) onChange(opt.id);
          }}
          label={opt.label}
          description={opt.description}
          emoji={opt.emoji}
          disabled={opt.disabled}
          badge={opt.badge}
        />
      ))}
    </div>
  );
}
