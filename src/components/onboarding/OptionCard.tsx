'use client';

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  active: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  emoji?: string;
  disabled?: boolean;
  /**
   * Tag rendered in the right-side slot in place of the selection check. Use
   * for "Coming soon" / "Beta" style status pills on disabled chips.
   */
  badge?: string;
}

/**
 * Single tappable card used for option grids in the wizard (Type / Size /
 * Locations / Objectives). Lives in onboarding/ rather than ui/ because the
 * styling is wizard-specific — selected state uses the accent palette and
 * the layout assumes full-width on mobile.
 *
 * Tap target ≥80pt to feel comfortable on phones (the 80% case).
 */
export function OptionCard({
  active,
  onClick,
  label,
  description,
  emoji,
  disabled,
  badge,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'group relative flex items-center gap-3 w-full p-4 rounded-[12px] text-left transition-all duration-150 min-h-[64px]',
        'border-[1.5px]',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-light)]'
          : 'border-[var(--border)] bg-white hover:border-[var(--border-dark)]',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer'
      )}
    >
      {emoji ? (
        <span className="wiz-h leading-none flex-shrink-0" aria-hidden="true">
          {emoji}
        </span>
      ) : null}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'wiz-body leading-tight',
            active ? 'text-[var(--foreground)]' : 'text-[#333]'
          )}
        >
          {label}
        </div>
        {description ? (
          <p className="mt-0.5 wiz-helper text-[#7A7A7A] leading-snug">{description}</p>
        ) : null}
      </div>
      {badge ? (
        <span className="flex-shrink-0 inline-flex items-center px-1.5 py-px rounded-full bg-[var(--paper)] border border-[var(--border)] text-[10px] font-semibold uppercase tracking-wide text-[#888] whitespace-nowrap leading-[1.4]">
          {badge}
        </span>
      ) : (
        <span
          className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
            active
              ? 'bg-[var(--accent)] text-white'
              : 'border-[1.5px] border-[var(--border-dark)] bg-white'
          )}
        >
          {active && <Check className="w-3 h-3" weight="bold" />}
        </span>
      )}
    </button>
  );
}
