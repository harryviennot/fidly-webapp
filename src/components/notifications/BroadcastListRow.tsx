'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  CheckCircleIcon,
  WarningIcon,
  ClockIcon,
  UsersIcon,
  DotsThreeVerticalIcon,
  ArrowClockwiseIcon,
  PencilSimpleIcon,
  XCircleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { BroadcastStatusBadge } from './BroadcastStatusBadge';
import { SendAgainDialog } from './SendAgainDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useCancelBroadcast } from '@/hooks/use-notifications';
import type { Broadcast } from '@/types/notification';

interface BroadcastListRowProps {
  broadcast: Broadcast;
  onClick: (broadcast: Broadcast) => void;
  className?: string;
}

/**
 * Single-line row in the broadcasts list. Matches the settings/data-collection
 * row style from program/settings/page.tsx: bordered pill inside the section
 * card, with status-aware secondary line (recipient + delivery counts).
 *
 * Row-level 3-dot menu per status:
 *   - Terminal rows (sent/cancelled/failed) → "Send again" (opens the
 *     SendAgainDialog with content + audience recap + schedule picker)
 *   - Scheduled rows → "Edit" (navigates to the same wizard page as
 *     clicking the content) + "Cancel" (confirmation dialog)
 */
export function BroadcastListRow({
  broadcast,
  onClick,
  className,
}: Readonly<BroadcastListRowProps>) {
  const t = useTranslations('notifications.broadcasts');
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const uiLocale = useLocale();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const cancelMutation = useCancelBroadcast(currentBusiness?.id);

  const [sendAgainOpen, setSendAgainOpen] = useState(false);
  const [confirming, setConfirming] = useState<null | 'cancel' | 'delete'>(
    null
  );

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(uiLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const title = broadcast.title || t('detail.title');
  const isSentLike = broadcast.status === 'sent' || broadcast.status === 'sending';
  const isScheduled = broadcast.status === 'scheduled';
  const isDraft = broadcast.status === 'draft';
  const canSendAgain =
    broadcast.status === 'sent' ||
    broadcast.status === 'cancelled' ||
    broadcast.status === 'failed';
  const hasMenu = canSendAgain || isScheduled || isDraft;

  const handleConfirm = async () => {
    const action = confirming;
    if (!action) return;
    try {
      await cancelMutation.mutateAsync(broadcast.id);
      toast.success(
        action === 'delete' ? t('toasts.deleted') : t('toasts.cancelled')
      );
      setConfirming(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : action === 'delete'
          ? t('toasts.deleteFailed')
          : t('toasts.cancelFailed')
      );
    }
  };

  const handleEdit = () => {
    router.push(`/program/broadcasts/${broadcast.id}/edit`);
  };

  let metaLine: React.ReactNode;
  if (isSentLike) {
    metaLine = (
      <div className="flex items-center gap-3 text-[11px] text-[#8A8A8A]">
        {broadcast.sent_at && <span>{formatDate(broadcast.sent_at)}</span>}
        <span className="flex items-center gap-1">
          <UsersIcon className="h-3 w-3" weight="bold" />
          {t('row.recipients', { count: broadcast.total_recipients ?? 0 })}
        </span>
        {broadcast.delivered > 0 && (
          <span className="flex items-center gap-1 text-[var(--success)]">
            <CheckCircleIcon className="h-3 w-3" weight="fill" />
            {t('row.delivered', { count: broadcast.delivered })}
          </span>
        )}
        {broadcast.failed > 0 && (
          <span className="flex items-center gap-1 text-[var(--error)]">
            <WarningIcon className="h-3 w-3" weight="fill" />
            {t('row.failed', { count: broadcast.failed })}
          </span>
        )}
        {broadcast.google_throttled > 0 && (
          <span className="flex items-center gap-1 text-[var(--warning)]">
            <ClockIcon className="h-3 w-3" weight="fill" />
            {t('row.throttled', { count: broadcast.google_throttled })}
          </span>
        )}
      </div>
    );
  } else if (isScheduled) {
    metaLine = (
      <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A]">
        <ClockIcon className="h-3 w-3" />
        {t('detail.scheduledFor')} {formatDate(broadcast.scheduled_at)}
      </div>
    );
  } else if (isDraft) {
    metaLine = (
      <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A]">
        {t('row.lastEdited', {
          date: formatDate(broadcast.updated_at ?? broadcast.created_at),
        })}
      </div>
    );
  } else {
    metaLine = (
      <div className="text-[11px] text-[#8A8A8A]">
        {formatDate(broadcast.created_at)}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'w-full flex items-center gap-2 px-4 py-3.5 rounded-[10px] border-[1.5px] border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)] transition-all duration-150',
          className
        )}
      >
        <button
          type="button"
          onClick={() => onClick(broadcast)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px] font-semibold text-[#1A1A1A] truncate">
              {title}
            </span>
            <BroadcastStatusBadge status={broadcast.status} />
          </div>
          <p className="text-[12px] text-[#8A8A8A] leading-[1.4] truncate mb-1">
            {broadcast.body}
          </p>
          {metaLine}
        </button>

        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-[#8A8A8A] hover:bg-[var(--border-light)] hover:text-[#1A1A1A] transition-colors"
                aria-label="More actions"
              >
                <DotsThreeVerticalIcon className="h-4 w-4" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canSendAgain && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSendAgainOpen(true);
                  }}
                >
                  <ArrowClockwiseIcon className="h-3.5 w-3.5" />
                  {t('detail.sendAgain')}
                </DropdownMenuItem>
              )}
              {isScheduled && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                  >
                    <PencilSimpleIcon className="h-3.5 w-3.5" />
                    {t('detail.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirming('cancel');
                    }}
                    className="text-[var(--error)] focus:text-[var(--error)] focus:bg-[var(--error)]/10"
                  >
                    <XCircleIcon className="h-3.5 w-3.5" />
                    {t('detail.cancel')}
                  </DropdownMenuItem>
                </>
              )}
              {isDraft && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                  >
                    <PencilSimpleIcon className="h-3.5 w-3.5" />
                    {t('detail.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirming('delete');
                    }}
                    className="text-[var(--error)] focus:text-[var(--error)] focus:bg-[var(--error)]/10"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    {t('detail.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <SendAgainDialog
        broadcast={sendAgainOpen ? broadcast : null}
        onOpenChange={setSendAgainOpen}
      />

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming === 'delete'
                ? t('detail.confirmDelete')
                : t('detail.confirmCancel')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === 'delete'
                ? t('detail.confirmDeleteBody')
                : t('detail.confirmCancelBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              {tWizard('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {confirming === 'delete'
                ? t('detail.delete')
                : t('detail.cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
