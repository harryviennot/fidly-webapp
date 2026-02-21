'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  PencilIcon,
  GearIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import type { CardDesign } from '@/types';

interface QuickActionsProps {
  activeDesign: CardDesign | undefined;
}

export function QuickActions({ activeDesign }: QuickActionsProps) {
  const t = useTranslations('loyaltyProgram.overview');

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        {t('quickActions')}
      </p>
      <div className="flex flex-col gap-2">
        {activeDesign ? (
          <Button asChild variant="outline" size="sm" className="justify-start rounded-full">
            <Link href={`/design/${activeDesign.id}`}>
              <PencilIcon className="h-4 w-4" />
              <span className="ml-2">{t('editDesign')}</span>
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="justify-start rounded-full">
            <Link href="/design/new">
              <PlusIcon className="h-4 w-4" />
              <span className="ml-2">{t('editDesign')}</span>
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="justify-start rounded-full">
          <Link href="/program/settings">
            <GearIcon className="h-4 w-4" />
            <span className="ml-2">{t('programSettings')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
