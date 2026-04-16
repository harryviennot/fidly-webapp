'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  PaperPlaneRightIcon,
  ClockIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useSendBroadcastAgain } from '@/hooks/use-notifications';
import { ApiError } from '@/api/client';
import { describeFilter } from '@/lib/broadcast-filters';
import { PlanGatedField } from './PlanGatedField';
import type { Broadcast } from '@/types/notification';

const BROWSER_TIMEZONE =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

/** Common IANA timezone choices. */
const TIMEZONE_OPTIONS = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Brussels',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Montreal',
  'UTC',
] as const;

type SendMode = 'now' | 'schedule';

interface SendAgainDialogProps {
  broadcast: Broadcast | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful send so the caller can close any parent UI. */
  onSuccess?: () => void;
}

/**
 * Modal dialog for re-sending a past broadcast. Shows a recap of the
 * source broadcast (title, body, audience), lets the user pick between
 * "Send now" and "Schedule for later" (Pro only — Growth sees the schedule
 * option greyed out with an upgrade badge), and fires the `send-again`
 * endpoint with the chosen mode. Counters reset to 0 on the new row.
 */
export function SendAgainDialog({
  broadcast,
  onOpenChange,
  onSuccess,
}: Readonly<SendAgainDialogProps>) {
  return (
    <Dialog
      open={!!broadcast}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="sm:max-w-[540px]">
        {broadcast && (
          <DialogBody
            key={broadcast.id}
            broadcast={broadcast}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DialogBodyProps {
  broadcast: Broadcast;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function DialogBody({ broadcast, onOpenChange, onSuccess }: Readonly<DialogBodyProps>) {
  const t = useTranslations('notifications.broadcasts.detail');
  const tSchedule = useTranslations('notifications.broadcasts.wizard.schedule');
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const tToasts = useTranslations('notifications.broadcasts.toasts');

  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const canSchedule = hasFeature('notifications.scheduled');
  const sendAgainMutation = useSendBroadcastAgain(currentBusiness?.id);

  const [mode, setMode] = useState<SendMode>('now');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [selectedTz, setSelectedTz] = useState(BROWSER_TIMEZONE);

  const chipTranslator = (key: string, values?: Record<string, unknown>) =>
    tWizard(key, values as { n: number });
  const chips = useMemo(
    () => describeFilter(broadcast.target_filter, chipTranslator),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [broadcast.target_filter]
  );

  const now = Date.now();
  const scheduleError = useMemo(() => {
    if (mode !== 'schedule') return null;
    if (!scheduledAt) return null;
    if (scheduledAt.getTime() < now) return tSchedule('pastError');
    return null;
  }, [mode, scheduledAt, now, tSchedule]);

  const canConfirm =
    mode === 'now' ||
    (mode === 'schedule' && scheduledAt !== null && scheduleError === null);

  const tErrors = useTranslations('notifications.broadcasts.errors');

  const handleConfirm = async () => {
    try {
      await sendAgainMutation.mutateAsync({
        id: broadcast.id,
        payload:
          mode === 'schedule' && scheduledAt
            ? { scheduled_at: scheduledAt.toISOString(), timezone: selectedTz }
            : {},
      });
      toast.success(
        mode === 'schedule' ? tToasts('scheduled') : tToasts('sentAgain')
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'QUOTA_EXCEEDED') {
        toast.error(tErrors('quotaExceeded'));
      } else {
        toast.error(
          err instanceof Error ? err.message : tToasts('sentAgainFailed')
        );
      }
    }
  };

  const handlePickSchedule = () => {
    if (!canSchedule) return;
    setMode('schedule');
    if (!scheduledAt) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      setScheduledAt(d);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('sendAgainTitle')}</DialogTitle>
        <DialogDescription>{t('sendAgainBody')}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Recap: title + body snippet + audience chips */}
        <section className="rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] px-3.5 py-3">
          <div className="text-[13px] font-semibold text-[#1A1A1A] mb-1 truncate">
            {broadcast.title || t('title')}
          </div>
          <p className="text-[12px] text-[#555] leading-[1.5] mb-2 line-clamp-3 whitespace-pre-wrap">
            {broadcast.body}
          </p>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chips.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="outline"
                  className="text-[10px]"
                >
                  {chip.label}
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Mode picker — same two-card layout as wizard schedule step */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('now')}
            className={cn(
              'w-full p-3 rounded-[10px] text-left border-[1.5px] transition-all',
              mode === 'now'
                ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <PaperPlaneRightIcon
                className="h-4 w-4 text-[var(--accent)]"
                weight="fill"
              />
              <span className="text-[12px] font-semibold text-[#1A1A1A]">
                {tSchedule('sendNow')}
              </span>
            </div>
            <p className="text-[10px] text-[#8A8A8A] leading-[1.4]">
              {tSchedule('sendNowDescription')}
            </p>
          </button>

          <PlanGatedField
            requiredTier="pro"
            upgradeFrom="broadcasts.scheduled"
            gatedTitle={tSchedule('scheduleLater')}
            gatedDescription={tSchedule('scheduleLaterDescription')}
          >
            <button
              type="button"
              onClick={handlePickSchedule}
              disabled={!canSchedule}
              className={cn(
                'w-full p-3 rounded-[10px] text-left border-[1.5px] transition-all',
                mode === 'schedule'
                  ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                  : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon
                  className="h-4 w-4 text-[var(--accent)]"
                  weight="fill"
                />
                <span className="text-[12px] font-semibold text-[#1A1A1A]">
                  {tSchedule('scheduleLater')}
                </span>
              </div>
              <p className="text-[10px] text-[#8A8A8A] leading-[1.4]">
                {tSchedule('scheduleLaterDescription')}
              </p>
            </button>
          </PlanGatedField>
        </div>

        {mode === 'schedule' && canSchedule && (
          <div className="space-y-2">
            <DateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">
                {tSchedule('timezoneLabel')}
              </span>
              <Select value={selectedTz} onValueChange={setSelectedTz}>
                <SelectTrigger className="w-[200px] !py-1.5 !rounded-md text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-xs">
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                  {!TIMEZONE_OPTIONS.includes(
                    selectedTz as (typeof TIMEZONE_OPTIONS)[number]
                  ) && (
                    <SelectItem value={selectedTz} className="text-xs">
                      {selectedTz.replace(/_/g, ' ')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {scheduleError && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--warning)]">
                <WarningIcon className="h-3.5 w-3.5" weight="fill" />
                {scheduleError}
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={sendAgainMutation.isPending}
        >
          {tWizard('cancel')}
        </Button>
        <Button
          variant="gradient"
          size="sm"
          onClick={handleConfirm}
          disabled={sendAgainMutation.isPending || !canConfirm}
        >
          {mode === 'schedule'
            ? t('sendAgainSchedule')
            : t('sendAgainNow')}
        </Button>
      </DialogFooter>
    </>
  );
}
