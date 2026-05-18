'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle, InfoIcon, MegaphoneIcon, Spinner } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDefaultProgram } from '@/hooks/use-programs';
import { createBroadcast, estimateRecipients, getBroadcast } from '@/api/notifications';
import type { Broadcast } from '@/types/notification';
import { MessagePreview } from '@/components/notifications/MessagePreview';
import { Card } from '@/components/ui/card';
import { InfoBox } from '@/components/reusables/info-box';
import { useWizardStep, useWizardDraft } from '../../wizard-context';
import {
  getBusinessTypeDefaults,
  PROFILE_BUSINESS_TYPE_DRAFT_KEY,
} from '../../businessTypeDefaults';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * First-broadcast compose — optional. Minimal inline broadcast composer:
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
export function ComposeStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-broadcast.steps.compose');
  const tErr = useTranslations('onboardingBusiness.errors');
  const tDef = useTranslations('onboardingBusiness.defaults');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusinessSettings } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const businessName = currentBusiness?.name ?? '';
  const { data: program } = useDefaultProgram(businessId);
  // iOS surfaces the pass's `organizationName` (filled by the program name on
  // the backend) as the push title, so the broadcast title also defaults to
  // the program name — keeps wizard preview and real customer experience
  // aligned. Falls back to the business name while the program query is
  // loading so the placeholder never blinks empty.
  const programName = program?.name ?? '';
  // Step-2 smart defaults — sample broadcast tailored to the business type.
  // Read the draft first; ProfileStep writes the chip selection synchronously
  // and the settings cache lags behind the background save.
  const draftedBusinessType = ctx.getDraft<string>(PROFILE_BUSINESS_TYPE_DRAFT_KEY);
  const bizDefaults = getBusinessTypeDefaults(
    draftedBusinessType || currentBusiness?.settings?.business_type
  );
  const defaultBody = tDef(bizDefaults.broadcastBodyKey);

  // Draft-backed so the message survives navigating back to the intro and
  // forward again (or to/from any other step) without retyping. Body is
  // prefilled with the sample so the owner can send straight away without
  // staring at an empty textarea.
  // setTitle currently unused — the title input is commented out (iOS pulls
  // the push title from the pass's organizationName). Kept the draft hook so
  // any owner who had typed a title pre-removal still sees it as the
  // effectiveTitle fallback. Re-add setter if the field comes back.
  const [title] = useWizardDraft<string>('first-broadcast.title', () => '');
  const [body, setBody] = useWizardDraft<string>('first-broadcast.body', () => defaultBody);
  const [reachable, setReachable] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(
    () => currentBusiness?.settings?.first_broadcast_sent === true
  );
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Broadcast | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveTitle = title.trim() || programName || businessName;
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
        // Diff-only update — see DataCollectionStep for the race rationale.
        await updateBusinessSettings({
          settings: {
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
    if (reachable !== null) return t('sendCta', { count: reachable });
    return t('sendCta', { count: 1 });
  }, [sent, sending, reachable, t]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 animate-slide-up">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <Card hover={false} className="p-5 flex flex-col gap-4 animate-slide-up delay-80">
        {/* Compose-body intro disappears once the broadcast lands — the user
            has already lived the experience the copy described, so leaving
            it visible is redundant. */}
        {!sent && (
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
              <MegaphoneIcon className="w-5 h-5 text-[var(--accent)]" weight="bold" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="wiz-helper text-[#7A7A7A] leading-relaxed">{t('composeBody')}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Title field hidden — iOS pulls the push title from the pass's
              organizationName (program name) anyway, so editing it here was
              cosmetic and added an extra input the owner had to think about.
              `effectiveTitle` below still falls back to programName/businessName.
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-3">
              <label htmlFor="bc-title" className="wiz-body-sm font-medium text-[var(--foreground)]">
                {t('titleLabel')}
              </label>
              <input
                id="bc-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={programName || businessName || t('titlePlaceholder')}
                disabled={sent}
                className="h-11 rounded-[10px] border border-[var(--border)] bg-white px-3 wiz-body outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60"
              />
            </div>
            <p className="wiz-micro text-[#999]">{t('titleHint')}</p>
          </div>
          */}

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-3">
              <label htmlFor="bc-body" className="wiz-body-sm font-medium text-[var(--foreground)]">
                {t('bodyLabel')}
              </label>
              <textarea
                id="bc-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={defaultBody}
                disabled={sent}
                rows={3}
                maxLength={200}
                className="rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 wiz-body leading-snug outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60 resize-none"
              />
            </div>
            <p className="wiz-micro text-[#999]">{t('bodyHint', { remaining: 200 - body.length })}</p>
          </div>
        </div>

        <MessagePreview
          iconUrl={currentBusiness?.icon_url ?? null}
          iconOriginalUrl={currentBusiness?.icon_original_url ?? null}
          programName={effectiveTitle}
          businessName={businessName}
          body={body || defaultBody}
          size="lg"
        />

        {/* Recipients line — only meaningful before send. After send the
            DeliveryStatus block carries the same information in its own
            success/failure phrasing. */}
        {!sent && (
          <div className="flex items-start gap-2 rounded-[10px] border border-[var(--accent-200)] bg-[var(--accent-light)]/40 px-3 py-2.5 wiz-helper">
            <InfoIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" weight="fill" />
            <span className="text-[var(--foreground)] leading-snug">
              {reachable === null ? t('estimating') : t('recipientsLine', { count: reachable })}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={sent || sending || !bodyValid || reachable === 0}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 py-3 wiz-body font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[56px]"
        >
          {sent && <CheckCircle className="w-4 h-4" weight="fill" />}
          {buttonLabel}
        </button>

        {sent && delivery && <DeliveryStatus delivery={delivery} t={t} />}
      </Card>
    </div>
  );
}

interface DeliveryStatusProps {
  delivery: Broadcast;
  t: ReturnType<typeof useTranslations>;
}

function DeliveryStatus({ delivery, t }: DeliveryStatusProps) {
  const inFlight =
    delivery.status === 'draft' ||
    delivery.status === 'scheduled' ||
    delivery.status === 'sending';
  const failed = delivery.status === 'failed' || delivery.status === 'cancelled';
  const delivered = delivery.apple_delivered + delivery.google_delivered;

  if (inFlight) {
    return (
      <InfoBox
        variant="info"
        icon={
          <Spinner className="w-4 h-4 text-[var(--info)] animate-spin" weight="bold" />
        }
        message={t('sendingProgress')}
      />
    );
  }

  if (failed) {
    return <InfoBox variant="error" message={t('sendFailed')} />;
  }

  return (
    <InfoBox
      variant="success"
      title={t('deliveredTitle', { count: delivered })}
      message={t('deliveredHint', {
        count: delivered,
        delivered,
        skipped: delivery.skipped_no_push,
        total: delivery.total_recipients,
      })}
    />
  );
}

