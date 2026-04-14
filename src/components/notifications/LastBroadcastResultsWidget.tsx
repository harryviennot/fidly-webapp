'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  PaperPlaneTiltIcon,
  UsersIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Broadcast } from '@/types/notification';

interface LastBroadcastResultsWidgetProps {
  broadcasts: Broadcast[];
  onOpen: (broadcast: Broadcast) => void;
  className?: string;
}

export function LastBroadcastResultsWidget({
  broadcasts,
  onOpen,
  className,
}: Readonly<LastBroadcastResultsWidgetProps>) {
  const t = useTranslations('notifications.broadcasts');

  const lastSent = useMemo<Broadcast | null>(() => {
    const sent = broadcasts.filter((b) => b.status === 'sent' && b.sent_at);
    if (sent.length === 0) return null;
    const sorted = [...sent].sort((a, b) => {
      const ta = a.sent_at ? new Date(a.sent_at).getTime() : 0;
      const tb = b.sent_at ? new Date(b.sent_at).getTime() : 0;
      return tb - ta;
    });
    return sorted[0];
  }, [broadcasts]);

  if (!lastSent) return null;

  const total = lastSent.total_recipients ?? 0;
  const delivered = lastSent.delivered ?? 0;
  const failed = lastSent.failed ?? 0;
  const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(lastSent)}
      className={cn(
        'text-left w-full bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] hover:border-[var(--border)] hover:shadow-sm transition-all',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
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

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat
          icon={<UsersIcon className="h-3 w-3" weight="bold" />}
          label={t('lastResults.recipients')}
          value={total}
        />
        <Stat
          icon={<CheckCircleIcon className="h-3 w-3" weight="fill" />}
          label={t('lastResults.delivered')}
          value={delivered}
          tone="success"
        />
        {failed > 0 ? (
          <Stat
            icon={<WarningIcon className="h-3 w-3" weight="fill" />}
            label={t('lastResults.failed')}
            value={failed}
            tone="error"
          />
        ) : (
          <div />
        )}
      </div>

      {total > 0 && (
        <>
          <div className="h-1 rounded-full bg-[var(--paper-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10.5px] text-[#8A8A8A] tabular-nums">
            {t('lastResults.deliveryRate', { rate })}
          </div>
        </>
      )}
    </button>
  );
}

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'error';
}

const TONE_CLASS: Record<NonNullable<StatProps['tone']>, string> = {
  default: 'text-[#1A1A1A]',
  success: 'text-[var(--success)]',
  error: 'text-[var(--error)]',
};

function Stat({ icon, label, value, tone = 'default' }: Readonly<StatProps>) {
  const toneClass = TONE_CLASS[tone];
  return (
    <div className="flex flex-col">
      <div className={cn('text-[13px] font-bold tabular-nums', toneClass)}>
        {value}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-[#8A8A8A]">
        {icon}
        <span className="truncate">{label}</span>
      </div>
    </div>
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
