'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  getVariableDisplayName,
  type Locale,
  type VariableKey,
} from '@/lib/template-variables';

interface VariableChipsProps {
  /** Canonical variable keys to render. */
  variables: VariableKey[];
  /** Called when the user clicks an enabled chip; receives the canonical key. */
  onInsert: (variable: VariableKey) => void;
  /** Locale used for the chip label. Defaults to `en`. */
  locale?: Locale;
  /** Variables that should render as greyed-out / non-insertable. Hovering
   *  one of these surfaces a tooltip explaining why it's unavailable. */
  disabledVariables?: ReadonlySet<VariableKey>;
  /** Plain-text tooltip copy per disabled variable key. */
  disabledTooltips?: Partial<Record<VariableKey, string>>;
  /** When a disabled chip has an href, it renders as a Link that navigates
   *  to that path on click — e.g. the program settings page. Radix tooltip
   *  content is not reachable by pointer, so clickable guidance lives on
   *  the chip itself, not inside the tooltip. */
  disabledHrefs?: Partial<Record<VariableKey, string>>;
  className?: string;
}

export function VariableChips({
  variables,
  onInsert,
  locale = 'en',
  disabledVariables,
  disabledTooltips,
  disabledHrefs,
  className,
}: VariableChipsProps) {
  const t = useTranslations('notifications.editor');
  const router = useRouter();

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <span className="text-xs text-muted-foreground self-center mr-1">
        {t('variablesLabel')}:
      </span>
      {variables.map((v) => {
        const label = getVariableDisplayName(v, locale);
        const isDisabled = disabledVariables?.has(v) ?? false;
        const chipClass = cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono transition-colors',
          isDisabled
            ? 'border-dashed border-border bg-muted/20 text-muted-foreground/60 hover:border-[var(--accent)] hover:text-foreground cursor-pointer'
            : 'border-border bg-muted/40 text-foreground hover:bg-muted hover:border-[var(--accent)]'
        );

        if (isDisabled) {
          const tooltip = disabledTooltips?.[v];
          const href = disabledHrefs?.[v];
          // Use an explicit onClick (router.push) rather than a Next.js Link
          // because Radix Tooltip's pointerdown handling can swallow the
          // default link navigation when the tooltip is open.
          const chipButton = (
            <button
              type="button"
              className={chipClass}
              aria-disabled="true"
              onClick={() => {
                if (href) router.push(href);
              }}
            >
              {`{{${label}}}`}
            </button>
          );
          return tooltip ? (
            <Tooltip key={v}>
              <TooltipTrigger asChild>{chipButton}</TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[240px] text-[11px] leading-snug"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={v}>{chipButton}</span>
          );
        }

        return (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(v)}
            title={t(`variables.${v}`)}
            className={chipClass}
          >
            {`{{${label}}}`}
          </button>
        );
      })}
    </div>
  );
}

export type { VariableKey };
