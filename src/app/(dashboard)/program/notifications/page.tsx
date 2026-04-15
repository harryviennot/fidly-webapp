'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  BellIcon,
  LightningIcon,
  BracketsCurlyIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';
import { PageHeader } from '@/components/redesign';
import { InfoBox } from '@/components/reusables/info-box';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  IconUploadCard,
  TriggerCard,
  TriggerEditSheet,
  TriggerListSkeleton,
  MilestoneSection,
} from '@/components/notifications';
import { toast } from 'sonner';
import {
  useNotificationTemplates,
  useUpdateNotificationTemplate,
} from '@/hooks/use-notifications';
import { useBusiness } from '@/contexts/business-context';
import { cn } from '@/lib/utils';
import { useProgram } from '../layout';
import {
  getVariableDisplayName,
  VARIABLE_KEYS,
  type Locale,
  type VariableKey,
} from '@/lib/template-variables';
import type { NotificationTemplate, TriggerType } from '@/types/notification';

// Canonical default bodies per trigger — mirror
// backend/app/services/programs/notification_defaults.py. Passed to the edit
// sheet so "Reset to default" can replay the default copy locally.
const DEFAULT_BODIES: Record<string, { en: string; fr: string }> = {
  stamp_added: {
    en: 'Stamp collected! You have {{stamp_count}} of {{total_stamps}} stamps.',
    fr: 'Tampon collecté ! Vous avez {{stamp_count}} sur {{total_stamps}} tampons.',
  },
  reward_earned: {
    en: 'You unlocked your reward! Come claim it.',
    fr: 'Vous avez débloqué votre récompense ! Venez la récupérer.',
  },
  reward_redeemed: {
    en: 'Reward redeemed. Enjoy!',
    fr: 'Récompense utilisée. Profitez-en !',
  },
};

// Sample values for the available-variables card. Kept in one place so the
// sidebar reference matches what we substitute in live previews.
const VARIABLE_EXAMPLES: Record<VariableKey, string> = {
  stamp_count: '3',
  total_stamps: '10',
  stamps_left: '7',
  reward_name: 'Free Coffee',
  business_name: 'Your business',
  customer_first_name: 'Sarah',
};

