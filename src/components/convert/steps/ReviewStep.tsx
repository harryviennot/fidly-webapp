'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EyeIcon } from '@phosphor-icons/react';
import { EditorCard } from '@/components/card/EditorCard';
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
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { LocaleTabs } from '@/components/notifications/LocaleTabs';
import { useWizardDraft, useWizardStep } from '@/components/onboarding/wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns } from '@/hooks/use-designs';
import { currencySymbol } from '@/lib/currency';
import { entryToBackPassField } from '@/lib/business-info-utils';
import { defaultPointsSampleBalance } from '@/lib/card-utils';
import type { BusinessInfoEntry } from '@/types/business';
import type { ConversionPolicy, ConversionPreview } from '@/types';
import { useConvertWizard } from '../convert-context';
import { currentProgramShape, readTargetDraft } from '../target-draft';
import {
  defaultConversionRate,
  defaultPolicyFor,
  hasMilestoneBody,
  normalizeStagedMilestones,
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
 * Laid out like the onboarding recap: the new card (front/back flip) sits on
 * the left on desktop and on top on mobile, the facts on the other side.
 * Still nothing committed — the execute step (next) fires the convert call
 * from the same drafts this step summarizes.
 */
export function ReviewStep() {
  const t = useTranslations('conversion.steps.review');
  const tIntro = useTranslations('conversion.steps.intro.current');
  const tPolicies = useTranslations('conversion.steps.customers.policies');
  const tLocales = useTranslations('conversion.locales');
  const tLp = useTranslations('loyaltyProgram');
  const tDesign = useTranslations('designEditor.editor');
  const tCardInfo = useTranslations('settings.cardInfo.types');
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
  const primaryLocale = ((): AnnounceLocale => {
    const loc = currentBusiness?.primary_locale;
    return ANNOUNCE_LOCALES.includes(loc as AnnounceLocale) ? (loc as AnnounceLocale) : 'fr';
  })();
  const milestones = normalizeStagedMilestones(
    ctx.getDraft<StagedMilestone[]>('notifications.milestones') ?? [],
    primaryLocale
  ).filter((m) => m.value > 0 && hasMilestoneBody(m));

  // Announcing the switch on customers' cards is ON by default — a silent
  // re-render is the opt-out, not the norm.
  const [announceEnabled, setAnnounceEnabled] = useWizardDraft<boolean>(
    'review.announceEnabled',
    () => true
  );
  const [announceMessages, setAnnounceMessages] = useWizardDraft<Record<string, string>>(
    'review.announceMessages',
    () => defaultAnnounceMessages(toType)
  );
  const [announceLocale, setAnnounceLocale] = useState<AnnounceLocale>(primaryLocale);

  const [showBack, setShowBack] = useState(false);

  const canProceed = !!designId && !!preview && rate > 0;
  useEffect(() => {
    ctx.setCanProceed(canProceed);
  }, [ctx, canProceed]);

  // "Convert my program" is irreversible — intercept the footer CTA with a
  // confirm dialog. The handler blocks the first advance; the dialog's
  // confirm re-runs it with the flag set.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedRef = useRef(false);
  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      if (confirmedRef.current) return { ok: true };
      setConfirmOpen(true);
      return { ok: false };
    });
    return () => ctx.setSubmitHandler(null);
  }, [ctx]);

  const currency = currencySymbol(currentBusiness?.country, currentBusiness?.primary_locale);

  // Same back-face merge as the onboarding recap: card-specific back_fields
  // first, then the business-info entries this card doesn't hide.
  const backDesign = design
    ? (() => {
        const businessInfo =
          (currentBusiness?.settings?.business_info as BusinessInfoEntry[]) || [];
        const hiddenKeys = new Set(design.hidden_business_info_keys ?? []);
        const businessBackFields = businessInfo
          .filter((entry) => !hiddenKeys.has(entry.key))
          .map((entry) => entryToBackPassField(entry, tCardInfo));
        return {
          ...design,
          back_fields: [...(design.back_fields ?? []), ...businessBackFields],
        };
      })()
    : null;

  const cardProps =
    toType === 'points'
      ? {
          pointsRewards: draft.pointsRewards,
          pointsBalance: defaultPointsSampleBalance(draft.pointsRewards),
        }
      : {
          totalStamps: draft.totalStamps,
          previewStamps: Math.max(1, Math.floor(draft.totalStamps * 0.3)),
        };

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
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">{t('title')}</h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-8 min-[1024px]:flex-row min-[1024px]:items-start">
        {/* The new card — front/back flip, sticky beside the facts on desktop */}
        {design && (
          <div className="flex flex-col items-center gap-3 min-[1024px]:sticky min-[1024px]:top-8 min-[1024px]:w-[340px] min-[1024px]:flex-shrink-0">
            <div className="w-full max-w-[280px] card-flip-container">
              <div className={`card-flip-inner ${showBack ? 'flipped' : ''}`}>
                <div className="card-flip-front">
                  <EditorCard design={design} {...cardProps} showBack={false} />
                </div>
                <div className="card-flip-back">
                  <EditorCard design={backDesign ?? design} {...cardProps} showBack />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBack((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#7A7A7A] transition-colors hover:text-[var(--foreground)]"
            >
              <EyeIcon className="h-3.5 w-3.5" weight="bold" />
              {showBack ? tDesign('viewFront') : tDesign('viewBack')}
            </button>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-4">
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
                  <LocaleTabs
                    value={announceLocale}
                    onValueChange={setAnnounceLocale}
                    primaryLocale={primaryLocale}
                  />
                  <Textarea
                    aria-label={`${t('announce.messageLabel')} — ${tLocales(announceLocale)}`}
                    value={announceMessages[announceLocale] ?? ''}
                    onChange={(e) =>
                      setAnnounceMessages({
                        ...announceMessages,
                        [announceLocale]: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirm.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmedRef.current = true;
                setConfirmOpen(false);
                ctx.advance();
              }}
            >
              {t('confirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
