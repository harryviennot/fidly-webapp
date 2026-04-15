'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  CheckCircleIcon,
  WarningIcon,
  ClockIcon,
  UsersIcon,
  PaperPlaneRightIcon,
  ArrowClockwiseIcon,
  TrashIcon,
  XCircleIcon,
  InfoIcon,
  AppleLogoIcon,
  GoogleLogoIcon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBusiness } from '@/contexts/business-context';
import {
  useCancelBroadcast,
  useSendBroadcast,
} from '@/hooks/use-notifications';
import { describeFilter } from '@/lib/broadcast-filters';
import { BroadcastStatusBadge } from './BroadcastStatusBadge';
import { MessagePreview } from './MessagePreview';
import { SendAgainDialog } from './SendAgainDialog';
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
  const [confirming, setConfirming] = useState<'cancel' | 'delete' | null>(
    null
  );
  const [sendAgainOpen, setSendAgainOpen] = useState(false);

  const chipTranslator = (key: string, values?: Record<string, unknown>) =>
    tWizard(key, values as { n: number });
  const chips = describeFilter(broadcast.target_filter, chipTranslator);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(uiLocale, {
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
  // Re-sending is only offered once the broadcast has reached a terminal
  // state. Drafts go through the regular "send now" flow.
  const canSendAgain =
    broadcast.status === 'sent' ||
    broadcast.status === 'cancelled' ||
    broadcast.status === 'failed';

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
          <DeliveryStats broadcast={broadcast} />
        )}
      </div>

      {/* Action footer */}
      {(canCancel || canSendNow || canSendAgain) && (
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
            {canSendAgain && (
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setSendAgainOpen(true)}
              >
                <ArrowClockwiseIcon className="h-3.5 w-3.5" />
                {t('detail.sendAgain')}
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

      <SendAgainDialog
        broadcast={sendAgainOpen ? broadcast : null}
        onOpenChange={setSendAgainOpen}
        onSuccess={onClose}
      />
    </>
  );
}

function DeliveryStats({ broadcast }: Readonly<{ broadcast: Broadcast }>) {
  const t = useTranslations('notifications.broadcasts.detail');

  // Historical broadcasts sent before the deliverability migration have
  // zero in every new counter. If the broadcast has recipients but the
  // new per-provider counters are all 0, surface "stats unavailable"
  // rather than pretending everything was skipped.
  const hasNewStats =
    broadcast.reachable_recipients > 0 ||
    broadcast.apple_delivered > 0 ||
    broadcast.apple_failed > 0 ||
    broadcast.google_delivered > 0 ||
    broadcast.google_failed > 0 ||
    broadcast.google_not_installed > 0 ||
    broadcast.skipped_no_push > 0;

  if (!hasNewStats && broadcast.total_recipients > 0) {
    return (
      <section>
        <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2">
          {t('stats')}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <LegacyStatCell
            icon={<UsersIcon className="h-4 w-4" />}
            value={broadcast.total_recipients}
          />
          <LegacyStatCell
            icon={
              <CheckCircleIcon
                className="h-4 w-4 text-[var(--success)]"
                weight="fill"
              />
            }
            value={broadcast.delivered}
            highlight="success"
          />
          <LegacyStatCell
            icon={
              <WarningIcon
                className="h-4 w-4 text-[var(--error)]"
                weight="fill"
              />
            }
            value={broadcast.failed}
            highlight={broadcast.failed > 0 ? 'error' : undefined}
          />
        </div>
      </section>
    );
  }

  const total = broadcast.total_recipients;
  const reachable = broadcast.reachable_recipients;
  const delivered = broadcast.delivered;
  const deliveryRate =
    reachable > 0 ? Math.round((delivered / reachable) * 100) : 0;

  return (
    <section className="space-y-4">
      <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider">
        {t('stats')}
      </div>

      {/* Headline: delivery rate over reachable */}
      <div className="rounded-[12px] border border-[var(--border-light)] bg-[var(--paper)] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-1">
            {t('reachable')}
            <InfoTooltip content={t('reachableHint')} />
          </div>
          <div className="text-[12px] font-semibold text-[#1A1A1A] tabular-nums">
            {reachable} / {total}
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <div className="text-[28px] font-bold tabular-nums text-[var(--success)] leading-none">
            {deliveryRate}%
          </div>
          <div className="text-[12px] text-[#8A8A8A] flex items-center gap-1">
            {t('deliveryRate', { rate: '' }).replace('%', '').trim()}
            <InfoTooltip content={t('deliveredHint')} />
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[var(--border-light)] overflow-hidden">
          <div
            className="h-full bg-[var(--success)] transition-all"
            style={{ width: `${deliveryRate}%` }}
          />
        </div>
      </div>

      {/* Per-provider split — only surfaces when at least one provider had a
          failure. Perfect sends just show the 100% headline above. */}
      {(broadcast.apple_failed > 0 || broadcast.google_failed > 0) && (
        <div className="space-y-2">
          {broadcast.apple_delivered + broadcast.apple_failed > 0 && (
            <ProviderRow
              icon={<AppleLogoIcon className="h-3.5 w-3.5" weight="fill" />}
              label={t('apple')}
              delivered={broadcast.apple_delivered}
              failed={broadcast.apple_failed}
            />
          )}
          {broadcast.google_delivered + broadcast.google_failed > 0 && (
            <ProviderRow
              icon={<GoogleLogoIcon className="h-3.5 w-3.5" weight="fill" />}
              label={t('google')}
              delivered={broadcast.google_delivered}
              failed={broadcast.google_failed}
            />
          )}
        </div>
      )}

      {/* Secondary buckets */}
      {(broadcast.failed > 0 ||
        broadcast.skipped_no_push > 0 ||
        broadcast.google_not_installed > 0 ||
        broadcast.google_throttled > 0) && (
        <div className="space-y-1.5">
          {broadcast.failed > 0 && (
            <SecondaryBucket
              icon={<WarningIcon className="h-3.5 w-3.5" weight="fill" />}
              label={t('failed')}
              value={broadcast.failed}
              hint={t('failedHint')}
              tone="error"
            />
          )}
          {broadcast.skipped_no_push > 0 && (
            <SecondaryBucket
              icon={<UsersIcon className="h-3.5 w-3.5" />}
              label={t('notReachable')}
              value={broadcast.skipped_no_push}
              hint={t('notReachableBody', { count: broadcast.skipped_no_push })}
            />
          )}
          {broadcast.google_not_installed > 0 && (
            <SecondaryBucket
              icon={<XCircleIcon className="h-3.5 w-3.5" />}
              label={t('passRemoved')}
              value={broadcast.google_not_installed}
              hint={t('passRemovedHint')}
            />
          )}
          {broadcast.google_throttled > 0 && (
            <SecondaryBucket
              icon={<ClockIcon className="h-3.5 w-3.5" />}
              label={t('google')}
              value={broadcast.google_throttled}
              hint={t('throttledHint')}
              tone="warning"
            />
          )}
        </div>
      )}
    </section>
  );
}

interface ProviderRowProps {
  icon: React.ReactNode;
  label: string;
  delivered: number;
  failed: number;
}

function ProviderRow({
  icon,
  label,
  delivered,
  failed,
}: Readonly<ProviderRowProps>) {
  const attempts = delivered + failed;
  if (attempts === 0) return null;
  const rate = Math.round((delivered / attempts) * 100);
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1A1A1A] w-[100px]">
        {icon}
        {label}
      </div>
      <div className="flex-1 h-1 rounded-full bg-[var(--border-light)] overflow-hidden">
        <div
          className="h-full bg-[var(--success)]"
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="text-[12px] tabular-nums text-[#1A1A1A] font-semibold w-[60px] text-right">
        {delivered} / {attempts}
      </div>
    </div>
  );
}

interface SecondaryBucketProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone?: 'warning' | 'error';
}

function SecondaryBucket({
  icon,
  label,
  value,
  hint,
  tone,
}: Readonly<SecondaryBucketProps>) {
  const colorClass =
    tone === 'error'
      ? 'text-[var(--error)]'
      : tone === 'warning'
      ? 'text-[var(--warning)]'
      : 'text-[#8A8A8A]';
  return (
    <div className={`flex items-center gap-2 text-[11px] ${colorClass}`}>
      {icon}
      <span className="font-semibold tabular-nums">{value}</span>
      <span>· {label}</span>
      <InfoTooltip content={hint} />
    </div>
  );
}

function InfoTooltip({ content }: Readonly<{ content: string }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-[#A0A0A0] hover:text-[#666] transition-colors"
          aria-label="More info"
        >
          <InfoIcon className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] text-[11px] leading-[1.4]"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

interface LegacyStatCellProps {
  icon: React.ReactNode;
  value: number;
  highlight?: 'success' | 'error';
}

function LegacyStatCell({
  icon,
  value,
  highlight,
}: Readonly<LegacyStatCellProps>) {
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
