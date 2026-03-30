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
  LockIcon,
} from '@phosphor-icons/react';
import { WalletCard, CardWrapper } from '@/components/card';
import { useDesignEntitlements } from '@/hooks/useEntitlements';
import { toast } from 'sonner';

interface TemplateGridProps {
  activeDesign: CardDesign | undefined;
  inactiveDesigns: CardDesign[];
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function TemplateGrid({
  activeDesign,
  inactiveDesigns,
  onDelete,
  onActivate,
  onDuplicate,
}: TemplateGridProps) {
  const t = useTranslations('designEditor');
  const tFeatures = useTranslations('features');
  const allDesigns = activeDesign
    ? [activeDesign, ...inactiveDesigns]
    : inactiveDesigns;
  const { canCreateDesign, isAtDesignLimit, getLimit } = useDesignEntitlements(allDesigns.length);
  const designLimit = getLimit("designs.max_active");

  const handleOverLimitClick = () => {
    toast(tFeatures('overLimit.toastDesignLocked', { limit: designLimit ?? 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Card grid */}
      {allDesigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allDesigns.map((design) => {
            const isOverLimit = design.is_over_limit ?? false;

            const card = (
              <CardWrapper
                href={isOverLimit ? undefined : `/design/${design.id}`}
                title={design.organization_name || t('yourBusiness')}
                badge={
                  design.is_active
                    ? { label: t('active'), variant: 'success' }
                    : isOverLimit
                      ? { label: tFeatures('overLimit.readOnly'), variant: 'warning' }
                      : undefined
                }
                metadata={t('stamps', { count: design.total_stamps })}
                className={isOverLimit ? 'opacity-60' : undefined}
                actions={isOverLimit ? [] : [
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
                {isOverLimit && (
                  <div className="absolute top-2 right-2 z-10">
                    <LockIcon className="w-5 h-5 text-[var(--warning)]" weight="fill" />
                  </div>
                )}
                <WalletCard
                  design={design}
                  showQR={true}
                  showSecondaryFields={true}
                />
              </CardWrapper>
            );

            if (isOverLimit) {
              return (
                <button key={design.id} type="button" onClick={handleOverLimitClick} className="text-left w-full">
                  {card}
                </button>
              );
            }

            return <div key={design.id}>{card}</div>;
          })}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <PlusIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('createFirstDesign')}
          </p>
          {canCreateDesign && (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/design/new">
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('createCard')}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Upgrade hint for users at their design limit */}
      {isAtDesignLimit && activeDesign && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
          <p className="text-sm">
            <span className="font-medium">{tFeatures('upgrade.designs')}</span>
            <span className="text-muted-foreground ml-1">{tFeatures('upgrade.designsHint')}</span>
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-full shrink-0 ml-4">
            <Link href="/billing">
              {tFeatures('upgrade.designsAction')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
