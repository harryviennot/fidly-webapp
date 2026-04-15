'use client';

import { useTranslations } from 'next-intl';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/redesign/animated-number';
import type { Broadcast } from '@/types/notification';

interface LastBroadcastResultsWidgetProps {
  lastSent: Broadcast | null;
  onOpen: (broadcast: Broadcast) => void;
  className?: string;
}

export function LastBroadcastResultsWidget({
  lastSent,
  onOpen,
  className,
}: Readonly<LastBroadcastResultsWidgetProps>) {
  const t = useTranslations('notifications.broadcasts');

  if (!lastSent) return null;

  const reachable = lastSent.reachable_recipients ?? 0;
  const delivered = lastSent.delivered ?? 0;
  const denom = reachable > 0 ? reachable : lastSent.total_recipients ?? 0;
  const rate = denom > 0 ? Math.round((delivered / denom) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(lastSent)}
      className={cn(
        'text-left w-full bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] hover:border-[var(--border-light)] hover:shadow-sm transition-all',
        className
      )}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 shrink-0 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
          <PaperPlaneTiltIcon
            className="h-3.5 w-3.5 text-[var(--accent)]"
            weight="fill"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#1A1A1A]">
            {t('lastResults.title')}
          </div>
          <div className="text-[10.5px] text-[#A0A0A0] truncate">
            {formatRelative(lastSent.sent_at, t)}
          </div>
        </div>
      </div>

      <div className="text-[12.5px] font-semibold text-[#1A1A1A] truncate mb-3">
        {lastSent.title || '—'}
      </div>

      {denom > 0 ? (
        <>
          <div className="flex items-baseline gap-1.5 mb-1">
            <AnimatedNumber
              value={rate}
              suffix="%"
              className="text-[32px] font-bold tabular-nums text-[var(--success)] leading-none"
            />
            <span className="text-[11px] text-[#8A8A8A]">
              {t('lastResults.deliveredShort')}
            </span>
          </div>
          <div className="text-[11px] text-[#8A8A8A] tabular-nums mb-3">
            {delivered} / {denom}
          </div>
          <div className="h-1.5 rounded-full bg-[var(--paper-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--success)] transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
        </>
      ) : null}
    </button>
  );
}

function formatRelative(
  iso: string | null,
  t: (key: string, values?: Record<string, number | string>) => string
): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t('lastResults.relativeJustNow');
  if (diffMin < 60) return t('lastResults.relativeMinutes', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('lastResults.relativeHours', { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t('lastResults.relativeDays', { count: diffDay });
}
