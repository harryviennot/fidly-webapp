'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CardDesign } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilSimpleIcon, CopyIcon } from '@phosphor-icons/react';
import { WalletCard, ScaledCardWrapper } from '@/components/card';

interface ActiveCardHeroProps {
  design: CardDesign;
  onDuplicate: (id: string) => void;
}

/**
 * Featured presentation of the business's live card style. This is the most
 * important object on the templates page: the card every customer currently
 * carries. Rendered larger than the grid tiles, with its management actions
 * surfaced directly rather than hidden in a menu.
 */
export function ActiveCardHero({ design, onDuplicate }: ActiveCardHeroProps) {
  const t = useTranslations('designEditor');

  return (
    <Card flat className="p-5 sm:p-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
        {/* Card preview */}
        <Link
          href={`/design/${design.id}`}
          className="block w-full max-w-[280px] mx-auto sm:mx-0 sm:w-[300px] shrink-0 transition-transform hover:scale-[1.02]"
        >
          <ScaledCardWrapper baseWidth={300} aspectRatio={1.282} minScale={0.6}>
            <WalletCard design={design} showQR showSecondaryFields />
          </ScaledCardWrapper>
        </Link>

        {/* Info + actions */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <Badge
            variant="secondary"
            className="bg-[var(--accent-light)] text-[var(--accent)]"
          >
            {t('active')}
          </Badge>
          <h2 className="mt-3 text-xl font-bold tracking-tight truncate">
            {design.name || t('pages.untitledDesign')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('activeReassurance')}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
            <Button asChild className="rounded-full">
              <Link href={`/design/${design.id}`}>
                <PencilSimpleIcon className="w-4 h-4" />
                <span className="truncate">{t('editDesign')}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => onDuplicate(design.id)}
            >
              <CopyIcon className="w-4 h-4" />
              <span className="truncate">{t('duplicate')}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