export default function ProgramNotificationsPage() {
  const t = useTranslations('notifications');
  const uiLocale = useLocale() as Locale;
  const { currentBusiness } = useBusiness();
  const { program } = useProgram();
  const { data, isLoading, error } = useNotificationTemplates(
    currentBusiness?.id
  );
  const toggleMutation = useUpdateNotificationTemplate(currentBusiness?.id);
  const tToast = useTranslations('notifications.toasts');

  const templates = useMemo(() => data?.items ?? [], [data]);
  const isEditable = templates.some((tpl) => tpl.is_editable);
  const totalStamps = program?.config?.total_stamps;
  const programName = program?.name ?? null;
  const rewardNameSet = Boolean(program?.reward_name?.trim());
  const [editingTemplate, setEditingTemplate] =
    useState<NotificationTemplate | null>(null);

  const handleEdit = (trigger: TriggerType) => {
    const tpl = templates.find((t) => t.trigger === trigger);
    if (tpl) setEditingTemplate(tpl);
  };

  const handleToggleEnabled = async (
    trigger: TriggerType,
    enabled: boolean
  ) => {
    try {
      await toggleMutation.mutateAsync({ trigger, isEnabled: enabled });
      toast.success(enabled ? tToast('enabled') : tToast('disabled'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('saveFailed'));
    }
  };

  const editingDefaultBody = editingTemplate
    ? DEFAULT_BODIES[editingTemplate.trigger] ?? { en: '', fr: '' }
    : { en: '', fr: '' };

  return (
    <div
      className="flex flex-col gap-[14px] animate-slide-up"
      style={{ animationDelay: '150ms' }}
    >
      <PageHeader title={t('page.title')} subtitle={t('page.subtitle')} />

      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        {/* ─── Left column ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          <IconUploadCard readOnly />

          {/* Mobile-only: side widgets collapse above the list, matching
              the broadcasts page pattern. Desktop keeps the sticky column. */}
          <div className="min-[1080px]:hidden flex flex-col gap-[14px]">
            <Collapsible className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <CollapsibleTrigger className="group w-full px-4 py-3 flex items-center gap-2.5 hover:bg-[var(--paper)] transition-colors">
                <div className="w-7 h-7 shrink-0 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
                  <LightningIcon
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    weight="fill"
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] font-semibold text-[#1A1A1A] leading-tight truncate">
                    {t('howItWorks.title')}
                  </div>
                  <div className="text-[11px] text-[#8A8A8A] truncate">
                    {t('howItWorks.note')}
                  </div>
                </div>
                <CaretDownIcon
                  className="h-4 w-4 text-[#8A8A8A] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  weight="bold"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="collapsible-content">
                <div className="px-[18px] pt-3 pb-[18px] border-t border-[var(--border-light)]">
                  <HowItWorksBody />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <CollapsibleTrigger className="group w-full px-4 py-3 flex items-center gap-2.5 hover:bg-[var(--paper)] transition-colors">
                <div className="w-7 h-7 shrink-0 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
                  <BracketsCurlyIcon
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    weight="bold"
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] font-semibold text-[#1A1A1A] leading-tight truncate">
                    {t('variablesReference.title')}
                  </div>
                  <div className="text-[11px] text-[#8A8A8A] truncate">
                    {t('variablesReference.description')}
                  </div>
                </div>
                <CaretDownIcon
                  className="h-4 w-4 text-[#8A8A8A] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  weight="bold"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="collapsible-content">
                <div className="px-[18px] pt-3 pb-[18px] border-t border-[var(--border-light)]">
                  <VariablesReferenceBody
                    uiLocale={uiLocale}
                    rewardNameSet={rewardNameSet}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

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

            {isLoading && <TriggerListSkeleton rows={3} />}

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
                    readOnly={!template.is_editable}
                    onSelect={
                      template.is_editable ? handleEdit : undefined
                    }
                    onEdit={handleEdit}
                    onToggleEnabled={handleToggleEnabled}
                    isTogglePending={toggleMutation.isPending}
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

            {!isLoading && !error && templates.length > 0 && !isEditable && (
              <InfoBox
                variant="note"
                className="mt-4"
                message={t('plan.starterReadOnly')}
              />
            )}
          </div>

          {/* Milestones — only visible on Growth/Pro (backend returns limit=0 for Starter) */}
          {isEditable && (
            <MilestoneSection
              totalStamps={totalStamps}
              programName={programName}
              rewardNameSet={rewardNameSet}
            />
          )}
        </div>

        {/* ─── Right column — side widgets (desktop only) ────── */}
        <div
          className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col animate-slide-up"
          style={{ animationDelay: '350ms' }}
        >
          <div className="min-[1080px]:sticky min-[1080px]:top-5 flex flex-col gap-[14px]">
            <HowItWorksCard />
            <VariablesReferenceCard
              uiLocale={uiLocale}
              rewardNameSet={rewardNameSet}
            />
          </div>
        </div>
      </div>

      <TriggerEditSheet
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        defaultBody={editingDefaultBody}
        programName={programName}
        rewardNameSet={rewardNameSet}
      />
    </div>
  );
}

// ─── How it works — shared by desktop sidebar + mobile collapsible ─────

function HowItWorksCard() {
  const t = useTranslations('notifications');
  return (
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

      <HowItWorksBody />
    </div>
  );
}

function HowItWorksBody() {
  const t = useTranslations('notifications');
  return (
    <>
      <ol className="space-y-2">
        {(
          [
            { key: 'step1', text: t('howItWorks.step1') },
            { key: 'step2', text: t('howItWorks.step2') },
            { key: 'step3', text: t('howItWorks.step3') },
          ] as const
        ).map((step, i) => (
          <li key={step.key} className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--paper)] border border-[var(--border-light)] flex items-center justify-center text-[10px] font-bold text-[#8A8A8A] mt-0.5">
              {i + 1}
            </span>
            <span className="text-[12px] text-[#555] leading-[1.45]">
              {step.text}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3.5 pt-3 border-t border-[var(--border-light)]">
        <p className="text-[11px] text-[#8A8A8A] leading-[1.45]">
          {t('howItWorks.note')}
        </p>
      </div>
    </>
  );
}

// ─── Variables reference — shared by desktop sidebar + mobile collapsible ──

interface VariablesReferenceProps {
  uiLocale: Locale;
  rewardNameSet: boolean;
}

function VariablesReferenceCard({
  uiLocale,
  rewardNameSet,
}: Readonly<VariablesReferenceProps>) {
  const t = useTranslations('notifications');
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
          <BracketsCurlyIcon
            className="h-3.5 w-3.5 text-[var(--accent)]"
            weight="bold"
          />
        </div>
        <div className="text-[13px] font-semibold text-[#1A1A1A]">
          {t('variablesReference.title')}
        </div>
      </div>

      <p className="text-[11px] text-[#8A8A8A] leading-[1.45] mb-3">
        {t('variablesReference.description')}
      </p>

      <VariablesReferenceBody
        uiLocale={uiLocale}
        rewardNameSet={rewardNameSet}
      />
    </div>
  );
}

function VariablesReferenceBody({
  uiLocale,
  rewardNameSet,
}: Readonly<VariablesReferenceProps>) {
  const t = useTranslations('notifications');
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1.5">
      {VARIABLE_KEYS.map((key) => {
        const isDisabled = key === 'reward_name' && !rewardNameSet;
        const rowContent = (
          <>
            <code
              className={cn(
                'text-[11px] font-mono font-bold',
                isDisabled
                  ? 'text-[#A0A0A0] font-semibold'
                  : 'text-[var(--accent)]'
              )}
            >
              {`{{${getVariableDisplayName(key, uiLocale)}}}`}
            </code>
            <span className="text-[10px] text-[#A0A0A0]">
              → {VARIABLE_EXAMPLES[key]}
            </span>
          </>
        );
        const rowClass = cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] border text-left',
          isDisabled
            ? 'bg-[var(--paper)]/40 border-dashed border-[var(--border-light)] opacity-60 hover:opacity-100 cursor-pointer'
            : 'bg-[var(--paper)] border-[var(--border-light)]'
        );
        if (!isDisabled) {
          return (
            <div key={key} className={rowClass}>
              {rowContent}
            </div>
          );
        }
        const rowButton = (
          <button
            type="button"
            className={rowClass}
            onClick={() => router.push('/program/settings')}
          >
            {rowContent}
          </button>
        );
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>{rowButton}</TooltipTrigger>
            <TooltipContent
              side="left"
              className="max-w-[240px] text-[11px] leading-snug"
            >
              {t('editor.rewardNameMissing')}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
