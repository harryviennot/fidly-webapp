'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  getVariableDisplayName,
  type Locale,
  type VariableKey,
} from '@/lib/template-variables';

interface VariableChipsProps {
  /** Canonical variable keys to render. */
  variables: VariableKey[];
  /** Called when the user clicks a chip; receives the canonical key. */
  onInsert: (variable: VariableKey) => void;
  /** Locale used for the chip label. Defaults to `en`. */
  locale?: Locale;
  className?: string;
}

export function VariableChips({
  variables,
  onInsert,
  locale = 'en',
  className,
}: VariableChipsProps) {
  const t = useTranslations('notifications.editor');

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <span className="text-xs text-muted-foreground self-center mr-1">
        {t('variablesLabel')}:
      </span>
      {variables.map((v) => {
        const label = getVariableDisplayName(v, locale);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(v)}
            title={t(`variables.${v}`)}
            className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-mono text-foreground hover:bg-muted hover:border-[var(--accent)] transition-colors"
          >
            {`{{${label}}}`}
          </button>
        );
      })}
    </div>
  );
}

export type { VariableKey };
