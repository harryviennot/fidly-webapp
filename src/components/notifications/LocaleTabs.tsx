'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon, XIcon } from '@phosphor-icons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/notification';

interface LocaleTabsProps {
  value: Locale;
  onValueChange: (value: Locale) => void;
  /** Business's primary locale — always shown first and cannot be removed. */
  primaryLocale: Locale;
  /** The locales currently displayed as tabs. Must include primaryLocale. */
  enabledLocales: Locale[];
  /** Add/remove a secondary locale tab. */
  onAddLocale: (locale: Locale) => void;
  onRemoveLocale: (locale: Locale) => void;
  enContent: React.ReactNode;
  frContent: React.ReactNode;
  className?: string;
}

const ALL_LOCALES: Locale[] = ['fr', 'en'];

const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
};

export function LocaleTabs({
  value,
  onValueChange,
  primaryLocale,
  enabledLocales,
  onAddLocale,
  onRemoveLocale,
  enContent,
  frContent,
  className,
}: Readonly<LocaleTabsProps>) {
  const t = useTranslations('notifications.editor');

  // Always render the primary locale first, then the remaining enabled ones
  // in the canonical order so the tab order is stable across re-renders.
  const primary = primaryLocale;
  const secondaries = enabledLocales.filter((l) => l !== primary);
  const orderedLocales: Locale[] = [primary, ...secondaries];

  const availableToAdd = ALL_LOCALES.filter(
    (l) => !enabledLocales.includes(l)
  );

  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as Locale)}
      className={className}
    >
      <div className="flex items-center gap-2">
        <TabsList>
          {orderedLocales.map((loc) => {
            const isPrimary = loc === primary;
            const isActive = value === loc;
            return (
              <TabsTrigger key={loc} value={loc} className="gap-1.5">
                {LOCALE_LABELS[loc]}
                {!isPrimary && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isActive) onValueChange(primary);
                      onRemoveLocale(loc);
                    }}
                    aria-label={t('removeTranslation')}
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-black/10 hover:text-foreground"
                  >
                    <XIcon className="h-2.5 w-2.5" weight="bold" />
                  </button>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {availableToAdd.length > 0 && (
          <div className="flex items-center gap-1">
            {availableToAdd.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => {
                  onAddLocale(loc);
                  onValueChange(loc);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                <PlusIcon className="h-3 w-3" weight="bold" />
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>
        )}
      </div>
      <TabsContent value="en" className={cn('mt-3')}>
        {enContent}
      </TabsContent>
      <TabsContent value="fr" className={cn('mt-3')}>
        {frContent}
      </TabsContent>
    </Tabs>
  );
}
