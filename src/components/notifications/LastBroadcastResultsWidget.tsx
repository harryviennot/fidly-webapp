'use client';

import { useTranslations } from 'next-intl';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { InfoCard, MetricNumber } from '@/components/reusables';
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
    <InfoCard
      icon={<PaperPlaneTiltIcon className="h-3.5 w-3.5" weight="fill" />}
      title={t('lastResults.title')}
      subtitle={formatRelative(lastSent.sent_at, t)}
      onClick={() => onOpen(lastSent)}
      className={className}
    >
      <div className="text-[12.5px] font-semibold text-[#1A1A1A] truncate mb-3">
        {lastSent.title || '—'}
      </div>

      {denom > 0 && (
        <MetricNumber
          value={rate}
          suffix="%"
          label={t('lastResults.deliveredShort')}
          total={`${delivered} / ${denom}`}
          progressPercent={rate}
          variant="success"
          animated
        />
      )}
    </InfoCard>
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
