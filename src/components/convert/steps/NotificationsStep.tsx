'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowCounterClockwiseIcon,
  BellIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CoinsIcon,
  CrownIcon,
  FlagIcon,
  GiftIcon,
  PlusIcon,
  SpinnerGapIcon,
  TargetIcon,
  TrashIcon,
  TrophyIcon,
  type Icon,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { NumberField } from '@/components/ui/number-field';
import { InfoBox } from '@/components/reusables/info-box';
import { LocaleTabs } from '@/components/notifications/LocaleTabs';
import { VariableChips } from '@/components/notifications/VariableChips';
import { useWizardDraft, useWizardStep } from '@/components/onboarding/wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { getNotificationTemplates } from '@/api/notifications';
import {
  insertVariableAtCursor,
  programVariableKeys,
  triggerVariableKeys,
  type Locale,
} from '@/lib/template-variables';
import { cn } from '@/lib/utils';
import type { ConversionPreview } from '@/types';
import type { NotificationTemplate } from '@/types/notification';
import { useConvertWizard } from '../convert-context';
import {
  normalizeStagedMilestones,
  staleTemplateVariableKeys,
  staleVariableKeys,
  type StagedMilestone,
  type StagedTemplates,
} from '../assemble';
import { readTargetDraft } from '../target-draft';

const LOCALES: Locale[] = ['en', 'fr', 'es'];

/** Same icon per trigger as the notifications page's TriggerCard. */
const TRIGGER_ICONS: Record<string, Icon> = {
  stamp_added: CheckCircleIcon,
  points_earned: CoinsIcon,
  reward_earned: TrophyIcon,
  reward_completed: CrownIcon,
  reward_redeemed: GiftIcon,
  milestone: FlagIcon,
  near_reward: TargetIcon,
};

function asLocale(value: string | undefined | null, fallback: Locale): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : fallback;
}

/**
 * Stage the target-type notification copy, PRE-FILLED with the backend's real
 * defaults (fetched via the templates preview endpoint — the live GET only
 * lists the current type's triggers). Untouched defaults are never staged, so
 * the backend defaults keep applying; only edits ride the convert payload
 * (a pre-flip PUT would be rejected as cross-type). Existing milestones are
 * disabled by the conversion because their thresholds refer to the old unit;
 * the owner can re-author them here.
 *
 * Rendered as one collapsed row per trigger (this step is optional — most
 * owners keep the defaults) with a single textarea behind locale tabs, so the
 * step reads as a checklist instead of a wall of forms.
 */
