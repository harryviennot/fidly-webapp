'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FlagIcon, PencilIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { InfoBox } from '@/components/reusables/info-box';
import { TriggerListSkeleton } from './TriggerListSkeleton';
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
import { useBusiness } from '@/contexts/business-context';
import {
  useMilestones,
  useDeleteMilestone,
} from '@/hooks/use-notifications';
import { renderSamplePreview } from '@/lib/template-variables';
import { MilestoneCreateSheet } from './MilestoneCreateSheet';
import type { Milestone } from '@/types/notification';

interface MilestoneSectionProps {
  /** Total stamps required by the active program — passed to the create sheet for validation. */
  totalStamps?: number;
  /** Loyalty program name shown in the preview inside the milestone edit sheet. */
  programName?: string | null;
  /** Whether the active program has a reward name set. Forwarded to the
   *  milestone editor so the `{{reward_name}}` chip can be greyed out. */
  rewardNameSet?: boolean;
}

export function MilestoneSection({
  totalStamps,
  programName,
  rewardNameSet,
}: Readonly<MilestoneSectionProps>) {
  const t = useTranslations('notifications.milestones');
  const uiLocale = useLocale() as 'en' | 'fr';
  const { currentBusiness } = useBusiness();
  const { data, isLoading, error } = useMilestones(currentBusiness?.id);
  const deleteMutation = useDeleteMilestone(currentBusiness?.id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Milestone | null>(null);

  const openCreate = () => {
    setEditingMilestone(null);
    setSheetOpen(true);
  };

  const openEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingMilestone(null);
  };

  const milestones = data?.items ?? [];
  const limit = data?.limit ?? 0;
  const isAtLimit =
    typeof limit === 'number' && limit > 0 && milestones.length >= limit;
  const isUnlimited = limit === null;

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success(t('toasts.deleted'));
      setPendingDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('toasts.deleteFailed')
      );
    }
  };

  // Sort by stamp_equals ascending for readability
  const sorted = [...milestones].sort(
    (a, b) => a.stamp_equals - b.stamp_equals
  );

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: '120ms' }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-[#1A1A1A]">
            {t('title')}
          </div>
          <div className="text-[12px] text-[#A0A0A0]">{t('description')}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isUnlimited && typeof limit === 'number' && limit > 0 && (
            <span className="text-[11px] text-[#8A8A8A] font-medium">
              {t('usage', { count: milestones.length, max: limit })}
            </span>
          )}
          {isUnlimited && milestones.length > 0 && (
            <span className="text-[11px] text-[#8A8A8A] font-medium">
              {t('unlimited', { count: milestones.length })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={openCreate}
            disabled={isAtLimit}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('add')}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading && <TriggerListSkeleton rows={2} />}

        {error && (
          <InfoBox
            variant="error"
            message={
              error instanceof Error ? error.message : 'Failed to load milestones'
            }
          />
        )}

        {!isLoading && !error && sorted.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-[var(--border-light)] px-5 py-8 text-center">
            <FlagIcon
              className="mx-auto h-6 w-6 text-[#A0A0A0] mb-2"
              weight="regular"
            />
            <p className="text-[12px] text-[#A0A0A0] leading-[1.45] max-w-[320px] mx-auto">
              {t('empty')}
            </p>
          </div>
        )}

        {!isLoading && !error && sorted.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {sorted.map((milestone) => {
              const bodyText =
                milestone.body[uiLocale] || milestone.body.en || '';
              const preview = renderSamplePreview(bodyText, {
                stamp_count: String(milestone.stamp_equals),
              });
              const handleRowKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openEdit(milestone);
                }
              };
              return (
                <div
                  key={milestone.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(milestone)}
                  onKeyDown={handleRowKeyDown}
                  className="w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] bg-[var(--paper)] border-[1.5px] border-[var(--border-light)] hover:border-[var(--border)] transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-bold text-[var(--accent)] tabular-nums">
                      {milestone.stamp_equals}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1A1A1A] mb-0.5">
                      {t('conditionShort', {
                        count: milestone.stamp_equals,
                      })}
                    </div>
                    <p className="text-[12px] text-[#8A8A8A] leading-[1.4] truncate">
                      {preview}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#8A8A8A] group-hover:text-[var(--accent)] transition-colors"
                      aria-hidden
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(milestone);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingDelete(milestone);
                        }
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#8A8A8A] hover:bg-white hover:text-[var(--error)] transition-colors"
                      aria-label="Delete"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isAtLimit && (
          <InfoBox
            variant="note"
            className="mt-3"
            message={t('limitReached')}
          />
        )}
      </div>

      <MilestoneCreateSheet
        open={sheetOpen}
        onClose={closeSheet}
        milestone={editingMilestone}
        totalStamps={totalStamps}
        programName={programName}
        rewardNameSet={rewardNameSet}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '...' : t('deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
