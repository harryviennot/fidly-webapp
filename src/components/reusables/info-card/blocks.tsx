'use client';

import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AnimatedNumber } from '@/components/redesign/animated-number';
import { cn } from '@/lib/utils';

// ─── NumberedSteps ───────────────────────────────────────────────────────

export interface NumberedStepsProps {
  items: React.ReactNode[];
  startAt?: number;
  className?: string;
}

/**
 * Numbered list with circular badges. Auto-numbers any number of items —
 * pass 3, 5, or 12 and they'll all render the same way.
 */
export function NumberedSteps({
  items,
  startAt = 1,
  className,
}: NumberedStepsProps) {
  return (
    <ol className={cn('space-y-2', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--paper)] border border-[var(--border-light)] flex items-center justify-center text-[10px] font-bold text-[#8A8A8A] mt-0.5">
            {startAt + i}
          </span>
          <span className="text-[12px] text-[#555] leading-[1.45]">
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ─── DividerNote ─────────────────────────────────────────────────────────

export interface DividerNoteProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Small grey footer note separated from the body by a top divider line.
 * Used at the bottom of "How it works" for the delivery hint.
 */
export function DividerNote({ children, className }: DividerNoteProps) {
  return (
    <div
      className={cn(
        'mt-3.5 pt-3 border-t border-[var(--border-light)]',
        className
      )}
    >
      <p className="text-[11px] text-[#8A8A8A] leading-[1.45]">{children}</p>
    </div>
  );
}

// ─── NoteBlock ───────────────────────────────────────────────────────────

export type NoteBlockVariant = 'amber' | 'blue' | 'neutral' | 'success';

export interface NoteBlockProps {
  variant: NoteBlockVariant;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  link?: { href: string; label: string; external?: boolean };
  className?: string;
}

const NOTE_VARIANTS: Record<
  NoteBlockVariant,
  {
    container: string;
    iconColor: string;
    titleColor: string;
    bodyColor: string;
    linkColor: string;
  }
> = {
  amber: {
    container: 'border-amber-200/80 bg-amber-50/70',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    bodyColor: 'text-amber-900/80',
    linkColor: 'text-amber-800 hover:text-amber-900',
  },
  blue: {
    container: 'border-blue-200/80 bg-blue-50/70',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    bodyColor: 'text-blue-900/80',
    linkColor: 'text-blue-800 hover:text-blue-900',
  },
  neutral: {
    container: 'border-[var(--border-light)] bg-[var(--paper)]',
    iconColor: 'text-[#8A8A8A]',
    titleColor: 'text-[#1A1A1A]',
    bodyColor: 'text-[#555]',
    linkColor: 'text-[var(--accent)] hover:text-[var(--accent)]/80',
  },
  success: {
    container: 'border-[var(--success-light)] bg-[var(--success-light)]/50',
    iconColor: 'text-[var(--success)]',
    titleColor: 'text-[#1A1A1A]',
    bodyColor: 'text-[#555]',
    linkColor: 'text-[var(--success)] hover:text-[var(--success)]/80',
  },
};

/**
 * Coloured note box with optional icon, title, body, and link. Used inside
 * InfoCards to draw attention to caveats (Apple cache, Google quota, etc).
 */
export function NoteBlock({
  variant,
  icon,
  title,
  children,
  link,
  className,
}: NoteBlockProps) {
  const tone = NOTE_VARIANTS[variant];
  return (
    <div className={cn('rounded-[10px] border p-3', tone.container, className)}>
      <div className="flex items-start gap-2">
        {icon && (
          <div className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', tone.iconColor)}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <div
              className={cn(
                'text-[11px] font-semibold mb-0.5',
                tone.titleColor
              )}
            >
              {title}
            </div>
          )}
          {children && (
            <p className={cn('text-[11px] leading-[1.45]', tone.bodyColor)}>
              {children}
            </p>
          )}
          {link && (
            <a
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noreferrer noopener' : undefined}
              className={cn(
                'inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold underline-offset-2 hover:underline',
                tone.linkColor
              )}
            >
              {link.label}
              {link.external && (
                <ArrowSquareOutIcon className="h-3 w-3" weight="bold" />
              )}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KeyValueList ────────────────────────────────────────────────────────

export interface KeyValueItem {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tooltip?: React.ReactNode;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  className?: string;
}

/**
 * Compact list of label → value rows. Used by the variables reference
 * sidebar on the notifications page.
 */
export function KeyValueList({ items, className }: KeyValueListProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {items.map((item) => {
        const inner = (
          <>
            <div className="min-w-0 truncate">{item.label}</div>
            <div
              className={cn(
                'text-[10px] text-[#A0A0A0] truncate max-w-[140px]',
                item.disabled && 'opacity-60'
              )}
            >
              {item.value}
            </div>
          </>
        );
        const rowClass = cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] border text-left',
          item.disabled
            ? 'bg-[var(--paper)]/40 border-dashed border-[var(--border-light)] opacity-60 hover:opacity-100'
            : 'bg-[var(--paper)] border-[var(--border-light)]',
          item.onClick && 'cursor-pointer'
        );
        const row = item.onClick ? (
          <button type="button" className={rowClass} onClick={item.onClick}>
            {inner}
          </button>
        ) : (
          <div className={rowClass}>{inner}</div>
        );
        if (!item.tooltip) {
          return <div key={item.key}>{row}</div>;
        }
        return (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent
              side="left"
              className="max-w-[240px] text-[11px] leading-snug"
            >
              {item.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── MetricNumber ────────────────────────────────────────────────────────

export type MetricNumberVariant = 'accent' | 'success' | 'warning';

export interface MetricNumberProps {
  value: number;
  suffix?: string;
  /** Inline label rendered next to the number ("delivered", "%", etc). */
  label?: React.ReactNode;
  /** Right-aligned secondary value ("120 / 200"). */
  total?: React.ReactNode;
  /** Optional progress bar 0-100. */
  progressPercent?: number;
  variant?: MetricNumberVariant;
  /** Use AnimatedNumber for the count-up effect. */
  animated?: boolean;
  className?: string;
}

const METRIC_COLORS: Record<MetricNumberVariant, string> = {
  accent: 'text-[var(--accent)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
};

const PROGRESS_COLORS: Record<MetricNumberVariant, string> = {
  accent: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
};

/**
 * Big tabular number with optional label, secondary total, and progress bar.
 * Used by `LastBroadcastResultsWidget` and the broadcasts quota counter.
 */
export function MetricNumber({
  value,
  suffix,
  label,
  total,
  progressPercent,
  variant = 'success',
  animated = false,
  className,
}: MetricNumberProps) {
  const numberClass = cn(
    'text-[32px] font-bold tabular-nums leading-none',
    METRIC_COLORS[variant]
  );
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          {animated ? (
            <AnimatedNumber
              value={value}
              suffix={suffix}
              className={numberClass}
            />
          ) : (
            <span className={numberClass}>
              {value}
              {suffix}
            </span>
          )}
          {label && (
            <span className="text-[11px] text-[#8A8A8A] truncate">{label}</span>
          )}
        </div>
        {total && (
          <div className="text-[11px] text-[#8A8A8A] tabular-nums shrink-0">
            {total}
          </div>
        )}
      </div>
      {typeof progressPercent === 'number' && (
        <div className="h-1.5 rounded-full bg-[var(--paper-hover)] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              PROGRESS_COLORS[variant]
            )}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
