/**
 * Pure assembly helpers for the conversion wizard: drafted form state →
 * backend payloads (`ConversionPreviewRequest.config`, `ConvertRequest`).
 * No React, no IO — everything here is unit-tested in `assemble.test.ts`.
 */

import { suggestedRate } from '@/lib/conversion';
import { maxBalanceFloor } from '@/lib/points-config';
import {
  extractVariables,
  programVariableKeys,
  triggerVariableKeys,
} from '@/lib/template-variables';
import type {
  ConversionNotificationsPayload,
  ConversionPolicy,
  ConvertRequest,
  LoyaltyType,
  RewardTier,
} from '@/types';

/** Everything the program step drafts for the TARGET program. Both shapes are
 * always present (with defaults) so draft reads never branch; only the fields
 * matching `toType` end up in the payload. */
export interface TargetProgramDraft {
  toType: LoyaltyType;
  // stamp target
  totalStamps: number;
  rewardName: string;
  stackableRewards: boolean;
  maxStackedRewards: number | null;
  initialStamps: number;
  // points target
  pointsRate: number;
  pointsRewards: RewardTier[];
  maxBalance: number | null;
}

/** Target-program config for both the preview and the convert call. */
export function buildTargetConfig(draft: TargetProgramDraft): Record<string, unknown> {
  if (draft.toType === 'points') {
    return {
      points_per_currency_unit: draft.pointsRate,
      rewards: draft.pointsRewards,
      // Never below the priciest reward — the cap would make it unreachable
      // (backend rejects that config; the forms auto-raise the same way).
      max_balance:
        draft.maxBalance === null
          ? null
          : Math.max(draft.maxBalance, maxBalanceFloor(draft.pointsRewards)),
      user_configured: true,
    };
  }
  return {
    total_stamps: draft.totalStamps,
    stackable_rewards: draft.stackableRewards,
    max_stacked_rewards: draft.maxStackedRewards,
    // Defensive clamp: the goal can shrink after the prestamp was drafted.
    initial_stamps: Math.max(0, Math.min(draft.initialStamps, draft.totalStamps - 1)),
    user_configured: true,
  };
}

export function cheapestRewardThreshold(rewards: RewardTier[]): number | null {
  const priced = rewards.filter((r) => r.threshold > 0);
  if (priced.length === 0) return null;
  return Math.min(...priced.map((r) => r.threshold));
}

/** What the current (live) program contributes to the rate suggestion. */
export interface CurrentProgramShape {
  /** Live stamp program's card size (stamps→points direction). */
  totalStamps: number;
  /** Live points program's reward menu (points→stamps direction). */
  pointsRewards: RewardTier[];
}

/**
 * Wizard default for the rate input. Both directions express the rate as
 * "points per stamp": one full stamp card ~= the cheapest priced reward on
 * the points side (whichever side that is). Mirrors the backend suggestion.
 */
export function defaultConversionRate(
  draft: TargetProgramDraft,
  current: CurrentProgramShape
): number {
  if (draft.toType === 'points') {
    return suggestedRate(cheapestRewardThreshold(draft.pointsRewards), current.totalStamps);
  }
  return suggestedRate(cheapestRewardThreshold(current.pointsRewards), draft.totalStamps);
}

export function defaultPolicyFor(toType: LoyaltyType): ConversionPolicy {
  return toType === 'points' ? 'cheapest_reward_equivalent' : 'bank_full_cards';
}

export type StagedLocale = 'en' | 'fr' | 'es';

export interface StagedMilestone {
  value: number;
  metric: 'balance' | 'lifetime';
  /** Per-locale message bodies — same shape as the staged trigger templates. */
  body: Partial<Record<StagedLocale, string>>;
}

/** Per-trigger, per-locale bodies the owner EDITED in the notifications step
 * (untouched defaults are never staged — the backend defaults keep applying). */
export type StagedTemplates = Record<string, Partial<Record<StagedLocale, string>>>;

/**
 * The notification triggers that exist for a program type — a pure mirror of
 * the backend's `triggers_for_type` (reward_completed only exists on
 * multi-reward menus). Used to prune staged copy/toggles that belong to the
 * OTHER type before they reach the convert payload: the backend 422s the
 * whole conversion on a foreign trigger.
 */
export function allowedTriggersForType(
  toType: LoyaltyType,
  rewardCount: number
): Set<string> {
  const triggers = [
    toType === 'points' ? 'points_earned' : 'stamp_added',
    'reward_earned',
    'reward_redeemed',
    'near_reward',
  ];
  if (rewardCount > 1) triggers.push('reward_completed');
  return new Set(triggers);
}

function pickAllowed<T>(record: Record<string, T>, allowed: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => allowed.has(key)));
}

function trimmedBodies(bodies: Partial<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [loc, text] of Object.entries(bodies ?? {})) {
    if (typeof text === 'string' && text.trim()) out[loc] = text.trim();
  }
  return out;
}

/** True when at least one locale carries real copy. */
export function hasMilestoneBody(milestone: StagedMilestone): boolean {
  return Object.keys(trimmedBodies(milestone.body ?? {})).length > 0;
}

/**
 * Drafts written before milestones became multi-locale stored a single string
 * body (keyed by the business's primary locale at send time). Upgrade those
 * on read so a mid-wizard draft survives the shape change.
 */
