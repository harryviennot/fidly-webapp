'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  CheckCircleIcon,
  WarningIcon,
  ClockIcon,
  UsersIcon,
  PaperPlaneRightIcon,
  TrashIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useCancelBroadcast,
  useSendBroadcast,
} from '@/hooks/use-notifications';
import { describeFilter } from '@/lib/broadcast-filters';
import { BroadcastStatusBadge } from './BroadcastStatusBadge';
import { MessagePreview } from './MessagePreview';
import type { Broadcast } from '@/types/notification';
import { useState } from 'react';

interface BroadcastDetailSheetProps {
  broadcast: Broadcast | null;
  onClose: () => void;
}

/**
 * Side sheet for viewing a broadcast's content + delivery stats.
 *
 * Only renders for non-editable statuses (sent, sending, cancelled, failed).
 * Draft + scheduled rows open the wizard instead — see list page.
 */
export function BroadcastDetailSheet({
  broadcast,
  onClose,
}: Readonly<BroadcastDetailSheetProps>) {
  return (
    <Sheet open={!!broadcast} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[480px] w-full flex flex-col">
        {broadcast && (
          <DetailBody
            key={broadcast.id}
            broadcast={broadcast}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface DetailBodyProps {
  broadcast: Broadcast;
  onClose: () => void;
}

function DetailBody({ broadcast, onClose }: Readonly<DetailBodyProps>) {
  const t = useTranslations('notifications.broadcasts');
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const uiLocale = useLocale();
  const { currentBusiness } = useBusiness();
  const cancelMutation = useCancelBroadcast(currentBusiness?.id);
  const sendMutation = useSendBroadcast(currentBusiness?.id);
  const [confirming, setConfirming] = useState<'cancel' | 'delete' | null>(null);

  const chipTranslator = (key: string, values?: Record<string, unknown>) =>
    tWizard(key, values as { n: number });
  const chips = describeFilter(broadcast.target_filter, chipTranslator);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(uiLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isDraft = broadcast.status === 'draft';
  const isScheduled = broadcast.status === 'scheduled';
  const canCancel = isDraft || isScheduled;
  const canSendNow = isDraft;

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(broadcast.id);
      toast.success(t('toasts.cancelled'));
      setConfirming(null);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toasts.cancelFailed'));
    }
  };

  const handleSendNow = async () => {
    try {
      await sendMutation.mutateAsync(broadcast.id);
      toast.success(t('toasts.sent'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toasts.sendFailed'));
    }
  };

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2 mb-1">
          <BroadcastStatusBadge status={broadcast.status} />
        </div>
        <SheetTitle className="text-left">
          {broadcast.title || '—'}
        </SheetTitle>
        <SheetDescription className="text-left">
          {broadcast.sent_at
            ? `${t('detail.sentAt')} ${formatDate(broadcast.sent_at)}`
            : broadcast.scheduled_at
            ? `${t('detail.scheduledFor')} ${formatDate(broadcast.scheduled_at)}`
            : `${t('detail.createdAt')} ${formatDate(broadcast.created_at)}`}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-5">
        {/* Message + preview */}
        <section>
          <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2">
            {t('detail.body')}
          </div>
          <p className="text-[13px] text-[#1A1A1A] leading-[1.5] mb-3 whitespace-pre-wrap">
            {broadcast.body}
          </p>
          <div className="flex justify-center">
            <MessagePreview
              iconUrl={currentBusiness?.icon_url ?? null}
              businessName={currentBusiness?.name ?? ''}
              body={broadcast.body}
            />
          </div>
        </section>

        {/* Audience chips */}
        <section>
          <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2">
            {t('detail.audience')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Badge key={chip.key} variant="outline" className="text-[11px]">
                {chip.label}
              </Badge>
            ))}
          </div>
        </section>

        {/* Delivery stats */}
        {(broadcast.status === 'sent' ||
          broadcast.status === 'sending' ||
          broadcast.status === 'failed') && (
          <section>
            <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2">
              {t('detail.stats')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatCell
                icon={<UsersIcon className="h-4 w-4" />}
                label={t('row.recipients', { count: broadcast.total_recipients })}
                value={broadcast.total_recipients}
              />
              <StatCell
                icon={<CheckCircleIcon className="h-4 w-4 text-[var(--success)]" weight="fill" />}
                label={t('row.delivered', { count: broadcast.delivered })}
                value={broadcast.delivered}
                highlight="success"
              />
              <StatCell
                icon={<WarningIcon className="h-4 w-4 text-[var(--error)]" weight="fill" />}
                label={t('row.failed', { count: broadcast.failed })}
                value={broadcast.failed}
                highlight={broadcast.failed > 0 ? 'error' : undefined}
              />
            </div>
            {broadcast.google_throttled > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--warning)]">
                <ClockIcon className="h-3 w-3" weight="fill" />
                {t('row.throttled', { count: broadcast.google_throttled })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Action footer — only for actionable statuses */}
      {(canCancel || canSendNow) && (
        <SheetFooter className="border-t border-border pt-4">
          <div className="flex w-full justify-end gap-2">
            {canSendNow && (
              <Button
                variant="gradient"
                size="sm"
                onClick={handleSendNow}
                disabled={sendMutation.isPending}
              >
                <PaperPlaneRightIcon className="h-3.5 w-3.5" />
                {t('detail.sendNow')}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(isDraft ? 'delete' : 'cancel')}
                disabled={cancelMutation.isPending}
              >
                {isDraft ? (
                  <>
                    <TrashIcon className="h-3.5 w-3.5" />
                    {t('detail.delete')}
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-3.5 w-3.5" />
                    {t('detail.cancel')}
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetFooter>
      )}

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
                ? t('starter.description')
                : t('detail.confirmCancel')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              {tWizard('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {confirming === 'delete' ? t('detail.delete') : t('detail.cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface StatCellProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: 'success' | 'error';
}

function StatCell({ icon, value, highlight }: Readonly<StatCellProps>) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-[10px] bg-[var(--paper)] border border-[var(--border-light)]">
      <div className="mb-1">{icon}</div>
      <div
        className={
          highlight === 'success'
            ? 'text-[18px] font-bold text-[var(--success)] tabular-nums'
            : highlight === 'error'
            ? 'text-[18px] font-bold text-[var(--error)] tabular-nums'
            : 'text-[18px] font-bold text-[#1A1A1A] tabular-nums'
        }
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
