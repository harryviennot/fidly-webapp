'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BellIcon, LightningIcon } from '@phosphor-icons/react';
import { PageHeader } from '@/components/redesign';
import { LoadingSpinner } from '@/components/reusables/loading-spinner';
import { InfoBox } from '@/components/reusables/info-box';
import {
  IconUploadCard,
  TriggerCard,
  PhonePreview,
} from '@/components/notifications';
import { useNotificationTemplates } from '@/hooks/use-notifications';
import { useBusiness } from '@/contexts/business-context';
import type { TriggerType } from '@/types/notification';

export default function ProgramNotificationsPage() {
  const t = useTranslations('notifications');
  const uiLocale = useLocale() as 'en' | 'fr';
  const { currentBusiness } = useBusiness();
  const { data, isLoading, error } = useNotificationTemplates(
    currentBusiness?.id
  );

  const templates = useMemo(() => data?.items ?? [], [data]);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | null>(
    null
  );

  const activeTemplate =
    templates.find((tpl) => tpl.trigger === selectedTrigger) ?? templates[0];

  const previewBody =
    activeTemplate?.body[uiLocale] || activeTemplate?.body.en || '';

  // Interpolate mock values so the preview feels alive
  const renderedPreview = previewBody
    .replace(/\{\{stamp_count\}\}/g, '3')
    .replace(/\{\{total_stamps\}\}/g, '10')
    .replace(/\{\{stamps_left\}\}/g, '7')
    .replace(/\{\{reward_name\}\}/g, 'Free Coffee')
    .replace(/\{\{business_name\}\}/g, currentBusiness?.name ?? '')
    .replace(/\{\{customer_first_name\}\}/g, 'Sarah');

  return (
    <div
      className="flex flex-col gap-[14px] animate-slide-up"
      style={{ animationDelay: '150ms' }}
    >
      <PageHeader title={t('page.title')} subtitle={t('page.subtitle')} />

      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        {/* ─── Left column ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Notification icon — read-only preview, canonical upload in /settings */}
          <IconUploadCard readOnly />

          {/* Automated messages — list of trigger rows */}
          <div
            className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
            style={{ animationDelay: '80ms' }}
          >
            <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
              {t('triggers.sectionTitle')}
            </div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">
              {t('triggers.sectionDescription')}
            </div>

            {isLoading && <LoadingSpinner />}

            {error && (
              <InfoBox
                variant="error"
                icon={<BellIcon className="h-4 w-4" />}
                message={
                  error instanceof Error
                    ? error.message
                    : 'Failed to load templates'
                }
              />
            )}

            {!isLoading && !error && templates.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {templates.map((template) => (
                  <TriggerCard
                    key={template.trigger}
                    template={template}
                    readOnly
                    selected={template.trigger === activeTemplate?.trigger}
                    onSelect={setSelectedTrigger}
                  />
                ))}
              </div>
            )}

            {!isLoading && !error && templates.length === 0 && (
              <div className="rounded-[10px] border border-dashed border-[var(--border-light)] px-5 py-8 text-center">
                <BellIcon className="mx-auto h-6 w-6 text-[#A0A0A0] mb-2" />
                <p className="text-[12px] text-[#A0A0A0]">
                  No notification templates yet.
                </p>
              </div>
            )}

            {/* Plan gate notice for Starter */}
            {!isLoading && !error && templates.length > 0 && !activeTemplate?.is_editable && (
              <InfoBox
                variant="note"
                className="mt-4"
                message={t('plan.starterReadOnly')}
              />
            )}
          </div>
        </div>

        {/* ─── Right column — sticky preview ────────────────────── */}
        <div
          className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col animate-slide-up"
          style={{ animationDelay: '350ms' }}
        >
          <div className="min-[1080px]:sticky min-[1080px]:top-5 flex flex-col gap-[14px]">
            {/* Phone preview */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px]">
              <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wide mb-3.5">
                {t('preview.title')}
              </div>

              {activeTemplate ? (
                <PhonePreview
                  iconUrl={currentBusiness?.icon_url ?? null}
                  businessName={currentBusiness?.name ?? ''}
                  body={renderedPreview}
                />
              ) : (
                <div className="flex items-center justify-center h-[320px] rounded-xl bg-[var(--muted)] border border-dashed border-[var(--border-dark)]">
                  <p className="text-[11px] text-[#A5A5A5]">
                    {t('preview.description')}
                  </p>
                </div>
              )}

              {activeTemplate && (
                <p className="text-[11px] text-[#8A8A8A] mt-3 text-center leading-[1.4]">
                  {t(`triggers.${activeTemplate.trigger}.description`)}
                </p>
              )}
            </div>

            {/* How it works */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
                  <LightningIcon
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    weight="fill"
                  />
                </div>
                <div className="text-[13px] font-semibold text-[#1A1A1A]">
                  {t('howItWorks.title')}
                </div>
              </div>

              <ol className="space-y-2">
                {[
                  t('howItWorks.step1'),
                  t('howItWorks.step2'),
                  t('howItWorks.step3'),
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--paper)] border border-[var(--border-light)] flex items-center justify-center text-[10px] font-bold text-[#8A8A8A] mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[12px] text-[#555] leading-[1.45]">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-3.5 pt-3 border-t border-[var(--border-light)]">
                <p className="text-[11px] text-[#8A8A8A] leading-[1.45]">
                  {t('howItWorks.note')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
