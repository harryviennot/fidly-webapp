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
  ChartBarIcon,
  MegaphoneIcon,
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
import { useProgram } from '../../app/(dashboard)/program/layout';
import {
  useCancelBroadcast,
  useSendBroadcast,
} from '@/hooks/use-notifications';
import { describeFilter } from '@/lib/broadcast-filters';
import { AnimatedNumber } from '@/components/redesign/animated-number';
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
  const { program } = useProgram();
  const programName = program?.name ?? null;
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
        <div className="mb-2">
          <BroadcastStatusBadge status={broadcast.status} />
        </div>
        <SheetTitle className="text-left text-[19px] leading-tight">
          {broadcast.title || '—'}
        </SheetTitle>
        <SheetDescription className="text-left text-[12px] text-[#8A8A8A] mt-1">
          {broadcast.sent_at ? (
            <>
              {t('detail.sentAt')}{' '}
              <span className="text-[#1A1A1A] font-medium">
                {formatDate(broadcast.sent_at)}
              </span>
            </>
          ) : broadcast.scheduled_at ? (
            <>
              {t('detail.scheduledFor')}{' '}
              <span className="text-[#1A1A1A] font-medium">
                {formatDate(broadcast.scheduled_at)}
              </span>
            </>
          ) : (
            <>
              {t('detail.createdAt')}{' '}
              <span className="text-[#1A1A1A] font-medium">
                {formatDate(broadcast.created_at)}
              </span>
            </>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-6">
        {/* Message + preview */}
        <section>
          <SectionHeader
            icon={<MegaphoneIcon className="h-3.5 w-3.5" weight="fill" />}
            label={t('detail.body')}
          />
          <div className="rounded-[12px] border border-[var(--border-light)] bg-[var(--paper)] p-4">
            <p className="text-[13px] text-[#1A1A1A] leading-[1.5] mb-3 whitespace-pre-wrap">
              {broadcast.body}
            </p>
            <div className="flex justify-center">
              <MessagePreview
                iconUrl={currentBusiness?.icon_url ?? null}
                programName={programName}
                businessName={currentBusiness?.name ?? ''}
                body={broadcast.body}
              />
            </div>
          </div>
        </section>

        {/* Audience chips */}
        <section>
          <SectionHeader
            icon={<UsersIcon className="h-3.5 w-3.5" weight="fill" />}
            label={t('detail.audience')}
          />
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Badge
                key={chip.key}
                variant="outline"
                className="rounded-full bg-[var(--paper)] border border-[var(--border-light)] px-2.5 py-1 text-[11.5px] font-medium text-[#555]"
              >
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

function SectionHeader({
  icon,
  label,
}: Readonly<{ icon: React.ReactNode; label: string }>) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-6 h-6 shrink-0 rounded-md bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center">
        {icon}
      </div>
      <div className="text-[13px] font-semibold text-[#1A1A1A]">{label}</div>
    </div>
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
        <SectionHeader
          icon={<ChartBarIcon className="h-3.5 w-3.5" weight="fill" />}
          label={t('stats')}
        />
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

  const statBoxes: StatBoxSpec[] = [];
  if (broadcast.failed > 0) {
    statBoxes.push({
      key: 'failed',
      icon: <WarningIcon className="h-3.5 w-3.5" weight="fill" />,
      label: t('failed'),
      value: broadcast.failed,
      hint: t('failedHint'),
      tone: 'error',
    });
  }
  if (broadcast.skipped_no_push > 0) {
    statBoxes.push({
      key: 'skipped',
      icon: <UsersIcon className="h-3.5 w-3.5" />,
      label: t('notReachable'),
      value: broadcast.skipped_no_push,
      hint: t('notReachableBody', { count: broadcast.skipped_no_push }),
      tone: 'default',
    });
  }
  if (broadcast.google_not_installed > 0) {
    statBoxes.push({
      key: 'not_installed',
      icon: <XCircleIcon className="h-3.5 w-3.5" />,
      label: t('passRemoved'),
      value: broadcast.google_not_installed,
      hint: t('passRemovedHint'),
      tone: 'default',
    });
  }
  if (broadcast.google_throttled > 0) {
    statBoxes.push({
      key: 'throttled',
      icon: <ClockIcon className="h-3.5 w-3.5" />,
      label: t('google'),
      value: broadcast.google_throttled,
      hint: t('throttledHint'),
      tone: 'warning',
    });
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        icon={<ChartBarIcon className="h-3.5 w-3.5" weight="fill" />}
        label={t('stats')}
      />

      {/* Headline: delivery rate over reachable — one clean number, caption below */}
      <div className="rounded-[12px] border border-[var(--border-light)] bg-[var(--paper)] px-4 py-4">
        <div className="flex items-baseline gap-1.5">
          <AnimatedNumber
            value={deliveryRate}
            suffix="%"
            className="text-[32px] font-bold tabular-nums text-[var(--success)] leading-none"
          />
          <div className="text-[12px] text-[#8A8A8A] flex items-center gap-1">
            {t('deliveryRate', { rate: '' }).replace('%', '').trim()}
            <InfoTooltip content={t('deliveredHint')} />
          </div>
        </div>
        <div className="mt-1.5 text-[11.5px] text-[#8A8A8A] tabular-nums flex items-center gap-1">
          <span>
            {delivered} / {reachable} {t('reachable').toLowerCase()}
            {total !== reachable ? ` · ${total} ${t('totalSendsShort')}` : ''}
          </span>
          <InfoTooltip content={t('reachableHint')} />
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[var(--border-light)] overflow-hidden">
          <div
            className="h-full bg-[var(--success)] transition-all duration-700"
            style={{ width: `${deliveryRate}%` }}
          />
        </div>
      </div>

      {/* Per-provider split — only when at least one provider had a failure. */}
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

      {/* Detail boxes — one tile per non-zero bucket, hover for tooltip. */}
      {statBoxes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statBoxes.map((box) => (
            <StatBox key={box.key} spec={box} />
          ))}
        </div>
      )}
    </section>
  );
}

interface StatBoxSpec {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: 'default' | 'warning' | 'error';
}

function StatBox({ spec }: Readonly<{ spec: StatBoxSpec }>) {
  const toneRing =
    spec.tone === 'error'
      ? 'text-[var(--error)] bg-[var(--error)]/10'
      : spec.tone === 'warning'
      ? 'text-[var(--warning)] bg-[var(--warning)]/10'
      : 'text-[#666] bg-[var(--border-light)]';
  const toneValue =
    spec.tone === 'error'
      ? 'text-[var(--error)]'
      : spec.tone === 'warning'
      ? 'text-[var(--warning)]'
      : 'text-[#1A1A1A]';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex-1 min-w-[120px] cursor-help rounded-[12px] border border-[var(--border-light)] bg-[var(--paper)] px-3 py-2.5 flex items-center gap-2.5 transition-colors hover:bg-[var(--paper-hover)]">
          <div
            className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${toneRing}`}
          >
            {spec.icon}
          </div>
          <div className="min-w-0">
            <AnimatedNumber
              value={spec.value}
              className={`block text-[18px] font-bold tabular-nums leading-none ${toneValue}`}
            />
            <div className="mt-0.5 text-[10.5px] text-[#8A8A8A] truncate">
              {spec.label}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] text-[11px] leading-[1.4]"
      >
        {spec.hint}
      </TooltipContent>
    </Tooltip>
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
