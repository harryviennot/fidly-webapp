'use client';

import { CaretDownIcon } from '@phosphor-icons/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type InfoCardIconVariant =
  | 'accent'
  | 'dark'
  | 'amber'
  | 'success'
  | 'warning';

export interface InfoCardProps {
  /** Phosphor icon (or any node) shown inside the small icon square. */
  icon?: React.ReactNode;
  /** Card title — bold black 13-15px depending on context. */
  title: React.ReactNode;
  /** Optional subtitle — only rendered inside the collapsed mobile trigger. */
  subtitle?: React.ReactNode;
  /** Background/foreground color tokens for the icon square. */
  iconVariant?: InfoCardIconVariant;
  /**
   * When true, renders as a shadcn `Collapsible` (icon+title+caret trigger,
   * children inside the panel) instead of the inline card. The consumer is
   * responsible for visibility wrapping (e.g. `min-[1080px]:hidden`) when
   * a different layout should be used on desktop.
   */
  collapsible?: boolean;
  /** Body content (composable blocks live in `./blocks.tsx`). */
  children: React.ReactNode;
  /** Forwarded animation-delay so pages can keep their slide-up rhythm. */
  animationDelayMs?: number;
  className?: string;
  bodyClassName?: string;
  /** When set, the entire card becomes a clickable button. */
  onClick?: () => void;
  /** ARIA label when `onClick` is set and `title` is non-textual. */
  ariaLabel?: string;
}

const ICON_VARIANT_CLASSES: Record<InfoCardIconVariant, { bg: string; fg: string }> = {
  accent: {
    bg: 'bg-[var(--accent-light)]',
    fg: 'text-[var(--accent)]',
  },
  dark: {
    bg: 'bg-[#1A1A1A]',
    fg: 'text-white',
  },
  amber: {
    bg: 'bg-amber-100',
    fg: 'text-amber-600',
  },
  success: {
    bg: 'bg-[var(--success-light)]',
    fg: 'text-[var(--success)]',
  },
  warning: {
    bg: 'bg-amber-100',
    fg: 'text-amber-700',
  },
};

const CARD_CHROME =
  'bg-[var(--card)] rounded-xl border border-[var(--border)]';
const CARD_PADDING = 'p-[18px]';

interface IconBadgeProps {
  icon: React.ReactNode;
  variant: InfoCardIconVariant;
}

function IconBadge({ icon, variant }: IconBadgeProps) {
  const tone = ICON_VARIANT_CLASSES[variant];
  return (
    <div
      className={cn(
        'w-7 h-7 shrink-0 rounded-lg flex items-center justify-center',
        tone.bg,
        tone.fg
      )}
    >
      {icon}
    </div>
  );
}

interface InfoCardHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  variant: InfoCardIconVariant;
}

function InfoCardHeader({ icon, title, subtitle, variant }: InfoCardHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {icon && <IconBadge icon={icon} variant={variant} />}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#1A1A1A] leading-[1.3] truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10.5px] text-[#A0A0A0] truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable card with an icon header and free-form body. Used across the
 * dashboard for "How it works", "Available variables", widgets, etc.
 *
 * Compose with the blocks in `./blocks.tsx` (NumberedSteps, NoteBlock,
 * DividerNote, KeyValueList, MetricNumber) to avoid hand-rolling repeated
 * markup.
 *
 * Pass `collapsible="mobile"` to get the broadcasts-style mobile collapsible
 * behaviour: a full card on `min-[1080px]` and a `Collapsible` trigger below.
 */
export function InfoCard({
  icon,
  title,
  subtitle,
  iconVariant = 'accent',
  collapsible = false,
  children,
  animationDelayMs,
  className,
  bodyClassName,
  onClick,
  ariaLabel,
}: InfoCardProps) {
  const styleProp = animationDelayMs
    ? { animationDelay: `${animationDelayMs}ms` }
    : undefined;

  if (collapsible) {
    return (
      <Collapsible
        className={cn(
          'overflow-hidden',
          CARD_CHROME,
          animationDelayMs && 'animate-slide-up',
          className
        )}
        style={styleProp}
      >
        <CollapsibleTrigger className="group w-full px-4 py-3 flex items-center gap-2.5 hover:bg-[var(--paper)] transition-colors">
          {icon && <IconBadge icon={icon} variant={iconVariant} />}
          <div className="flex-1 text-left min-w-0">
            <div className="text-[13px] font-semibold text-[#1A1A1A] leading-tight truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-[11px] text-[#8A8A8A] truncate">
                {subtitle}
              </div>
            )}
          </div>
          <CaretDownIcon
            className="h-4 w-4 text-[#8A8A8A] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
            weight="bold"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="collapsible-content">
          <div
            className={cn(
              'px-[18px] pt-3 pb-[18px] border-t border-[var(--border-light)]',
              bodyClassName
            )}
          >
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'text-left w-full',
          CARD_CHROME,
          CARD_PADDING,
          'hover:border-[var(--border-light)] hover:shadow-sm transition-all',
          animationDelayMs && 'animate-slide-up',
          className
        )}
        style={styleProp}
      >
        <InfoCardHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          variant={iconVariant}
        />
        <div className={bodyClassName}>{children}</div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        CARD_CHROME,
        CARD_PADDING,
        animationDelayMs && 'animate-slide-up',
        className
      )}
      style={styleProp}
    >
      <InfoCardHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        variant={iconVariant}
      />
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
