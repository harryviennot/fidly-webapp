'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  TagIcon,
  StampIcon,
  TargetIcon,
  RocketLaunchIcon,
  StackIcon,
  GiftIcon,
  EnvelopeIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DeviceMobileIcon,
  type Icon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useBusiness } from '@/contexts/business-context';
import { summarizeDataCollection } from '@/lib/customer-data-collection';
import type { LoyaltyProgram } from '@/types';

interface ProgramSummaryCardProps {
  program: LoyaltyProgram | undefined;
  delay?: number;
  isOwner?: boolean;
}

export function ProgramSummaryCard({ program, delay = 0, isOwner = true }: ProgramSummaryCardProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const tRoot = useTranslations('loyaltyProgram');
  const { currentBusiness } = useBusiness();

  if (!program) return null;

  const config = program.config;

  // Data collected — reflects the real config (anonymous mode or the actual fields),
  // not a hardcoded "Email only". Shared helper keeps it in sync with settings.
  const { anonymous, fields } = summarizeDataCollection(
    currentBusiness?.settings?.customer_data_collection
  );
  const dataCollectedValue = anonymous
    ? tRoot('anonymous')
    : fields.map((f) => tRoot(`dataFields.${f}`)).join(', ');

  // Stackable rewards — On (max N) / On (unlimited) / Off, from real config.
  const stackableValue = config?.stackable_rewards
    ? config.max_stacked_rewards != null
      ? t('stackableMax', { count: config.max_stacked_rewards })
      : t('stackableUnlimited')
    : t('stackableOff');

  const initialStamps = config?.initial_stamps ?? 0;
  const isActive = program.is_active;

  const items: Array<{
    label: string;
    value: string;
    icon: Icon;
    tone?: 'accent' | 'danger';
  }> = [
    { label: t('programName'), value: program.name, icon: TagIcon },
    { label: t('loyaltyType'), value: t('stampsValue'), icon: StampIcon },
    { label: t('stampsRequired'), value: `${config?.total_stamps ?? 10}`, icon: TargetIcon },
    {
      label: t('headStart'),
      value: initialStamps > 0 ? t('headStartValue', { count: initialStamps }) : t('noHeadStart'),
      icon: RocketLaunchIcon,
    },
    { label: t('stackableRewards'), value: stackableValue, icon: StackIcon },
    { label: t('reward'), value: program.reward_name || '—', icon: GiftIcon },
    {
      label: t('dataCollected'),
      value: dataCollectedValue,
      icon: anonymous ? UserCircleIcon : EnvelopeIcon,
    },
    {
      label: t('cardStatus'),
      value: isActive ? t('active') : t('inactive'),
      icon: isActive ? CheckCircleIcon : XCircleIcon,
      tone: isActive ? 'accent' : 'danger',
    },
    { label: t('passType'), value: t('appleAndGoogle'), icon: DeviceMobileIcon },
  ];

  return (
    <Card
      flat
      hover={false}
      className="p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-semibold text-[#1A1A1A]">{t('programConfiguration')}</div>
        {isOwner && (
          <Link
            href="/program/settings"
            className="text-[12px] text-[var(--accent)] font-medium hover:underline"
          >
            {t('edit')}
          </Link>
        )}
      </div>

      {/* Config items grid */}
      <div className={cn('grid gap-3', 'grid-cols-1 min-[1080px]:grid-cols-2')}>
        {items.map((item, i) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-[var(--paper)] border border-[var(--border-light)]"
            >
              <ItemIcon
                className={cn(
                  'w-[18px] h-[18px] shrink-0',
                  item.tone === 'accent'
                    ? 'text-[var(--accent)]'
                    : item.tone === 'danger'
                      ? 'text-[#C44D4D]'
                      : 'text-[#8A8A8A]'
                )}
                weight="bold"
              />
              <div className="min-w-0">
                <div className="text-[11px] text-[#8A8A8A]">{item.label}</div>
                <div
                  className={cn(
                    'text-[13px] font-semibold truncate',
                    item.tone === 'accent'
                      ? 'text-[var(--accent)]'
                      : item.tone === 'danger'
                        ? 'text-[#C44D4D]'
                        : 'text-[#1A1A1A]'
                  )}
                >
                  {item.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
