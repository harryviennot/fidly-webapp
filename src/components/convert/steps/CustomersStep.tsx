'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { NumberField } from '@/components/ui/number-field';
import { InfoBox } from '@/components/reusables/info-box';
import { useWizardDraft, useWizardStep } from '@/components/onboarding/wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { useDebounce } from '@/hooks/use-debounce';
import { previewConversion } from '@/api/programs';
import { cn } from '@/lib/utils';
import {
  POINTS_TO_STAMPS_POLICIES,
  STAMPS_TO_POINTS_POLICIES,
} from '@/lib/conversion';
import type { ConversionPolicy, ConversionPreview } from '@/types';
import { useConvertWizard } from '../convert-context';
import { buildTargetConfig, defaultConversionRate, defaultPolicyFor } from '../assemble';
import { currentProgramShape, readTargetDraft } from '../target-draft';

/**
 * Rate + policy + live impact. The rate input is owner-editable (pre-filled
 * from the suggested rate); every change re-runs the server preview
 * (debounced) whose numbers are authoritative and stored in the draft — the
 * review step and the conditional broadcasts step read them from there.
 */
export function CustomersStep() {
  const t = useTranslations('conversion.steps.customers');
  const tUnits = useTranslations('conversion.units');
  const ctx = useWizardStep();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { program, toType } = useConvertWizard();

  const draft = readTargetDraft(ctx.getDraft, toType, program);
  const suggested = useMemo(
    () => defaultConversionRate(draft, currentProgramShape(program)),
    // The drafted config is stable while this step is mounted (edited on a
    // previous step), so keying on the primitive inputs is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toType, program.id]
  );

  const [rate, setRate] = useWizardDraft<number>('customers.rate', () => suggested);
  const [policy, setPolicy] = useWizardDraft<ConversionPolicy>('customers.policy', () =>
    defaultPolicyFor(toType)
  );

  // useWizardDraft only persists on EDIT — an owner who keeps the suggested
  // rate/default policy untouched would leave the store empty and the review
  // step (which reads the store, not this component's state) would read
  // rate=0 and block the confirm button. Persist the initial values on mount.
  useEffect(() => {
    if (ctx.getDraft<number>('customers.rate') === undefined) {
      ctx.setDraft('customers.rate', rate);
    }
    if (ctx.getDraft<ConversionPolicy>('customers.policy') === undefined) {
      ctx.setDraft('customers.policy', policy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [preview, setPreviewState] = useState<ConversionPreview | null>(
    () => ctx.getDraft<ConversionPreview>('customers.preview') ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const debouncedRate = useDebounce(rate, 400);

  // Live server preview — debounced on the rate, immediate on policy change.
  useEffect(() => {
    if (!businessId || !(debouncedRate > 0)) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const result = await previewConversion(businessId, program.id, {
          to_type: toType,
          rate: debouncedRate,
          policy,
          config: buildTargetConfig(readTargetDraft(ctx.getDraft, toType, program)),
          reward_name: toType === 'stamp' ? draft.rewardName || null : null,
        });
        if (cancelled) return;
        setPreviewState(result);
        ctx.setDraft('customers.preview', result);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, program.id, toType, debouncedRate, policy]);

  const canProceed = rate > 0 && !!preview && !error;
  useEffect(() => {
    ctx.setCanProceed(canProceed);
  }, [ctx, canProceed]);

  const policies: ConversionPolicy[] =
    toType === 'points' ? STAMPS_TO_POINTS_POLICIES : POINTS_TO_STAMPS_POLICIES;

  const oldUnit = toType === 'points' ? 'stamps' : 'points';
  const newUnit = toType === 'points' ? 'points' : 'stamps';

  const impactTiles: Array<[string, number]> = preview
    ? [
        [t('impact.customers'), preview.total_enrollments],
        [t('impact.affected'), preview.affected_count],
        [t('impact.banked'), preview.banked_holders],
        [t('impact.losers'), preview.losers_count],
        [t('impact.clamped'), preview.clamped_count],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t('title')}</h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {/* Rate */}
      <div>
        <label
          className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]"
          htmlFor="conversion-rate"
        >
          {t('rateLabel')}
        </label>
        <div className="flex items-center gap-2">
          <NumberField
            id="conversion-rate"
            value={rate}
            onChange={(next) => {
              const n = parseFloat(next);
              setRate(Number.isNaN(n) ? 0 : n);
            }}
            min={0.01}
            step={1}
            className="w-40"
            aria-label={t('rateLabel')}
          />
          <span className="text-[13px] text-[#7A7A7A]">{t('rateUnit')}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-[#8A8A8A]">
          {toType === 'points'
            ? t('rateHelpToPoints', { rate })
            : t('rateHelpToStamp', { rate })}
        </p>
        <p className="mt-0.5 text-[12px] text-[#8A8A8A]">
          {t('rateSuggested', { rate: suggested })}
        </p>
      </div>

      {/* Policy */}
      <div>
        <p className="mb-2 text-[13px] font-medium text-[var(--foreground)]">
          {toType === 'points' ? t('policyLabelToPoints') : t('policyLabelToStamp')}
        </p>
        <div className="flex flex-col gap-2" role="radiogroup">
          {policies.map((p) => {
            const selected = policy === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPolicy(p)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent-light)]/40'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[#CCC]'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-[var(--accent)]' : 'border-[#CCC]'
                  )}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-[var(--foreground)]">
                    {t(`policies.${p}.name`)}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-[#7A7A7A]">
                    {t(`policies.${p}.desc`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live impact */}
      {error && <InfoBox variant="error" message={t('previewError')} />}
      {!error && loading && !preview && (
        <div className="flex items-center gap-2 text-[13px] text-[#7A7A7A]">
          <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" />
          {t('loading')}
        </div>
      )}
      {!error && preview && (
        <>
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--foreground)]">
              {t('impact.title')}
              {loading ? (
                <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin text-[#999]" weight="bold" />
              ) : (
                <CheckCircleIcon className="h-3.5 w-3.5 text-[var(--success)]" weight="fill" />
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-5">
              {impactTiles.map(([label, value]) => (
                <Card key={label} hover={false} flat>
                  <CardContent className="flex flex-col gap-0.5 p-3">
                    <span className="text-[18px] font-semibold leading-none text-[var(--foreground)]">
                      {value}
                    </span>
                    <span className="text-[11px] leading-[1.3] text-[#8A8A8A]">{label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {preview.sample.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--foreground)]">
                {t('sample.title')}
              </p>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[480px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[var(--border-light)] bg-[var(--paper)] text-left text-[11px] uppercase tracking-wide text-[#8A8A8A]">
                      <th className="px-3 py-2 font-medium">{t('sample.customer')}</th>
                      <th className="px-3 py-2 font-medium">{t('sample.before')}</th>
                      <th className="px-3 py-2 font-medium">{t('sample.after')}</th>
                      <th className="px-3 py-2 font-medium">{t('sample.banked')}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row) => (
                      <tr
                        key={row.enrollment_id}
                        className="border-b border-[var(--border-light)] last:border-none"
                      >
                        <td className="max-w-[160px] truncate px-3 py-2 font-medium text-[var(--foreground)]">
                          {row.customer_name}
                        </td>
                        <td className="px-3 py-2 text-[#555]">
                          {tUnits(oldUnit, { count: row.value_before })}
                        </td>
                        <td className="px-3 py-2 text-[#555]">
                          {tUnits(newUnit, { count: row.value_after })}
                        </td>
                        <td className="px-3 py-2 text-[#555]">{row.banked_after}</td>
                        <td className="px-3 py-2 text-right">
                          {row.discarded && (
                            <span className="rounded-full bg-[var(--warning)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--warning)]">
                              {t('sample.discardedTag')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
