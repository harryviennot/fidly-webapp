'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { createClient } from '@/utils/supabase/client';
import { ApiError } from '@/api/client';
import { convertProgram, getConversions } from '@/api/programs';
import { useWizardStep } from '@/components/onboarding/wizard-context';
import { useBusiness } from '@/contexts/business-context';
import type { ConversionPolicy, ProgramConversion } from '@/types';
import { useConvertWizard } from '../convert-context';
import {
  buildConvertRequest,
  defaultConversionRate,
  defaultPolicyFor,
  type StagedMilestone,
  type StagedTemplates,
} from '../assemble';
import { defaultAnnounceMessages } from '../announce-defaults';
import { currentProgramShape, readTargetDraft } from '../target-draft';

const POLL_INTERVAL_MS = 3000;

/**
 * Terminal step: fires the convert call once, then watches the
 * program_conversions row live (Supabase realtime + a poll fallback) while the
 * push worker updates every customer's card. Idempotent across refreshes —
 * the created conversion_id is drafted immediately, and a re-fired POST that
 * races an already-committed conversion attaches via the 409 payload.
 */
export function ExecuteStep() {
  const t = useTranslations('conversion.steps.execute');
  const router = useRouter();
  const ctx = useWizardStep();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { program, toType, clearDraft } = useConvertWizard();

  const [conversionId, setConversionId] = useState<string | null>(
    () => ctx.getDraft<string>('execute.conversionId') ?? null
  );
  const [row, setRow] = useState<ProgramConversion | null>(null);
  const [postFailed, setPostFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // Snapshot the drafts we still need AFTER clearDraft() runs on completion.
  const designIdRef = useRef<string | null>(ctx.getDraft<string>('design.designId') ?? null);

  const firedRef = useRef(false);

  // ── Fire the conversion (once) ──────────────────────────────────────────
  useEffect(() => {
    if (!businessId || conversionId || firedRef.current) return;
    firedRef.current = true;

    (async () => {
      try {
        const draft = readTargetDraft(ctx.getDraft, toType, program);
        const request = buildConvertRequest({
          draft,
          designId: designIdRef.current ?? '',
          // Same suggested-rate fallback as the customers/review steps — a
          // draft written before the persist-on-mount fix must never send 0.
          rate:
            ctx.getDraft<number>('customers.rate') ??
            defaultConversionRate(draft, currentProgramShape(program)),
          policy:
            ctx.getDraft<ConversionPolicy>('customers.policy') ?? defaultPolicyFor(draft.toType),
          locale: currentBusiness?.primary_locale ?? 'en',
          stagedTemplates: ctx.getDraft<StagedTemplates>('notifications.templates') ?? {},
          milestones: ctx.getDraft<StagedMilestone[]>('notifications.milestones') ?? [],
          announceEnabled: ctx.getDraft<boolean>('review.announceEnabled') ?? false,
          // The review step PRE-FILLS the announce copy but useWizardDraft only
          // persists on edit — untouched prefills never reach the store. Merge
          // the defaults back in so "toggle on, keep the suggested copy" sends
          // a real banner instead of silently degrading to no-message.
          announceMessages: {
            ...defaultAnnounceMessages(toType),
            ...Object.fromEntries(
              Object.entries(
                ctx.getDraft<Record<string, string>>('review.announceMessages') ?? {}
              ).filter(([, v]) => typeof v === 'string' && v.trim())
            ),
          },
        });
        const result = await convertProgram(businessId, program.id, request);
        ctx.setDraft('execute.conversionId', result.conversion_id);
        setConversionId(result.conversion_id);
      } catch (err) {
        // A concurrent commit (double-click, refresh race) carries the live
        // conversion_id in the 409 payload — attach to it instead of failing.
        if (
          err instanceof ApiError &&
          (err.code === 'TYPE_ALREADY_CONVERTED' || err.code === 'CONVERSION_IN_PROGRESS')
        ) {
          const existing = (err.detail?.conversion_id as string | undefined) ?? null;
          if (existing) {
            ctx.setDraft('execute.conversionId', existing);
            setConversionId(existing);
            return;
          }
          const rows = await getConversions(businessId, program.id, { latest: true }).catch(
            () => []
          );
          if (rows[0]) {
            ctx.setDraft('execute.conversionId', rows[0].id);
            setConversionId(rows[0].id);
            return;
          }
        }
        setPostFailed(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, program.id, conversionId, retryNonce]);

  // ── Watch the conversion row: realtime + poll fallback ──────────────────
  useEffect(() => {
    if (!businessId || !conversionId) return;
    let cancelled = false;

    const load = async () => {
      const rows = await getConversions(businessId, program.id).catch(() => []);
      const match = rows.find((r) => r.id === conversionId) ?? null;
      if (!cancelled && match) setRow(match);
    };
    void load();

    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`conversion-${conversionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'program_conversions',
          filter: `id=eq.${conversionId}`,
        },
        (payload) => {
          const next = payload.new as Partial<ProgramConversion> | null;
          if (!next || cancelled) return;
          setRow((prev) => ({ ...(prev ?? ({} as ProgramConversion)), ...next }) as ProgramConversion);
        }
      )
      .subscribe();

    // Poll fallback — realtime can miss events (channel hiccup, table not in
    // the publication on an older environment); conversions are short-lived
    // so a light poll while unfinished is cheap insurance.
    const interval = setInterval(() => {
      setRow((current) => {
        if (!current || current.status === 'pushing') void load();
        return current;
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [businessId, program.id, conversionId]);

  // ── Finalize on completion (once): caches, draft ────────────────────────
  // The dashboard accent color is deliberately NOT touched — it's set once
  // during onboarding and the owner keeps it across conversions.
  const finalizedRef = useRef(false);
  useEffect(() => {
    if (!row || row.status !== 'completed' || finalizedRef.current) return;
    finalizedRef.current = true;

    // A conversion is a structural event — every cached surface (program,
    // designs, customers, activity, notifications, broadcasts) changed.
    void queryClient.invalidateQueries();
    clearDraft();
  }, [row, queryClient, clearDraft]);

  const retry = useCallback(() => {
    setPostFailed(false);
    firedRef.current = false;
    setRetryNonce((n) => n + 1);
  }, []);

  // ── Render states ────────────────────────────────────────────────────────

  if (postFailed || row?.status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger)]/10">
          <WarningCircleIcon className="h-8 w-8 text-[var(--danger)]" weight="fill" />
        </span>
        <h2 className="text-[20px] font-semibold text-[var(--foreground)]">
          {t('failed.title')}
        </h2>
        <p className="max-w-[400px] text-[13.5px] leading-[1.6] text-[#7A7A7A]">
          {t('failed.body')}
        </p>
        {postFailed && (
          <button
            type="button"
            onClick={retry}
            className="mt-2 inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
          >
            <ArrowsClockwiseIcon className="h-4 w-4" weight="bold" />
            {t('failed.retry')}
          </button>
        )}
      </div>
    );
  }

  if (row?.status === 'completed') {
    const pausedCount = row.paused_broadcast_ids?.length ?? 0;
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
          <CheckCircleIcon className="h-8 w-8 text-[var(--success)]" weight="fill" />
        </span>
        <h2 className="text-[20px] font-semibold text-[var(--foreground)]">
          {row.to_type === 'points' ? t('success.titleToPoints') : t('success.titleToStamp')}
        </h2>
        <p className="text-[13.5px] text-[#7A7A7A]">
          {t('success.converted', { count: row.converted_count })}
        </p>

        <div className="flex w-full max-w-[420px] flex-col gap-2 text-left">
          {pausedCount > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--paper)] p-3.5">
              <p className="text-[12.5px] leading-[1.5] text-[#555]">
                {t('success.broadcasts', { count: pausedCount })}
              </p>
              <button
                type="button"
                onClick={() => router.push('/program/broadcasts')}
                className="mt-1.5 text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
              >
                {t('success.reviewBroadcasts')}
              </button>
            </div>
          )}
          {row.disabled_milestone_count > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--paper)] p-3.5">
              <p className="text-[12.5px] leading-[1.5] text-[#555]">
                {t('success.milestones', { count: row.disabled_milestone_count })}
              </p>
              <button
                type="button"
                onClick={() => router.push('/program/notifications')}
                className="mt-1.5 text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
              >
                {t('success.reviewNotifications')}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-2 rounded-[10px] bg-[var(--accent)] px-6 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
        >
          {t('success.cta')}
        </button>
      </div>
    );
  }

  // Pushing — live progress. Before the row lands we're in the commit phase.
  const pushing = row?.status === 'pushing';
  const total = row?.total_enrollments ?? 0;
  const pushed = row?.pushed_count ?? 0;
  const percent = pushing && total > 0 ? Math.min(100, (pushed / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-light)]">
        <SpinnerGapIcon className="h-8 w-8 animate-spin text-[var(--accent)]" weight="bold" />
      </span>
      <h2 className="text-[20px] font-semibold text-[var(--foreground)]">
        {pushing ? t('pushing') : t('converting')}
      </h2>
      <p className="max-w-[400px] text-[13.5px] leading-[1.6] text-[#7A7A7A]">
        {pushing ? t('pushingBody') : t('convertingBody')}
      </p>
      {pushing && total > 0 && (
        <div className="w-full max-w-[360px]">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--border-light)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] text-[#8A8A8A]">
            {t('pushProgress', { pushed, total })}
          </p>
        </div>
      )}
    </div>
  );
}
