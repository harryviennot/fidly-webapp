'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type VariableKey =
  | 'stamp_count'
  | 'total_stamps'
  | 'stamps_left'
  | 'reward_name'
  | 'business_name'
  | 'customer_first_name';

interface VariableChipsProps {
  variables: VariableKey[];
  onInsert: (variable: string) => void;
  className?: string;
}

export function VariableChips({
  variables,
  onInsert,
  className,
}: VariableChipsProps) {
  const t = useTranslations('notifications.editor');

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <span className="text-xs text-muted-foreground self-center mr-1">
        {t('variablesLabel')}:
      </span>
      {variables.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(`{{${v}}}`)}
          title={t(`variables.${v}`)}
          className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-mono text-foreground hover:bg-muted hover:border-[var(--accent)] transition-colors"
        >
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}

export type { VariableKey };
