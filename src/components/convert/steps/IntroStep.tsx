'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowsClockwiseIcon,
  DeviceMobileIcon,
  PaletteIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import { useLatestConversion } from '@/hooks/use-conversions';
import { useWizardStep } from '@/components/onboarding/wizard-context';
import { currencySymbol } from '@/lib/currency';
import { isPointsProgram, isStampProgram } from '@/types';
import { useConvertWizard } from '../convert-context';
import { pathForConvertStep } from '../registry';

const CHURN_WINDOW_DAYS = 30;

/** What the switch does, the current program at a glance, and the guards:
 * a churn warning under 30 days, a hard block while a push is running. */
export function IntroStep() {
  const t = useTranslations('conversion.steps.intro');
  const tLp = useTranslations('loyaltyProgram');
  const locale = useLocale();
  const router = useRouter();
  const ctx = useWizardStep();
  const { currentBusiness } = useBusiness();
  const { program, toType } = useConvertWizard();
  const { data: latest } = useLatestConversion(currentBusiness?.id, program.id);

  const isPushing = latest?.status === 'pushing';
  const lastFinishedAt = latest?.completed_at ?? latest?.created_at ?? null;
  // Captured once on mount — "recent" only needs day-level precision, and
  // reading the clock during render violates react-hooks/purity.
  const [mountedAt] = useState(() => new Date().getTime());
  const isRecent = useMemo(() => {
    if (!latest || isPushing || !lastFinishedAt) return false;
    const finished = new Date(lastFinishedAt).getTime();
    if (Number.isNaN(finished)) return false;
    return mountedAt - finished < CHURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  }, [latest, isPushing, lastFinishedAt, mountedAt]);

  useEffect(() => {
    ctx.setCanProceed(!isPushing);
  }, [ctx, isPushing]);

  const currency = currencySymbol(currentBusiness?.country, currentBusiness?.primary_locale);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }),
    [locale]
  );

  if (isPushing && latest) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-[22px] font-semibold text-[var(--foreground)]">
            {t('pushing.title')}
          </h2>
          <p className="text-[14px] text-[#7A7A7A]">{t('pushing.body')}</p>
        </header>
        <button
          type="button"
          onClick={() => {
            // Attach the execute step to the in-flight conversion.
            ctx.setDraft('execute.conversionId', latest.id);
            router.push(pathForConvertStep('execute'));
          }}
          className="inline-flex w-fit items-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
        >
          <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" />
          {t('pushing.viewProgress')}
        </button>
      </div>
    );
  }

  const summaryRows: Array<[string, string]> = isStampProgram(program)
    ? [
        [t('current.type'), t('current.stamps')],
        [t('current.goal'), `${program.config.total_stamps ?? 10}`],
        [t('current.reward'), program.reward_name || tLp('rewardFallback')],
      ]
    : [
        [t('current.type'), t('current.points')],
        [
          t('current.rate', { currency }),
          `${isPointsProgram(program) ? program.config.points_per_currency_unit ?? 1 : 1}`,
        ],
        [
          t('current.rewards'),
          `${isPointsProgram(program) ? program.config.rewards?.length ?? 0 : 0}`,
        ],
      ];

  const howItems = [
    { icon: ArrowsClockwiseIcon, text: t('how.inPlace') },
    { icon: DeviceMobileIcon, text: t('how.noRedownload') },
    { icon: PaletteIcon, text: t('how.rerender') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold text-[var(--foreground)]">
          {toType === 'points' ? t('titleToPoints') : t('titleToStamp')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {isRecent && lastFinishedAt && (
        <InfoBox
          variant="warning"
          message={t('churnWarning', { date: dateFormatter.format(new Date(lastFinishedAt)) })}
        />
      )}

      <Card hover={false}>
        <CardContent className="flex flex-col gap-4 p-4 min-[768px]:p-5">
          <p className="text-[13px] font-semibold text-[var(--foreground)]">{t('how.title')}</p>
          <ul className="flex flex-col gap-3">
            {howItems.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)]">
                  <Icon className="h-4 w-4 text-[var(--accent)]" weight="bold" />
                </span>
                <span className="text-[13.5px] leading-[1.5] text-[#555]">{text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card hover={false}>
        <CardContent className="p-4 min-[768px]:p-5">
          <p className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
            {t('current.title')}
          </p>
          {summaryRows.map(([label, value], i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-2"
              style={{
                borderBottom:
                  i < summaryRows.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}
            >
              <span className="text-[12px] text-[#8A8A8A]">{label}</span>
              <span className="text-[12px] font-semibold text-[var(--foreground)]">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
