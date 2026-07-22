'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CardDesign } from '@/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PlusIcon,
  PencilIcon,
  CopyIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { WalletCard, CardWrapper } from '@/components/card';
import { useDesignEntitlements } from '@/hooks/useEntitlements';
import { toast } from 'sonner';

interface TemplateGridProps {
  /** Card styles to render as tiles (the inactive ones). */
  designs: CardDesign[];
  /** Total number of styles (active + inactive), used for plan limits. */
  totalDesignCount: number;
  /** Whether an active style exists (drives the empty-state copy). */
  hasActiveDesign: boolean;
  /** The live program's type. A saved design of the OTHER type (a conversion
   * draft, or the archived pre-conversion design) can't be activated from
   * here — activation would break the program<->design type invariant (the
   * backend 409s as a backstop). It goes live through the conversion flow. */
  programType?: 'stamp' | 'points';
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function TemplateGrid({
  designs,
  totalDesignCount,
  hasActiveDesign,
  programType,
  onDelete,
  onActivate,
  onDuplicate,
}: TemplateGridProps) {
  const t = useTranslations('designEditor');
  const tFeatures = useTranslations('features');
  const { canCreateDesign, isAtDesignLimit, getLimit } = useDesignEntitlements(totalDesignCount);
  const designLimit = getLimit('designs.max_active');

  // Pending activation awaiting confirmation. Activation pushes an update to
  // every customer's wallet, so it must be confirmed before it fires.
  const [pendingActivateId, setPendingActivateId] = useState<string | null>(null);

  const handleOverLimitClick = () => {
    toast(tFeatures('overLimit.toastDesignLocked', { limit: designLimit ?? 1 }));
  };

  // Relative "Edited ..." label from updated_at.
  const editedLabel = (iso?: string): string | null => {
    if (!iso) return null;
    const days = Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86_400_000);
    let rel: string;
    if (days <= 0) rel = t('time.today');
    else if (days === 1) rel = t('time.yesterday');
    else if (days < 7) rel = t('time.daysAgo', { count: days });
    else if (days < 30) rel = t('time.weeksAgo', { count: Math.floor(days / 7) });
    else rel = t('time.monthsAgo', { count: Math.floor(days / 30) });
    return t('edited', { time: rel });
  };

  const confirmActivate = () => {
    if (pendingActivateId) onActivate(pendingActivateId);
    setPendingActivateId(null);
  };

  return (
    <div className="space-y-6">
      {designs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {designs.map((design, index) => {
            const isOverLimit = design.is_over_limit ?? false;
            const isTypeMismatch =
              programType != null && (design.card_type ?? 'stamp') !== programType;
            const metadata = editedLabel(design.updated_at) ?? undefined;
            const animationDelay = `${Math.min(index, 8) * 60}ms`;

            const card = (
              <CardWrapper
                href={isOverLimit ? undefined : `/design/${design.id}`}
                title={design.name || t('pages.untitledDesign')}
                badge={
                  isOverLimit
                    ? { label: tFeatures('overLimit.readOnly'), variant: 'warning' }
                    : isTypeMismatch
                      ? { label: t('typeMismatchBadge'), variant: 'warning' }
                      : undefined
                }
                metadata={metadata}
                primaryAction={
                  isOverLimit || isTypeMismatch
                    ? undefined
                    : {
                        label: t('setAsActive'),
                        icon: <CheckCircleIcon className="h-4 w-4" />,
                        onClick: () => setPendingActivateId(design.id),
                      }
                }
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
                  {
                    label: t('delete'),
                    icon: <TrashIcon className="h-4 w-4" />,
                    onClick: () => onDelete(design.id),
                    destructive: true,
                  },
                ]}
              >
                <WalletCard
                  design={design}
                  showQR={true}
                  showSecondaryFields={true}
                />
              </CardWrapper>
            );

            if (isOverLimit) {
              return (
                <button
                  key={design.id}
                  type="button"
                  onClick={handleOverLimitClick}
                  className="text-left w-full max-w-[340px] mx-auto animate-slide-up"
                  style={{ animationDelay }}
                >
                  {card}
                </button>
              );
            }

            return (
              <div
                key={design.id}
                className="w-full max-w-[340px] mx-auto animate-slide-up"
                style={{ animationDelay }}
              >
                {card}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <PlusIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {hasActiveDesign ? t('createAnother') : t('createFirstDesign')}
          </p>
          {canCreateDesign && (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/design/new">
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('newStyle')}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Upgrade hint for users at their plan's style limit */}
      {isAtDesignLimit && hasActiveDesign && (
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

      <AlertDialog
        open={!!pendingActivateId}
        onOpenChange={(open) => !open && setPendingActivateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('activateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('activateBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('pages.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivate}>{t('setAsActive')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