export function normalizeStagedMilestones(
  raw: unknown,
  fallbackLocale: StagedLocale
): StagedMilestone[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const m = (entry ?? {}) as Record<string, unknown>;
    const body = m.body;
    return {
      value: typeof m.value === 'number' && Number.isFinite(m.value) ? m.value : 0,
      metric: m.metric === 'lifetime' ? 'lifetime' : 'balance',
      body:
        typeof body === 'string'
          ? { [fallbackLocale]: body }
          : ((body ?? {}) as StagedMilestone['body']),
    };
  });
}

/**
 * Staged notification copy, applied server-side AFTER the type flip. Both
 * template and milestone bodies carry every locale the owner wrote;
 * `enabledOverrides` stages on/off toggles (the backend's upsert supports a
 * body-less enable flip). Empty staging returns null so the backend defaults
 * apply untouched.
 */
export function buildNotificationsPayload(
  stagedTemplates: StagedTemplates,
  milestones: StagedMilestone[],
  enabledOverrides: Record<string, boolean> = {}
): ConversionNotificationsPayload | null {
  const payload: ConversionNotificationsPayload = {};

  const templates: NonNullable<ConversionNotificationsPayload['templates']> = [];
  for (const [trigger, bodies] of Object.entries(stagedTemplates)) {
    const body = trimmedBodies(bodies ?? {});
    if (Object.keys(body).length === 0) continue;
    templates.push(
      trigger in enabledOverrides
        ? { trigger, body, is_enabled: enabledOverrides[trigger] }
        : { trigger, body }
    );
  }
  for (const [trigger, enabled] of Object.entries(enabledOverrides)) {
    if (templates.some((t) => t.trigger === trigger)) continue;
    templates.push({ trigger, is_enabled: enabled });
  }
  if (templates.length > 0) payload.templates = templates;

  const staged = milestones
    .filter((m) => m.value > 0 && hasMilestoneBody(m))
    .map((m) => ({ value: m.value, metric: m.metric, body: trimmedBodies(m.body) }));
  if (staged.length > 0) payload.milestones = staged;

  if (!payload.templates && !payload.milestones) return null;
  return payload;
}

/**
 * Which {{variables}} referenced in the staged bodies do NOT exist for the
 * target program type (e.g. `{{stamp_count}}` staged for a points program).
 * The wizard surfaces these as a warning; the backend would render them raw.
 */
export function staleVariableKeys(
  bodies: string[],
  toType: LoyaltyType,
  rewardCount: number
): string[] {
  const allowed = new Set<string>(programVariableKeys({ type: toType, rewardCount }));
  const stale: string[] = [];
  for (const body of bodies) {
    for (const key of extractVariables(body ?? '')) {
      if (!allowed.has(key) && !stale.includes(key)) stale.push(key);
    }
  }
  return stale;
}

/**
 * Per-trigger variant of {@link staleVariableKeys} for the staged template
 * bodies: each trigger allows its OWN variable set (e.g. `last_reward_name`
 * exists on the reward triggers but not in the generic program set), so a
 * chip the step itself offered is never flagged as stale.
 */
export function staleTemplateVariableKeys(
  staged: StagedTemplates,
  toType: LoyaltyType,
  rewardCount: number
): string[] {
  const stale: string[] = [];
  for (const [trigger, bodies] of Object.entries(staged)) {
    const allowed = new Set<string>(
      triggerVariableKeys({ type: toType, rewardCount, trigger })
    );
    for (const text of Object.values(bodies ?? {})) {
      for (const key of extractVariables(text ?? '')) {
        if (!allowed.has(key) && !stale.includes(key)) stale.push(key);
      }
    }
  }
  return stale;
}

export interface BuildConvertRequestArgs {
  draft: TargetProgramDraft;
  designId: string;
  rate: number;
  policy: ConversionPolicy;
  stagedTemplates: StagedTemplates;
  milestones: StagedMilestone[];
  /** Per-trigger on/off toggles staged in the notifications step. */
  enabledOverrides?: Record<string, boolean>;
  announceEnabled: boolean;
  announceMessages: Record<string, string>;
}

/** The full ConvertRequest fired by the execute step. */
export function buildConvertRequest(args: BuildConvertRequestArgs): ConvertRequest {
  const {
    draft, designId, rate, policy,
    stagedTemplates, milestones, enabledOverrides, announceEnabled, announceMessages,
  } = args;

  let announce: ConvertRequest['announce'] = null;
  if (announceEnabled) {
    const messages: Record<string, string> = {};
    for (const [loc, message] of Object.entries(announceMessages)) {
      if (message.trim()) messages[loc] = message.trim();
    }
    announce = { enabled: true, messages };
  }

  // Staged entries for triggers the target type doesn't have (stale drafts,
  // or a step that listed the wrong type's triggers) would 422 the whole
  // conversion — drop them here, unconditionally.
  const allowed = allowedTriggersForType(
    draft.toType,
    draft.toType === 'points' ? Math.max(1, draft.pointsRewards.length) : 1
  );

  return {
    to_type: draft.toType,
    rate,
    policy,
    design_id: designId,
    config: buildTargetConfig(draft),
    reward_name: draft.toType === 'points' ? null : draft.rewardName.trim() || null,
    notifications: buildNotificationsPayload(
      pickAllowed(stagedTemplates, allowed),
      milestones,
      pickAllowed(enabledOverrides ?? {}, allowed)
    ),
    announce,
  };
}
