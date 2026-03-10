'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { LoyaltyProgram } from '@/types';

interface ProgramSummaryCardProps {
  program: LoyaltyProgram | undefined;
  delay?: number;
  isOwner?: boolean;
}

export function ProgramSummaryCard({ program, delay = 0, isOwner = true }: ProgramSummaryCardProps) {
  const t = useTranslations('loyaltyProgram.overview');

  if (!program) return null;

  const items = [
    { label: t('loyaltyType'), value: t('stampsValue'), icon: '☆' },
    { label: t('stampsRequired'), value: `${program.config?.total_stamps ?? 10} stamps`, icon: '🎯' },
    { label: t('reward'), value: program.reward_name || '—', icon: '☕' },
    { label: t('dataCollected'), value: t('emailOnly'), icon: '📧' },
    { label: t('cardStatus'), value: t('active'), icon: '✅', accent: true },
    { label: t('passType'), value: t('appleAndGoogle'), icon: '📱' },
  ];

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-semibold text-[#1A1A1A]">
          {t('programConfiguration')}
        </div>
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
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-[var(--paper)] border border-[var(--border-light)]"
          >
            <span className="text-[18px]">{item.icon}</span>
            <div>
              <div className="text-[11px] text-[#8A8A8A]">{item.label}</div>
              <div className={cn(
                'text-[13px] font-semibold',
                item.accent ? 'text-[var(--accent)]' : 'text-[#1A1A1A]'
              )}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
