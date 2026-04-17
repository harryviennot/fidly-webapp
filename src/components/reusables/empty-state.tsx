'use client';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Centered icon shown above the title (sized by `size`). */
  icon: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Pre-built CTA — typically a `<Button>`. */
  cta?: React.ReactNode;
  /** `sm` matches the inline section empty boxes, `md` matches the page-level. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Dashed-border empty state used everywhere a list/section is empty
 * (broadcasts list, milestones, notifications, filters).
 */
export function EmptyState({
  icon,
  title,
  description,
  cta,
  size = 'sm',
  className,
}: EmptyStateProps) {
  const isMd = size === 'md';
  return (
    <div
      className={cn(
        'rounded-[10px] border border-dashed border-[var(--border-light)] text-center',
        isMd ? 'px-5 py-10' : 'px-5 py-8',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto text-[#A0A0A0] flex items-center justify-center',
          isMd ? 'h-8 w-8 mb-3' : 'h-6 w-6 mb-2'
        )}
      >
        {icon}
      </div>
      {title && (
        <div
          className={cn(
            'font-semibold text-[#1A1A1A]',
            isMd ? 'text-[14px] mb-1' : 'text-[13px] mb-1'
          )}
        >
          {title}
        </div>
      )}
      {description && (
        <p
          className={cn(
            'text-[12px] text-[#8A8A8A] leading-[1.45] max-w-xs mx-auto',
            (title || cta) && 'mb-0'
          )}
        >
          {description}
        </p>
      )}
      {cta && <div className="mt-3.5">{cta}</div>}
    </div>
  );
}
