'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useWizardDraft, useWizardStep } from '@/components/onboarding/wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns } from '@/hooks/use-designs';
import { currencySymbol } from '@/lib/currency';
import type { ConversionPolicy, ConversionPreview } from '@/types';
import { useConvertWizard } from '../convert-context';
import { currentProgramShape, readTargetDraft } from '../target-draft';
import {
  defaultConversionRate,
  defaultPolicyFor,
  type StagedMilestone,
  type StagedTemplates,
} from '../assemble';
import {
  ANNOUNCE_LOCALES,
  defaultAnnounceMessages,
  type AnnounceLocale,
} from '../announce-defaults';

function SummaryCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <Card hover={false}>
      <CardContent className="p-4 min-[768px]:p-5">
        <p className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">{title}</p>
        {rows.map(([label, value], i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 py-2"
            style={{
              borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
          >
            <span className="text-[12px] text-[#8A8A8A]">{label}</span>
            <span className="text-[12px] font-semibold text-[var(--foreground)] text-right">
              {value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Everything the conversion will do, in one look, plus the announce toggle.
 * Still nothing committed — the execute step (next) fires the convert call
 * from the same drafts this step summarizes.
 */
export function ReviewStep() {
  const t = useTranslations('conversion.steps.review');
  const tIntro = useTranslations('conversion.steps.intro.current');
  const tPolicies = useTranslations('conversion.steps.customers.policies');
  const tLocales = useTranslations('conversion.locales');
  const tLp = useTranslations('loyaltyProgram');
  const ctx = useWizardStep();
  const { currentBusiness } = useBusiness();
  const { program, toType } = useConvertWizard();
  const { data: designs = [] } = useDesigns(currentBusiness?.id);

  const draft = readTargetDraft(ctx.getDraft, toType, program);
  const designId = ctx.getDraft<string | null>('design.designId') ?? null;
  const design = designId ? designs.find((d) => d.id === designId) ?? null : null;
  // Fall back to the same suggestion the customers step pre-fills — never 0
  // (drafts written before the persist-on-mount fix may lack the key).
  const rate =
    ctx.getDraft<number>('customers.rate') ??
    defaultConversionRate(draft, currentProgramShape(program));
  const policy = ctx.getDraft<ConversionPolicy>('customers.policy') ?? defaultPolicyFor(toType);
  const preview = ctx.getDraft<ConversionPreview>('customers.preview');
  const stagedTemplates = ctx.getDraft<StagedTemplates>('notifications.templates') ?? {};
  const hasCustomCopy = Object.values(stagedTemplates).some((bodies) =>
    Object.values(bodies ?? {}).some((text) => typeof text === 'string' && text.trim())
  );
  const milestones = (ctx.getDraft<StagedMilestone[]>('notifications.milestones') ?? []).filter(
    (m) => m.value > 0 && m.body.trim().length > 0
  );

  const [announceEnabled, setAnnounceEnabled] = useWizardDraft<boolean>(
    'review.announceEnabled',
    () => false
  );
  const [announceMessages, setAnnounceMessages] = useWizardDraft<Record<string, string>>(
    'review.announceMessages',
    () => defaultAnnounceMessages(toType)
  );

  const canProceed = !!designId && !!preview && rate > 0;
  useEffect(() => {
    ctx.setCanProceed(canProceed);
  }, [ctx, canProceed]);

  const currency = currencySymbol(currentBusiness?.country, currentBusiness?.primary_locale);

  // The new card was designed (and previewed) one step earlier — here it is
  // one summary row, not a second preview.
  const programRows: Array<[string, string]> =
    toType === 'points'
      ? [
          [tIntro('type'), tIntro('points')],
          [tIntro('rate', { currency }), `${draft.pointsRate}`],
          [tIntro('rewards'), `${draft.pointsRewards.length}`],
          [t('design.title'), design?.name ?? '—'],
        ]
      : [
          [tIntro('type'), tIntro('stamps')],
          [tIntro('goal'), `${draft.totalStamps}`],
          [tIntro('reward'), draft.rewardName || tLp('rewardFallback')],
          [t('design.title'), design?.name ?? '—'],
        ];

  const conversionRows: Array<[string, string]> = [
    [t('conversion.rate'), t('conversion.rateValue', { rate })],
    [t('conversion.policy'), tPolicies(`${policy}.name`)],
    [t('conversion.customers'), `${preview?.total_enrollments ?? 0}`],
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t('title')}</h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <SummaryCard title={t('program.title')} rows={programRows} />

      <SummaryCard title={t('conversion.title')} rows={conversionRows} />

      {/* Notifications summary */}
      <Card hover={false}>
        <CardContent className="flex flex-col gap-1.5 p-4 min-[768px]:p-5">
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            {t('notifications.title')}
          </p>
          <p className="text-[12.5px] leading-[1.5] text-[#555]">
            {hasCustomCopy ? t('notifications.custom') : t('notifications.defaults')}
          </p>
          {milestones.length > 0 && (
            <p className="text-[12.5px] text-[#555]">
              {t('notifications.milestonesStaged', { count: milestones.length })}
            </p>
          )}
          {(preview?.milestone_count ?? 0) > 0 && (
            <p className="text-[12.5px] text-[#555]">
              {t('notifications.milestonesDisabled', { count: preview?.milestone_count ?? 0 })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Broadcasts summary — only when some get paused */}
      {(preview?.affected_broadcasts?.length ?? 0) > 0 && (
        <Card hover={false}>
          <CardContent className="flex flex-col gap-1.5 p-4 min-[768px]:p-5">
            <p className="text-[13px] font-semibold text-[var(--foreground)]">
              {t('broadcasts.title')}
            </p>
            <p className="text-[12.5px] leading-[1.5] text-[#555]">
              {t('broadcasts.paused', { count: preview?.affected_broadcasts?.length ?? 0 })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Announce toggle */}
      <Card hover={false}>
        <CardContent className="flex flex-col gap-3 p-4 min-[768px]:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-[var(--foreground)]">
                {t('announce.label')}
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-[#8A8A8A]">
                {t('announce.help')}
              </p>
            </div>
            <Switch checked={announceEnabled} onCheckedChange={setAnnounceEnabled} />
          </div>
          {announceEnabled && (
            <div className="flex flex-col gap-3">
              {ANNOUNCE_LOCALES.map((loc: AnnounceLocale) => (
                <div key={loc}>
                  <label
                    className="mb-1 block text-[12px] text-[#8A8A8A]"
                    htmlFor={`announce-${loc}`}
                  >
                    {t('announce.messageLabel')} — {tLocales(loc)}
                  </label>
                  <Textarea
                    id={`announce-${loc}`}
                    value={announceMessages[loc] ?? ''}
                    onChange={(e) =>
                      setAnnounceMessages({ ...announceMessages, [loc]: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
