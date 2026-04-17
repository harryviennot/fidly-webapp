'use client';

import { useTranslations } from 'next-intl';
import { TranslateIcon, CheckIcon } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/notification';

interface LocaleSwitcherProps {
  /** The locale currently being edited. */
  value: Locale;
  /** Switch to editing a different locale. */
  onValueChange: (value: Locale) => void;
  /** Business's primary locale — always shown at the top of the list. */
  primaryLocale: Locale;
  className?: string;
}

const ALL_LOCALES: Locale[] = ['fr', 'en'];

const LOCALE_FLAGS: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
};

const LOCALE_NATIVE: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

/**
 * Language picker for the notification editor.
 *
 * Shows the active language on the left and a "Translations" dropdown on the
 * right that lists every supported locale, clicking one switches the editor
 * to that locale. Primary locale is pinned first. The room to grow into
 * more locales later was the explicit reason for preferring a dropdown over
 * a row of tabs — keeps the header compact even with 5+ languages.
 */
export function LocaleTabs({
  value,
  onValueChange,
  primaryLocale,
  className,
}: Readonly<LocaleSwitcherProps>) {
  const t = useTranslations('notifications.editor');

  const orderedLocales: Locale[] = [
    primaryLocale,
    ...ALL_LOCALES.filter((l) => l !== primaryLocale),
  ];

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
        <span className="text-[13px] leading-none">{LOCALE_FLAGS[value]}</span>
        {LOCALE_NATIVE[value]}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85 transition-colors"
          >
            <TranslateIcon className="h-3.5 w-3.5" weight="bold" />
            {t('translations')}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
            {t('translations')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {orderedLocales.map((loc) => {
            const isActive = loc === value;
            return (
              <DropdownMenuItem
                key={loc}
                onSelect={() => onValueChange(loc)}
                className="flex items-center justify-between gap-3"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-[14px] leading-none">
                    {LOCALE_FLAGS[loc]}
                  </span>
                  {LOCALE_NATIVE[loc]}
                </span>
                {isActive && (
                  <CheckIcon
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    weight="bold"
                  />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
