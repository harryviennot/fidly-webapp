'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BellIcon,
  LightningIcon,
  BracketsCurlyIcon,
  CrownIcon,
} from '@phosphor-icons/react';
import { PageHeader } from '@/components/redesign';
import {
  EmptyState,
  InfoBox,
  InfoCard,
  NumberedSteps,
  DividerNote,
  UpsellInline,
} from '@/components/reusables';
import {
  IconUploadCard,
  TriggerCard,
  TriggerEditSheet,
  TriggerListSkeleton,
  MilestoneSection,
  VariablesList,
} from '@/components/notifications';
import { toast } from 'sonner';
import {
  useNotificationTemplates,
  useUpdateNotificationTemplate,
} from '@/hooks/use-notifications';
import { useBusiness } from '@/contexts/business-context';
import { isStampProgram, isPointsProgram } from '@/types';
import { useProgram } from '../layout';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  programVariableKeys,
  PRO_ONLY_VARIABLES,
  type Locale,
  type VariableKey,
} from '@/lib/template-variables';
import type { NotificationTemplate, TriggerType } from '@/types/notification';

// Fallback sample values for the available-variables card when no real
// program data is available. Kept in sync with the ones used in inline
// previews (see `template-variables.ts#renderSamplePreview`).
const VARIABLE_FALLBACKS: Record<Locale, Record<VariableKey, string>> = {
  en: {
    stamp_count: '3',
    total_stamps: '10',
    stamps_left: '7',
    rewards_count: '1',
    reward_name: 'Free coffee',
    business_name: 'Your business',
    customer_first_name: 'Sarah',
    store_location: 'Westside',
    points_balance: '120',
    points_to_next: '80',
    next_reward_points: '200',
    next_reward_name: 'Free coffee',
    last_reward_name: 'Free coffee',
  },
  fr: {
    stamp_count: '3',
    total_stamps: '10',
    stamps_left: '7',
    rewards_count: '1',
    reward_name: 'Café offert',
    business_name: 'Votre entreprise',
    customer_first_name: 'Sarah',
    store_location: 'Westside',
    points_balance: '120',
    points_to_next: '80',
    next_reward_points: '200',
    next_reward_name: 'Café offert',
    last_reward_name: 'Café offert',
  },
  es: {
    stamp_count: '3',
    total_stamps: '10',
    stamps_left: '7',
    rewards_count: '1',
    reward_name: 'Café gratis',
    business_name: 'Tu comercio',
    customer_first_name: 'Sara',
    store_location: 'Centro',
    points_balance: '120',
    points_to_next: '80',
    next_reward_points: '200',
    next_reward_name: 'Café gratis',
    last_reward_name: 'Café gratis',
  },
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

  const { hasFeature } = useEntitlements();
  const templates = useMemo(() => data?.items ?? [], [data]);
  const tier = data?.tier;
  const isEditable = templates.some((tpl) => tpl.is_editable);
  // Points notification firing + variables land with backend Phase 9. Until
  // then a points program has no stamp goal — fall back to generic sample
  // values for the variable previews rather than reading a stamp-only field.
  const totalStamps = isStampProgram(program) ? program.config.total_stamps : undefined;
  const programName = program?.name ?? null;
  const rewardNameSet = Boolean(program?.reward_name?.trim());
  const collectName = currentBusiness?.settings?.customer_data_collection?.collect_name;
  const nameCollectionOff = collectName === 'off' || collectName === false;
  const canMultiLocation = hasFeature('locations.multiple');

  // Real-value examples for the variables sidebar — pulls from the active
  // business + program when possible so French accounts see French copy and
  // owners see their own brand name instead of a generic placeholder.
  const variableExamples = useMemo<Record<VariableKey, string>>(() => {
    const fallbacks = VARIABLE_FALLBACKS[uiLocale];
    const stampCountReal =
      typeof totalStamps === 'number' && totalStamps > 0
        ? Math.max(1, Math.floor(totalStamps / 2))
        : Number(fallbacks.stamp_count);
    const totalStampsReal =
      typeof totalStamps === 'number' && totalStamps > 0
        ? totalStamps
        : Number(fallbacks.total_stamps);
    const stampsLeftReal = Math.max(0, totalStampsReal - stampCountReal);
    return {
      ...fallbacks,
      stamp_count: String(stampCountReal),
      total_stamps: String(totalStampsReal),
      stamps_left: String(stampsLeftReal),
      reward_name: program?.reward_name?.trim() || fallbacks.reward_name,
      business_name: currentBusiness?.name?.trim() || fallbacks.business_name,
    };
  }, [uiLocale, totalStamps, program?.reward_name, currentBusiness?.name]);

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

  const editingDefaultBody = editingTemplate?.default_body ?? { en: '', fr: '', es: '' };

  // Side widgets shared between desktop sidebar and mobile collapsibles.
  // Body content is captured once so both placements stay in sync.
  const howItWorksIcon = (
    <LightningIcon className="h-3.5 w-3.5" weight="fill" />
  );
  const howItWorksTitle = t('howItWorks.title');
  const howItWorksBody = (
    <>
      <NumberedSteps
        items={[
          t('howItWorks.step1'),
          t('howItWorks.step2'),
          t('howItWorks.step3'),
        ]}
      />
      <DividerNote>{t('howItWorks.note')}</DividerNote>
    </>
  );

  // Per-variable lock state for the sidebar list. Adding a new lockable
  // variable in the future is just another entry here + matching tooltip
  // i18n key. See components/notifications/VariablesList.tsx.
  const { disabledVars, disabledTooltips, disabledHrefs } = useMemo(() => {
    const disabled = new Set<VariableKey>();
    const tips: Partial<Record<VariableKey, string>> = {};
    const hrefs: Partial<Record<VariableKey, string>> = {};

    // Points programs resolve {{reward_name}} from the reward ladder, so it's
    // never "unset" there; only gate it for stamp programs.
    if (!isPointsProgram(program) && !rewardNameSet) {
      disabled.add('reward_name');
      tips.reward_name = t('editor.rewardNameMissing');
      hrefs.reward_name = '/program/settings';
    }
    if (nameCollectionOff) {
      disabled.add('customer_first_name');
      tips.customer_first_name = t('editor.nameCollectionOff');
      hrefs.customer_first_name = '/program/settings';
    }
    if (!canMultiLocation) {
      for (const key of PRO_ONLY_VARIABLES) {
        disabled.add(key);
        // Per-key tooltip + billing destination. Extend the switch when
        // we add more Pro-only variables in the future.
        if (key === 'store_location') {
          tips[key] = t('editor.storeLocationPro');
          hrefs[key] = '/billing?from=template_var_store_location';
        }
      }
    }

    return { disabledVars: disabled, disabledTooltips: tips, disabledHrefs: hrefs };
  }, [rewardNameSet, nameCollectionOff, canMultiLocation, program, t]);

  // Variables shown in the reference panel. Multi-reward points programs also
  // surface {{last_reward_name}} (the reward just won) alongside
  // {{next_reward_name}} — it's offered on the reward_earned / reward_completed
  // and multi-reward milestone editors.
  const referenceVariables = useMemo(() => {
    const keys = programVariableKeys({
      type: program?.type,
      rewardCount: isPointsProgram(program) ? program.config.rewards.length : 0,
      includeStoreLocation: true,
    });
    if (isPointsProgram(program) && program.config.rewards.length > 1) {
      const idx = keys.indexOf('next_reward_name');
      keys.splice(idx === -1 ? keys.length : idx + 1, 0, 'last_reward_name');
    }
    return keys;
  }, [program]);

  const variablesIcon = (
    <BracketsCurlyIcon className="h-3.5 w-3.5" weight="bold" />
  );
  const variablesTitle = t('variablesReference.title');
  const variablesBody = (
    <>
      <p className="text-[11px] text-[#8A8A8A] leading-[1.45] mb-3">
        {t('variablesReference.description')}
      </p>
      <VariablesList
        variables={referenceVariables}
        examples={variableExamples}
        locale={uiLocale}
        disabledVariables={disabledVars}
        disabledTooltips={disabledTooltips}
        disabledHrefs={disabledHrefs}
      />
    </>
  );

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
            <InfoCard
              icon={howItWorksIcon}
              title={howItWorksTitle}
              subtitle={t('howItWorks.note')}
              collapsible
            >
              {howItWorksBody}
            </InfoCard>
            <InfoCard
              icon={variablesIcon}
              title={variablesTitle}
              subtitle={t('variablesReference.description')}
              collapsible
            >
              {variablesBody}
            </InfoCard>
            {tier === 'growth' && (
              <UpsellInline
                title={t('milestones.proUpsell.title')}
                description={t('milestones.proUpsell.description')}
                features={[
                  t('milestones.proUpsell.features.unlimited'),
                  t('milestones.proUpsell.features.broadcasts'),
                ]}
                ctaLabel={t('milestones.proUpsell.cta')}
                ctaHref="/billing?from=notifications"
              />
            )}
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
              <EmptyState
                icon={<BellIcon className="h-6 w-6" />}
                description="No notification templates yet."
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

          {/* Starter — Growth upsell in place of the milestones section. */}
          {!isLoading && !error && templates.length > 0 && !isEditable && (
            <UpsellInline
              icon={<CrownIcon className="w-5 h-5 text-amber-400" weight="fill" />}
              title={t('growthUpsell.title')}
              description={t('growthUpsell.description')}
              features={[
                t('growthUpsell.features.custom'),
                t('growthUpsell.features.milestones'),
                t('growthUpsell.features.icon'),
              ]}
              ctaLabel={t('growthUpsell.cta')}
              ctaHref="/billing?from=notifications"
              animationDelayMs={120}
            />
          )}
        </div>

        {/* ─── Right column — side widgets (desktop only) ────── */}
        <div
          className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col animate-slide-up"
          style={{ animationDelay: '350ms' }}
        >
          <div className="min-[1080px]:sticky min-[1080px]:top-5 flex flex-col gap-[14px]">
            <InfoCard icon={howItWorksIcon} title={howItWorksTitle}>
              {howItWorksBody}
            </InfoCard>
            <InfoCard icon={variablesIcon} title={variablesTitle}>
              {variablesBody}
            </InfoCard>
            {tier === 'growth' && (
              <UpsellInline
                title={t('milestones.proUpsell.title')}
                description={t('milestones.proUpsell.description')}
                features={[
                  t('milestones.proUpsell.features.unlimited'),
                  t('milestones.proUpsell.features.broadcasts'),
                ]}
                ctaLabel={t('milestones.proUpsell.cta')}
                ctaHref="/billing?from=notifications"
              />
            )}
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

