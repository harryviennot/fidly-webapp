'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  CheckCircle,
  Trophy,
  Gift,
  Flag,
  Target,
  Pencil,
  type Icon,
} from '@phosphor-icons/react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  VARIABLE_PATTERN,
  getVariableDisplayName,
  type Locale,
} from '@/lib/template-variables';
import type { NotificationTemplate, TriggerType } from '@/types/notification';

const TRIGGER_ICONS: Record<TriggerType, Icon> = {
  stamp_added: CheckCircle,
  reward_earned: Trophy,
  reward_redeemed: Gift,
  milestone: Flag,
  near_reward: Target,
};

interface TriggerCardProps {
  template: NotificationTemplate;
  /** When true, the edit action is hidden (Phase 1). */
  readOnly?: boolean;
  /** Whether this row is currently selected (preview shows it). */
  selected?: boolean;
  onSelect?: (trigger: TriggerType) => void;
  onEdit?: (trigger: TriggerType) => void;
  /** Inline opt-out toggle. When omitted the switch is not rendered. */
  onToggleEnabled?: (trigger: TriggerType, enabled: boolean) => void;
  /** Disable the inline switch while an update is in flight. */
  isTogglePending?: boolean;
  className?: string;
}

/**
 * Row item for a notification template.
 *
 * Bordered row — designed to live inside a bigger "Automated messages"
 * wrapper card, mirroring the pattern used in program/settings Data Collection.
 */
export function TriggerCard({
  template,
  readOnly = true,
  selected = false,
  onSelect,
  onEdit,
  onToggleEnabled,
  isTogglePending = false,
  className,
}: TriggerCardProps) {
  const t = useTranslations('notifications');
  const uiLocale = useLocale() as Locale;
  const IconComponent = TRIGGER_ICONS[template.trigger];

  // Rewrite `{{canonical_key}}` to `{{localized_name}}` so the inline preview
  // on the Messages automatiques card matches what the user sees in the
  // editor. Canonical keys are what the backend stores.
  const rawBody = template.body[uiLocale] || template.body.en || '';
  const previewBody = rawBody.replace(
    VARIABLE_PATTERN,
    (_match, key: string) => `{{${getVariableDisplayName(key, uiLocale)}}}`
  );
  const hasEn = Boolean(template.body.en);
  const hasFr = Boolean(template.body.fr);
  const isDisabled = template.is_enabled === false;

  // Pill priority: disabled wins over customized/default so the user sees
  // the opt-out state at a glance.
  let statusPill: string;
  if (isDisabled) {
    statusPill = t('card.disabledPill');
  } else if (template.is_customized) {
    statusPill = t('card.customPill');
  } else {
    statusPill = t('card.defaultPill');
  }

  const handleClick = () => {
    onSelect?.(template.trigger);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(template.trigger);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(template.trigger);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onEdit?.(template.trigger);
    }
  };

  return (
    <div
      role="button"
      tabIndex={onSelect ? 0 : -1}
      onClick={onSelect ? handleClick : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      className={cn(
        'w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] border-[1.5px] transition-all duration-150',
        onSelect && 'cursor-pointer',
        selected
          ? 'border-[var(--accent)] bg-[var(--accent-light)]'
          : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]',
        isDisabled && 'opacity-60 hover:opacity-100',
        className
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
          selected
            ? 'bg-white'
            : isDisabled
              ? 'bg-[var(--paper-hover)]'
              : 'bg-[var(--accent-light)]'
        )}
      >
        <IconComponent
          className={cn(
            'h-4 w-4',
            isDisabled ? 'text-[#A0A0A0]' : 'text-[var(--accent)]'
          )}
          weight="fill"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={cn(
              'text-[14px] font-semibold truncate',
              isDisabled ? 'text-[#8A8A8A]' : 'text-[#1A1A1A]'
            )}
          >
            {t(`triggers.${template.trigger}.name`)}
          </span>
          <span
            className={cn(
              'text-[9px] font-bold px-1.5 py-px rounded tracking-wide uppercase',
              isDisabled
                ? 'bg-[var(--paper-hover)] text-[#8A8A8A]'
                : template.is_customized
                  ? 'bg-[var(--success-light)] text-[var(--success)]'
                  : 'bg-[var(--paper-hover)] text-[#A0A0A0]'
            )}
          >
            {statusPill}
          </span>
        </div>
        <p
          className={cn(
            'text-[12px] leading-[1.4] truncate',
            isDisabled ? 'text-[#A0A0A0] line-through' : 'text-[#8A8A8A]'
          )}
        >
          {previewBody || t(`triggers.${template.trigger}.description`)}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {hasEn && (
          <span className="inline-flex items-center rounded border border-[var(--border-light)] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#8A8A8A]">
            {t('localePills.enSet')}
          </span>
        )}
        {hasFr && (
          <span className="inline-flex items-center rounded border border-[var(--border-light)] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#8A8A8A]">
            {t('localePills.frSet')}
          </span>
        )}
        {onToggleEnabled && (
          // Wrapping span catches the pointer event so Radix's button
          // click doesn't bubble to the card's onClick (which would also
          // open the edit sheet). onPointerDown is enough for Radix.
          <span
            className="ml-1 inline-flex"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={template.is_enabled !== false}
              disabled={isTogglePending}
              onCheckedChange={(next) =>
                onToggleEnabled(template.trigger, next)
              }
              aria-label={t('editor.enabled')}
            />
          </span>
        )}
        {!readOnly && onEdit && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleEditClick}
            onKeyDown={handleEditKeyDown}
            className="ml-1 w-7 h-7 rounded-md flex items-center justify-center text-[#8A8A8A] hover:bg-white hover:text-[var(--accent)] transition-colors cursor-pointer"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