export function NotificationsStep() {
  const t = useTranslations('conversion.steps.notifications');
  const tNotif = useTranslations('notifications');
  const tLocales = useTranslations('conversion.locales');
  const uiLocale = useLocale() as Locale;
  const ctx = useWizardStep();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { program, toType } = useConvertWizard();

  const draft = readTargetDraft(ctx.getDraft, toType, program);
  const rewardCount = toType === 'points' ? Math.max(1, draft.pointsRewards.length) : 1;
  const preview = ctx.getDraft<ConversionPreview>('customers.preview');
  const disabledMilestones = preview?.milestone_count ?? 0;

  const defaultLocale = asLocale(
    currentBusiness?.primary_locale,
    asLocale(uiLocale, 'en')
  );

  // The target type's real trigger list + default copy (and any dormant custom
  // rows from a previous era of that type, which come back pre-filled).
  const { data: templates, isLoading } = useQuery({
    queryKey: ['conversion-templates-preview', businessId, toType, rewardCount],
    queryFn: () =>
      getNotificationTemplates(businessId!, undefined, {
        previewType: toType,
        previewRewardCount: rewardCount,
      }),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  const [staged, setStaged] = useWizardDraft<StagedTemplates>('notifications.templates', () => ({}));
  const [milestonesRaw, setMilestones] = useWizardDraft<StagedMilestone[]>(
    'notifications.milestones',
    () => []
  );
  // Tolerate drafts written before milestone bodies became per-locale.
  const milestones = useMemo(
    () => normalizeStagedMilestones(milestonesRaw, defaultLocale),
    [milestonesRaw, defaultLocale]
  );
  // Per-trigger on/off overrides — untouched triggers keep the server row's
  // is_enabled, exactly like the notifications editor.
  const [enabledOverrides, setEnabledOverrides] = useWizardDraft<Record<string, boolean>>(
    'notifications.enabled',
    () => ({})
  );

  // This step is optional — the footer is always enabled.
  useEffect(() => {
    ctx.setCanProceed(true);
  }, [ctx]);

  // One trigger open at a time; the locale tab selection is shared so the
  // owner reviewing their FR copy stays on FR while moving between triggers.
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale);

  // Live textarea nodes so variable chips insert at the caret, not at the end.
  const templateRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const milestoneRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  const items = useMemo(
    () => (templates?.items ?? []).filter((i) => i.trigger !== 'milestone'),
    [templates]
  );

  const valueFor = (item: NotificationTemplate, loc: Locale): string => {
    const stagedBody = staged[item.trigger]?.[loc];
    return stagedBody !== undefined ? stagedBody : (item.body?.[loc] ?? '');
  };

  const isEdited = (item: NotificationTemplate): boolean => {
    const bodies = staged[item.trigger];
    if (!bodies) return false;
    return LOCALES.some(
      (loc) => bodies[loc] !== undefined && bodies[loc]?.trim() !== (item.body?.[loc] ?? '').trim()
    );
  };

  const setTemplateBody = (trigger: string, loc: Locale, text: string) => {
    setStaged({ ...staged, [trigger]: { ...(staged[trigger] ?? {}), [loc]: text } });
  };

  const resetTemplate = (trigger: string) => {
    const next = { ...staged };
    delete next[trigger];
    setStaged(next);
  };

  const insertTemplateVariable = (item: NotificationTemplate, variable: string) => {
    const el = templateRefs.current[item.trigger];
    const current = valueFor(item, activeLocale);
    const { text, cursor } = insertVariableAtCursor(
      current,
      el?.selectionStart ?? current.length,
      el?.selectionEnd ?? current.length,
      variable
    );
    setTemplateBody(item.trigger, activeLocale, text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  };

  const updateMilestone = (index: number, patch: Partial<StagedMilestone>) => {
    setMilestones(milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const setMilestoneBody = (index: number, loc: Locale, text: string) => {
    updateMilestone(index, { body: { ...(milestones[index]?.body ?? {}), [loc]: text } });
  };

  const insertMilestoneVariable = (index: number, variable: string) => {
    const el = milestoneRefs.current[index];
    const current = milestones[index]?.body?.[activeLocale] ?? '';
    const { text, cursor } = insertVariableAtCursor(
      current,
      el?.selectionStart ?? current.length,
      el?.selectionEnd ?? current.length,
      variable
    );
    setMilestoneBody(index, activeLocale, text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  };

  const staleVars = useMemo(() => {
    // Templates check against their trigger's own variable set; milestones
    // against the generic program set.
    const fromTemplates = staleTemplateVariableKeys(staged, toType, rewardCount);
    const fromMilestones = staleVariableKeys(
      milestones.flatMap((m) => Object.values(m.body ?? {}).filter((b): b is string => !!b)),
      toType, rewardCount
    );
    return [...new Set([...fromTemplates, ...fromMilestones])];
  }, [staged, milestones, toType, rewardCount]);

  const milestoneVariables = programVariableKeys({ type: toType, rewardCount });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">{t('title')}</h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {disabledMilestones > 0 && (
        <InfoBox variant="warning" message={t('disabledNotice', { count: disabledMilestones })} />
      )}

      {/* Trigger templates — one collapsed row each, pre-filled with the
          target type's real defaults */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-[13px] text-[#7A7A7A]">
          <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" />
          {t('loading')}
        </div>
      )}
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const edited = isEdited(item);
            const enabled = enabledOverrides[item.trigger] ?? item.is_enabled !== false;
            const open = expanded === item.trigger;
            const variables = triggerVariableKeys({
              type: toType,
              rewardCount,
              trigger: item.trigger,
            });
            return (
              <Collapsible
                key={item.trigger}
                open={open}
                onOpenChange={(next) => setExpanded(next ? item.trigger : null)}
              >
                <Card hover={false}>
                  <CardContent className="p-0">
                    {/* Header mirrors the notifications page's TriggerCard:
                        square rounded-lg icon, 3.5 gap, switch that doesn't
                        bubble into the expand click (div role=button — a real
                        <button> can't nest the Switch's button). */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpanded(open ? null : item.trigger)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpanded(open ? null : item.trigger);
                        }
                      }}
                      aria-expanded={open}
                      className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left"
                    >
                      {(() => {
                        const TriggerIcon = TRIGGER_ICONS[item.trigger] ?? BellIcon;
                        return (
                          <span
                            className={cn(
                              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                              enabled ? 'bg-[var(--accent-light)]' : 'bg-[var(--paper-hover)]'
                            )}
                          >
                            <TriggerIcon
                              className={cn(
                                'h-4 w-4',
                                enabled ? 'text-[var(--accent)]' : 'text-[#A0A0A0]'
                              )}
                              weight="fill"
                            />
                          </span>
                        );
                      })()}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'flex items-center gap-2 text-[14px] font-semibold',
                            enabled ? 'text-[var(--foreground)]' : 'text-[#8A8A8A]'
                          )}
                        >
                          {tNotif(`triggers.${item.trigger}.name`)}
                          {edited && (
                            <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                              {t('editedTag')}
                            </span>
                          )}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 truncate text-[12px] leading-[1.4]',
                            enabled ? 'text-[#8A8A8A]' : 'text-[#A0A0A0] line-through'
                          )}
                        >
                          {valueFor(item, defaultLocale) ||
                            tNotif(`triggers.${item.trigger}.description`)}
                        </p>
                      </div>
                      <span
                        className="inline-flex flex-shrink-0"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Switch
                          checked={enabled}
                          onCheckedChange={(next) =>
                            setEnabledOverrides({ ...enabledOverrides, [item.trigger]: next })
                          }
                          aria-label={tNotif('editor.enabled')}
                        />
                      </span>
                      <CaretDownIcon
                        className={cn(
                          'h-4 w-4 flex-shrink-0 text-[#999] transition-transform duration-200',
                          open && 'rotate-180'
                        )}
                        weight="bold"
                      />
                    </div>

                    <CollapsibleContent className="collapsible-content">
                      <div className="flex flex-col gap-3 border-t border-[var(--border-light)] p-4 min-[768px]:px-5">
                        <p className="text-[12px] leading-[1.5] text-[#8A8A8A]">
                          {tNotif(`triggers.${item.trigger}.description`)}
                        </p>
                        <LocaleTabs
                          value={activeLocale}
                          onValueChange={setActiveLocale}
                          primaryLocale={defaultLocale}
                        />

                        <Textarea
                          ref={(el) => {
                            templateRefs.current[item.trigger] = el;
                          }}
                          aria-label={`${tNotif(`triggers.${item.trigger}.name`)} — ${tLocales(activeLocale)}`}
                          value={valueFor(item, activeLocale)}
                          onChange={(e) => setTemplateBody(item.trigger, activeLocale, e.target.value)}
                          rows={2}
                        />

                        <div className="flex flex-wrap items-start justify-between gap-3">
                          {variables.length > 0 && (
                            <VariableChips
                              className="min-w-0 flex-1"
                              variables={variables}
                              locale={uiLocale}
                              onInsert={(variable) => insertTemplateVariable(item, variable)}
                            />
                          )}
                          {edited && (
                            <button
                              type="button"
                              onClick={() => resetTemplate(item.trigger)}
                              className="ml-auto flex flex-shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#7A7A7A] transition-colors hover:text-[var(--accent)]"
                            >
                              <ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />
                              {t('reset')}
                            </button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Milestones */}
      <div>
        <p className="text-[13px] font-medium text-[var(--foreground)]">{t('milestones.title')}</p>
        <p className="mt-0.5 mb-2 text-[12px] leading-[1.5] text-[#8A8A8A]">
          {t('milestones.help')}
        </p>
        <div className="flex flex-col gap-3">
          {milestones.map((milestone, index) => (
            <Card key={index} hover={false} flat>
              <CardContent className="flex flex-col gap-3 p-3.5">
                {/* Value + metric share the same label style and control
                    height so the two blocks read as one aligned row. */}
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-[var(--foreground)]">
                      {toType === 'points'
                        ? t('milestones.valueToPoints')
                        : t('milestones.valueToStamp')}
                    </span>
                    <NumberField
                      value={milestone.value}
                      onChange={(next) => {
                        const n = parseInt(next, 10);
                        updateMilestone(index, { value: Number.isNaN(n) ? 0 : n });
                      }}
                      min={1}
                      step={1}
                      className="w-32"
                      aria-label={
                        toType === 'points'
                          ? t('milestones.valueToPoints')
                          : t('milestones.valueToStamp')
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-[var(--foreground)]">
                      {t('milestones.metricLabel')}
                    </span>
                    <div className="flex h-11 overflow-hidden rounded-xl border border-[var(--border)]">
                      {(['balance', 'lifetime'] as const).map((metric) => (
                        <button
                          key={metric}
                          type="button"
                          onClick={() => updateMilestone(index, { metric })}
                          className={cn(
                            'flex items-center px-3 text-[12px] font-medium transition-colors',
                            milestone.metric === metric
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--card)] text-[#7A7A7A] hover:bg-[var(--paper)]'
                          )}
                        >
                          {metric === 'balance'
                            ? t('milestones.metricBalance')
                            : t('milestones.metricLifetime')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMilestones(milestones.filter((_, i) => i !== index))}
                    className="ml-auto mt-6 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] text-[#999] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    aria-label={t('milestones.remove')}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <LocaleTabs
                  value={activeLocale}
                  onValueChange={setActiveLocale}
                  primaryLocale={defaultLocale}
                />
                <Textarea
                  ref={(el) => {
                    milestoneRefs.current[index] = el;
                  }}
                  value={milestone.body?.[activeLocale] ?? ''}
                  onChange={(e) => setMilestoneBody(index, activeLocale, e.target.value)}
                  placeholder={t('milestones.bodyPlaceholder')}
                  rows={2}
                />
                {milestoneVariables.length > 0 && (
                  <VariableChips
                    variables={milestoneVariables}
                    locale={uiLocale}
                    onInsert={(variable) => insertMilestoneVariable(index, variable)}
                  />
                )}
              </CardContent>
            </Card>
          ))}
          <button
            type="button"
            onClick={() =>
              setMilestones([
                ...milestones,
                { value: toType === 'points' ? 100 : 5, metric: 'balance', body: {} },
              ])
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-[13px] font-medium text-[#7A7A7A] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <PlusIcon className="h-4 w-4" weight="bold" />
            {t('milestones.add')}
          </button>
        </div>
      </div>

      {staleVars.length > 0 && (
        <InfoBox
          variant="warning"
          message={t('staleVars', { vars: staleVars.map((v) => `{{${v}}}`).join(', ') })}
        />
      )}
    </div>
  );
}
