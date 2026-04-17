'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { BroadcastStatus } from '@/types/notification';

interface BroadcastStatusBadgeProps {
  status: BroadcastStatus;
  className?: string;
}

const STATUS_STYLES: Record<BroadcastStatus, { dot: string; bg: string; text: string }> = {
  draft: {
    dot: 'bg-[#A0A0A0]',
    bg: 'bg-[var(--paper-hover)]',
    text: 'text-[#555]',
  },
  scheduled: {
    dot: 'bg-[var(--info)]',
    bg: 'bg-[var(--info-light)]',
    text: 'text-[var(--info)]',
  },
  sending: {
    dot: 'bg-[var(--warning)] animate-pulse',
    bg: 'bg-[var(--warning-light)]',
    text: 'text-[var(--warning)]',
  },
  sent: {
    dot: 'bg-[var(--success)]',
    bg: 'bg-[var(--success-light)]',
    text: 'text-[var(--success)]',
  },
  cancelled: {
    dot: 'bg-[#A0A0A0]',
    bg: 'bg-[var(--paper-hover)]',
    text: 'text-[#8A8A8A]',
  },
  failed: {
    dot: 'bg-[var(--error)]',
    bg: 'bg-[var(--error-light)]',
    text: 'text-[var(--error)]',
  },
};

export function BroadcastStatusBadge({
  status,
  className,
}: Readonly<BroadcastStatusBadgeProps>) {
  const t = useTranslations('notifications.broadcasts.status');
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        style.bg,
        style.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {t(status)}
    </span>
  );
}
