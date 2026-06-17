'use client';

import { useTranslations } from 'next-intl';
import {
  TrophyIcon,
  GiftIcon,
  StampIcon,
  ClockIcon,
  DownloadSimpleIcon,
  StackIcon,
  PulseIcon,
  type Icon,
} from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { InfoPopover } from '@/components/reusables/info-popover';
import { useBusiness } from '@/contexts/business-context';
import { useProgramHealth } from '@/hooks/use-program-health';

interface ProgramHealthCardProps {
  delay?: number;
}

/* Each metric badge gets a quiet tint so the column stays scannable without
 * shouting. Tones reuse the same CSS vars the StatCards use. */
type Tone = 'accent' | 'warning' | 'info' | 'muted';

const TONE_BG: Record<Tone, string> = {
  accent: 'bg-[var(--accent-light)]/50 text-[var(--accent)]',
  warning: 'bg-[#F6E9D6] text-[#C4883D]',
  info: 'bg-[#E3EEF7] text-[#4A7DA6]',
  muted: 'bg-[var(--paper)] text-[#6B6B6B]',
};

export function ProgramHealthCard({ delay = 0 }: ProgramHealthCardProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const { currentBusiness } = useBusiness();
  const { data, isLoading } = useProgramHealth(currentBusiness?.id);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  // Only the rates whose meaning isn't obvious from the label carry a tooltip
  // (what counts as "complete", what the install-rate denominator is, etc.).
  // Self-explanatory metrics — avg stamps, time to reward, rewards waiting — don't.
  const rows: Array<{
    key: string;
    icon: Icon;
    tone: Tone;
    label: string;
    info?: string;
    value: string;
  }> = data
    ? [
        {
          key: 'completion',
          icon: TrophyIcon,
          tone: 'accent',
          label: t('rewardCompletionRate'),
          info: t('completionRateInfo'),
          value: pct(data.completion_rate),
        },
        {
          key: 'redemption',
          icon: GiftIcon,
          tone: 'warning',
          label: t('redemptionRate'),
          info: t('redemptionRateInfo'),
          value: pct(data.redemption_rate),
        },
        {
          key: 'install',
          icon: DownloadSimpleIcon,
          tone: 'info',
          label: t('installRate'),
          info: t('installRateInfo'),
          value: pct(data.install_rate),
        },
        {
          key: 'avgStamps',
          icon: StampIcon,
          tone: 'muted',
          label: t('avgStampsPerCustomer'),
          value: data.avg_stamps_per_customer.toFixed(1),
        },
        {
          key: 'timeToReward',
          icon: ClockIcon,
          tone: 'muted',
          label: t('avgTimeToReward'),
          value:
            data.avg_days_to_first_reward == null
              ? '—'
              : t('daysValue', { count: Math.round(data.avg_days_to_first_reward) }),
        },
        {
          key: 'banked',
          icon: StackIcon,
          tone: 'muted',
          label: t('bankedRewards'),
          value: data.banked_rewards_count.toLocaleString(),
        },
      ]
    : [];

  const isEmpty = !isLoading && data && data.total_enrollments === 0;

  return (
    <Card
      flat
      hover={false}
      className="p-4 min-[1080px]:p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-4">
        <PulseIcon className="w-[18px] h-[18px] text-[var(--accent)]" weight="bold" />
        <span className="text-[15px] font-semibold text-[#1A1A1A]">{t('programHealth')}</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                <div className="h-3.5 w-28 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-10 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="py-6 text-center">
          <div className="text-[14px] font-semibold text-[#1A1A1A]">{t('healthEmptyTitle')}</div>
          <div className="text-[12px] text-[#8A8A8A] mt-1 max-w-[280px] mx-auto leading-relaxed">
            {t('healthEmptyBody')}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => {
            const RowIcon = row.icon;
            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 py-2.5"
                style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${TONE_BG[row.tone]}`}
                  >
                    <RowIcon className="w-4 h-4" weight="bold" />
                  </span>
                  <span className="text-[12px] text-[#555] leading-tight">{row.label}</span>
                  {row.info && <InfoPopover content={row.info} />}
                </div>
                <span className="text-[15px] font-semibold text-[#1A1A1A] tabular-nums shrink-0">
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
