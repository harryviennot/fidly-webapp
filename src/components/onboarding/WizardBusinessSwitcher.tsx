'use client';

import { CaretDown, Storefront } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBusiness } from '@/contexts/business-context';
import type { Business } from '@/types';

/**
 * Compact switcher rendered in the wizard header for users who manage
 * multiple businesses. Hidden when memberships ≤ 1 so single-business
 * owners (the vast majority of wizard runs) don't see extra chrome.
 *
 * Selecting another business always navigates to `/` — the dashboard
 * layout decides whether to stay there (target is fully onboarded) or
 * forward to its saved `last_step` (target is mid-wizard). Doing the
 * decision in one place avoids duplicating the resume-path logic.
 */
export function WizardBusinessSwitcher() {
  const router = useRouter();
  const t = useTranslations();
  const { memberships, currentBusiness, setCurrentBusiness } = useBusiness();

  if (memberships.length <= 1) return null;

  const otherMemberships = memberships.filter(
    (m) => m.business.id !== currentBusiness?.id,
  );

  const handleSelect = (business: Business) => {
    setCurrentBusiness(business);
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('businessSwitcher.switchTo')}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors max-w-[160px]"
        >
          <Storefront className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" weight="bold" />
          <span className="truncate">{currentBusiness?.name ?? 'Stampeo'}</span>
          <CaretDown className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" weight="bold" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-60">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {t('businessSwitcher.switchTo')}
        </DropdownMenuLabel>
        {otherMemberships.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => handleSelect(m.business)}
            className="gap-2 p-2"
          >
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate font-medium text-sm">{m.business.name}</span>
              <span className="text-xs text-muted-foreground">{t(`roles.${m.role}`)}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
