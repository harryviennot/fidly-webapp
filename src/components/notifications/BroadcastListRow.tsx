'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  WarningIcon,
  ClockIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { BroadcastStatusBadge } from './BroadcastStatusBadge';
import type { Broadcast } from '@/types/notification';

interface BroadcastListRowProps {
  broadcast: Broadcast;
  onClick: (broadcast: Broadcast) => void;
  className?: string;
}

/**
 * Single-line row in the broadcasts list. Matches the settings/data-collection
 * row style from program/settings/page.tsx: bordered pill inside the section
 * card, with status-aware secondary line (recipient + delivery counts).
 */
export function BroadcastListRow({
  broadcast,
  onClick,
  className,
}: Readonly<BroadcastListRowProps>) {
  const t = useTranslations('notifications.broadcasts');
  const uiLocale = useLocale();

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(uiLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const title = broadcast.title || t('detail.title');
  const isSentLike = broadcast.status === 'sent' || broadcast.status === 'sending';
  const isScheduled = broadcast.status === 'scheduled';
  const isDraft = broadcast.status === 'draft';

  let metaLine: React.ReactNode;
  if (isSentLike) {
    metaLine = (
      <div className="flex items-center gap-3 text-[11px] text-[#8A8A8A]">
        {broadcast.sent_at && <span>{formatDate(broadcast.sent_at)}</span>}
        <span className="flex items-center gap-1">
          <UsersIcon className="h-3 w-3" weight="bold" />
          {t('row.recipients', { count: broadcast.total_recipients ?? 0 })}
        </span>
        {broadcast.delivered > 0 && (
          <span className="flex items-center gap-1 text-[var(--success)]">
            <CheckCircleIcon className="h-3 w-3" weight="fill" />
            {t('row.delivered', { count: broadcast.delivered })}
          </span>
        )}
        {broadcast.failed > 0 && (
          <span className="flex items-center gap-1 text-[var(--error)]">
            <WarningIcon className="h-3 w-3" weight="fill" />
            {t('row.failed', { count: broadcast.failed })}
          </span>
        )}
        {broadcast.google_throttled > 0 && (
          <span className="flex items-center gap-1 text-[var(--warning)]">
            <ClockIcon className="h-3 w-3" weight="fill" />
            {t('row.throttled', { count: broadcast.google_throttled })}
          </span>
        )}
      </div>
    );
  } else if (isScheduled) {
    metaLine = (
      <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A]">
        <ClockIcon className="h-3 w-3" />
        {t('detail.scheduledFor')} {formatDate(broadcast.scheduled_at)}
      </div>
    );
  } else if (isDraft) {
    metaLine = (
      <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A]">
        {t('row.lastEdited', { date: formatDate(broadcast.updated_at ?? broadcast.created_at) })}
      </div>
    );
  } else {
    metaLine = (
      <div className="text-[11px] text-[#8A8A8A]">
        {formatDate(broadcast.created_at)}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(broadcast)}
      className={cn(
        'w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] border-[1.5px] border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)] transition-all duration-150',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[14px] font-semibold text-[#1A1A1A] truncate">
            {title}
          </span>
          <BroadcastStatusBadge status={broadcast.status} />
        </div>
        <p className="text-[12px] text-[#8A8A8A] leading-[1.4] truncate mb-1">
          {broadcast.body}
        </p>
        {metaLine}
      </div>
    </button>
  );
}
