'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import type { RewardTier } from '@/types';
import { cn } from '@/lib/utils';

interface RewardMenuEditorProps {
  value: RewardTier[];
  onChange: (rewards: RewardTier[]) => void;
  /** Max rows allowed; further "add" is hidden when reached. */
  max?: number;
  className?: string;
}

function newRewardId(): string {
  // Stable, unique per reward — the points card designer keys icons off it.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `r_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `r_${Math.round(performance.now())}_${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Controlled editor for a points reward menu — a list of priced rewards
 * `{ name, threshold }` where `threshold` is the price in points. Shared by the
 * onboarding wizard and the program settings page. Always keeps at least one
 * row (the remove button is disabled when a single reward remains).
 */
export function RewardMenuEditor({
  value,
  onChange,
  max = 12,
  className,
}: RewardMenuEditorProps) {
  const t = useTranslations('loyaltyProgram.points.rewardMenu');

  const update = (index: number, patch: Partial<RewardTier>) => {
    onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const add = () => {
    onChange([...value, { id: newRewardId(), name: '', threshold: 100 }]);
  };

  const remove = (index: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {/* Column headers */}
      <div className="flex items-center gap-2 px-1">
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-[#9A9A9A]">
          {t('rewardHeader')}
        </span>
        <span className="w-[120px] text-[11px] font-semibold uppercase tracking-wide text-[#9A9A9A]">
          {t('priceHeader')}
        </span>
        <span className="w-8" aria-hidden />
      </div>

      {value.map((reward, index) => (
        <div key={reward.id} className="flex items-center gap-2">
          <Input
            value={reward.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder={t('rewardPlaceholder')}
            className="h-11 flex-1"
            aria-label={t('rewardAria', { index: index + 1 })}
          />
          <div className="relative w-[120px]">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={Number.isFinite(reward.threshold) ? reward.threshold : ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                update(index, { threshold: Number.isNaN(n) ? 0 : n });
              }}
              className="h-11 pr-9 text-right"
              aria-label={t('priceAria', { index: index + 1 })}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#9A9A9A]">
              {t('pointsSuffix')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => remove(index)}
            disabled={value.length <= 1}
            aria-label={t('removeAria', { index: index + 1 })}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9A9A9A] transition-colors hover:bg-[#F2F2F2] hover:text-[#D14343] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#9A9A9A]"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}

      {value.length < max && (
        <button
          type="button"
          onClick={add}
          className="mt-0.5 flex items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-light)]"
        >
          <PlusIcon className="h-4 w-4" weight="bold" />
          {t('addReward')}
        </button>
      )}
    </div>
  );
}
