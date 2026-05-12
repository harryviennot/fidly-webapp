'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle, MegaphoneIcon, Spinner, Users } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { createBroadcast, estimateRecipients, getBroadcast } from '@/api/notifications';
import type { Broadcast } from '@/types/notification';
import { useWizardStep } from '../../wizard-context';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Chapter 9 — optional. Minimal inline broadcast composer:
 *  - one body textarea (title defaults to the business name)
 *  - a live recipient count (everyone with an installed card)
 *  - a single "Send now" button that calls `createBroadcast` with
 *    `immediate: true, target_filter: { all: true }` — backend enqueues
 *    the worker and the push goes out to every customer with a wallet.
 *
 * No segmentation, no scheduling — those live on the dashboard composer.
 * The wizard step exists to let owners feel what a broadcast does, not
 * to ship campaigns.
 */
export function FirstBroadcastStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-broadcast');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusinessSettings } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const businessName = currentBusiness?.name ?? '';

  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [reachable, setReachable] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(
    () => currentBusiness?.settings?.first_broadcast_sent === true
  );
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Broadcast | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveTitle = title.trim() || businessName;
  const bodyValid = body.trim().length > 0;

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    estimateRecipients(businessId, { all: true })
      .then((res) => {
        if (cancelled) return;
        setReachable(res.total);
      })
      .catch(() => { /* leave null */ });
    return () => { cancelled = true; };
  }, [businessId]);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  const handleSend = useCallback(async () => {
    if (!businessId || !bodyValid || sending) return;
    setSending(true);
    try {
      const created = await createBroadcast(businessId, {
        title: effectiveTitle,
        body: body.trim(),
        target_filter: { all: true },
        immediate: true,
      });
      setBroadcastId(created.id);
      setDelivery(created);
      if (currentBusiness) {
        await updateBusinessSettings({
          settings: {
            ...(currentBusiness.settings ?? {}),
            first_broadcast_sent: true,
          },
        });
      }
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    } finally {
      setSending(false);
    }
  }, [businessId, bodyValid, sending, effectiveTitle, body, currentBusiness, updateBusinessSettings, tErr]);

  // Once sent, poll the broadcast every 2s until status="sent" or we hit
  // the timeout. The worker pipeline goes scheduled → sending → sent and
  // populates `apple_delivered` / `skipped_no_push` along the way.
  useEffect(() => {
    if (!businessId || !broadcastId) return;
    if (delivery?.status === 'sent' || delivery?.status === 'failed') return;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const latest = await getBroadcast(businessId, broadcastId);
        if (cancelled) return;
        setDelivery(latest);
        if (latest.status === 'sent' || latest.status === 'failed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } catch {
        // ignore; retry next tick
      }
      if (Date.now() > deadline && pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    pollTimerRef.current = setInterval(tick, POLL_INTERVAL_MS);
    void tick();
    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [businessId, broadcastId, delivery?.status]);

  const buttonLabel = useMemo(() => {
    if (sent) return t('sentLabel');
    if (sending) return t('sendingLabel');
    if (reachable === 0) return t('noRecipientsLabel');
    if (reachable && reachable > 0) return t('sendToCountCta', { count: reachable });
    return t('sendCta');
  }, [sent, sending, reachable, t]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
            <MegaphoneIcon className="w-5 h-5 text-[var(--accent)]" weight="bold" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[var(--foreground)]">{t('composeTitle')}</p>
            <p className="text-[12.5px] text-[#7A7A7A] leading-relaxed mt-0.5">{t('composeBody')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bc-title" className="text-[12px] font-medium text-[#555]">
              {t('titleLabel')}
            </label>
            <input
              id="bc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={businessName || t('titlePlaceholder')}
              disabled={sent}
              className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[14px] outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60"
            />
            <p className="text-[11px] text-[#999]">{t('titleHint')}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bc-body" className="text-[12px] font-medium text-[#555]">
              {t('bodyLabel')}
            </label>
            <textarea
              id="bc-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('bodyPlaceholder')}
              disabled={sent}
              rows={3}
              maxLength={200}
              className="rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 text-[14px] leading-snug outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60 resize-none"
            />
            <p className="text-[11px] text-[#999]">{t('bodyHint', { remaining: 200 - body.length })}</p>
          </div>
        </div>

        <PreviewBubble title={effectiveTitle} body={body || t('bodyPlaceholder')} />

        <div className="flex items-center gap-2 rounded-[10px] bg-[var(--paper)] border border-[var(--border-light)] px-3 py-2 text-[12.5px]">
          <Users className="w-4 h-4 text-[#888] flex-shrink-0" weight="bold" />
          <span className="text-[#555]">
            {reachable === null ? t('estimating') : t('recipientsLine', { count: reachable })}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={sent || sending || !bodyValid || reachable === 0}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[56px]"
        >
          {sent && <CheckCircle className="w-4 h-4" weight="fill" />}
          {buttonLabel}
        </button>

        {sent && delivery && <DeliveryStatus delivery={delivery} t={t} />}
      </div>
    </div>
  );
}

interface DeliveryStatusProps {
  delivery: Broadcast;
  t: ReturnType<typeof useTranslations>;
}

/**
 * Live delivery confirmation. Polls the broadcast status until `sent` so the
 * owner sees the actual `apple_delivered` / `skipped_no_push` counters —
 * concrete confirmation that the backend dispatched the push (vs. relying
 * on iOS to surface a banner, which can be coalesced).
 */
function DeliveryStatus({ delivery, t }: DeliveryStatusProps) {
  const inFlight =
    delivery.status === 'draft' ||
    delivery.status === 'scheduled' ||
    delivery.status === 'sending';
  const failed = delivery.status === 'failed' || delivery.status === 'cancelled';
  const delivered = delivery.apple_delivered + delivery.google_delivered;

  if (inFlight) {
    return (
      <div className="rounded-[10px] border border-[var(--accent-200)] bg-[var(--accent-light)]/40 px-3 py-2.5 flex items-center gap-2">
        <Spinner className="w-4 h-4 text-[var(--accent)] animate-spin flex-shrink-0" weight="bold" />
        <p className="text-[12.5px] text-[var(--foreground)]">{t('sendingProgress')}</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5">
        <p className="text-[12.5px] text-red-800">{t('sendFailed')}</p>
      </div>
    );
  }

  // status === 'sent'
  return (
    <div className="rounded-[10px] border border-green-200 bg-green-50 px-3 py-3 flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold text-green-900 flex items-center gap-1.5">
        <CheckCircle className="w-4 h-4" weight="fill" />
        {t('deliveredTitle', { count: delivered })}
      </p>
      <p className="text-[11.5px] text-green-800 leading-relaxed">
        {t('deliveredHint', {
          delivered,
          skipped: delivery.skipped_no_push,
          total: delivery.total_recipients,
        })}
      </p>
    </div>
  );
}

interface PreviewBubbleProps {
  title: string;
  body: string;
}

/** Tiny lock-screen preview so the owner sees roughly what their customers will get. */
function PreviewBubble({ title, body }: PreviewBubbleProps) {
  return (
    <div className="rounded-[14px] bg-[#1c1c1e]/95 text-white px-4 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Stampeo</p>
      <p className="text-[13px] font-semibold leading-snug mt-0.5 line-clamp-1">{title}</p>
      <p className="text-[12.5px] text-white/85 leading-snug mt-0.5 line-clamp-3 whitespace-pre-wrap">
        {body}
      </p>
    </div>
  );
}
