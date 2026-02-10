'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CardDesign } from '@/types';
import { Button } from '@/components/ui/button';
import {
  PlusIcon,
  PencilIcon,
  CopyIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { WalletCard, CardWrapper } from '@/components/card';

interface TemplateGridProps {
  activeDesign: CardDesign | undefined;
  inactiveDesigns: CardDesign[];
  isProPlan: boolean;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function TemplateGrid({
  activeDesign,
  inactiveDesigns,
  isProPlan,
  onDelete,
  onActivate,
  onDuplicate,
}: TemplateGridProps) {
  const t = useTranslations('designEditor');
  const canCreateNew = isProPlan || (!activeDesign && inactiveDesigns.length === 0);

  // Combine all cards with active first
  const allDesigns = activeDesign
    ? [activeDesign, ...inactiveDesigns]
    : inactiveDesigns;

  return (
    <div className="space-y-6">
      {/* Card grid */}
      {allDesigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allDesigns.map((design) => (
            <CardWrapper
              key={design.id}
              href={`/design/${design.id}`}
              title={design.organization_name || t('yourBusiness')}
              badge={
                design.is_active
                  ? { label: t('active'), variant: 'success' }
                  : undefined
              }
              metadata={t('stamps', { count: design.total_stamps })}
              actions={[
                {
                  label: t('edit'),
                  icon: <PencilIcon className="h-4 w-4" />,
                  href: `/design/${design.id}`,
                },
                {
                  label: t('duplicate'),
                  icon: <CopyIcon className="h-4 w-4" />,
                  onClick: () => onDuplicate(design.id),
                },
                ...(!design.is_active
                  ? [
                    {
                      label: t('setAsActive'),
                      icon: <CheckCircleIcon className="h-4 w-4" />,
                      onClick: () => onActivate(design.id),
                    },
                  ]
                  : []),
                ...(!design.is_active
                  ? [
                    {
                      label: t('delete'),
                      icon: <TrashIcon className="h-4 w-4" />,
                      onClick: () => onDelete(design.id),
                      destructive: true,
                    },
                  ]
                  : []),
              ]}
            >
              <WalletCard
                design={design}
                showQR={true}
                showSecondaryFields={true}
              />
            </CardWrapper>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <PlusIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('createFirstDesign')}
          </p>
          {canCreateNew && (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/design/new">
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('createCard')}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Pro hint for non-pro users with existing card */}
      {!isProPlan && activeDesign && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
          <p className="text-sm">
            <span className="font-medium">{t('pro.wantMore')}</span>
            <span className="text-muted-foreground ml-1">{t('pro.upgradeHint')}</span>
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-full shrink-0 ml-4">
            <Link href="/settings/billing">
              {t('pro.upgradeToPro')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
