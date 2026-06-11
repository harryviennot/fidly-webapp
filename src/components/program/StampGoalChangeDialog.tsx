'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, GiftIcon, StampIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { StampGoalImpact } from '@/types';

export type GoalChangeStrategy = 'grant_reward' | 'keep_stamps';

export type StampGoalDialogVariant = 'raise' | 'lower' | 'stackable_off';

interface StampGoalChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: StampGoalDialogVariant;
  impact: StampGoalImpact | null;
  /** Whether the config being SAVED has stacking on (drives the lower copy). */
  nextStackable: boolean;
  onConfirm: (strategy: GoalChangeStrategy) => void;
  isConfirming?: boolean;
}

/**
 * Pre-save confirmation when a program change affects existing customers:
 * - raise: the owner chooses what happens to full cards (grant vs keep).
 * - lower: informational; customers above the new goal are converted in
 *   their favor automatically.
 * - stackable_off: informational; banked rewards stay redeemable and drain
 *   (keep-and-drain is enforced, no choice).
 */
export function StampGoalChangeDialog({
  open,
  onOpenChange,
  variant,
  impact,
  nextStackable,
  onConfirm,
  isConfirming = false,
}: StampGoalChangeDialogProps) {
  const t = useTranslations('loyaltyProgram.goalChange');
  const [strategy, setStrategy] = useState<GoalChangeStrategy>('grant_reward');

  if (!impact) return null;

  const count =
    variant === 'stackable_off' ? impact.banked_rewards_count : impact.affected_count;

  const title =
    variant === 'raise'
      ? t('raiseTitle', { count })
      : variant === 'lower'
        ? t('lowerTitle', { count })
        : t('stackOffTitle', { count });

  const description =
    variant === 'raise'
      ? t('raiseDescription', { count, oldTotal: impact.old_total, newTotal: impact.new_total })
      : variant === 'lower'
        ? nextStackable
          ? t('lowerDescriptionStackable', { count, newTotal: impact.new_total })
          : t('lowerDescription', { count, newTotal: impact.new_total })
        : t('stackOffDescription', { count });

  const options: Array<{
    id: GoalChangeStrategy;
    icon: typeof GiftIcon;
    label: string;
    desc: string;
  }> = [
    {
      id: 'grant_reward',
      icon: GiftIcon,
      label: t('grantLabel'),
      desc: t('grantDescription', { newTotal: impact.new_total }),
    },
    {
      id: 'keep_stamps',
      icon: StampIcon,
      label: t('keepLabel'),
      desc: t('keepDescription', {
        oldTotal: impact.old_total,
        newTotal: impact.new_total,
      }),
    },
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-12 h-12 rounded-full bg-[var(--warning-light)] flex items-center justify-center text-[var(--warning)] mb-3.5">
              <WarningCircleIcon size={24} weight="fill" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {variant === 'raise' && (
          <div className="flex flex-col gap-2">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isActive = strategy === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStrategy(opt.id)}
                  className={cn(
                    'p-3.5 px-4 rounded-[10px] text-left transition-all duration-150 cursor-pointer',
                    isActive
                      ? 'border-2 border-[var(--accent)] bg-[var(--accent-light)]'
                      : 'border-[1.5px] border-[var(--border)]'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon size={18} weight="bold" className={isActive ? 'text-[var(--accent)]' : 'text-[#8A8A8A]'} />
                      <span className={cn('text-[14px] font-semibold', isActive ? 'text-[#1A1A1A]' : 'text-[#555]')}>
                        {opt.label}
                      </span>
                    </div>
                    {isActive && (
                      <div className="w-[18px] h-[18px] rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                        <CheckIcon className="w-2.5 h-2.5 text-white" weight="bold" />
                      </div>
                    )}
                  </div>
                  <div className="text-[11.5px] text-[#8A8A8A] leading-[1.4]">{opt.desc}</div>
                </button>
              );
            })}
            <p className="text-[11px] text-[var(--muted-foreground)] leading-[1.5] mt-1">
              {t('raiseNote')}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(variant === 'raise' ? strategy : 'keep_stamps')}
            disabled={isConfirming}
          >
            {isConfirming ? t('saving') : t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
