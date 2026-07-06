/**
 * Pure assembly helpers for the conversion wizard: drafted form state →
 * backend payloads (`ConversionPreviewRequest.config`, `ConvertRequest`).
 * No React, no IO — everything here is unit-tested in `assemble.test.ts`.
 */

import { suggestedRate } from '@/lib/conversion';
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
      max_balance: draft.maxBalance,
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

export interface StagedMilestone {
  value: number;
  metric: 'balance' | 'lifetime';
  body: string;
}

/** Per-trigger, per-locale bodies the owner EDITED in the notifications step
 * (untouched defaults are never staged — the backend defaults keep applying). */
export type StagedTemplates = Record<string, Partial<Record<'en' | 'fr' | 'es', string>>>;

/**
 * Staged notification copy, applied server-side AFTER the type flip. Template
 * bodies carry every locale the owner wrote; milestone bodies are keyed by the
 * business's primary locale (single-textarea editor). Empty staging returns
 * null so the backend defaults apply untouched.
 */
export function buildNotificationsPayload(
  locale: string,
  stagedTemplates: StagedTemplates,
  milestones: StagedMilestone[]
): ConversionNotificationsPayload | null {
  const payload: ConversionNotificationsPayload = {};

  const templates = Object.entries(stagedTemplates)
    .map(([trigger, bodies]) => {
      const body: Record<string, string> = {};
      for (const [loc, text] of Object.entries(bodies ?? {})) {
        if (typeof text === 'string' && text.trim()) body[loc] = text.trim();
      }
      return { trigger, body };
    })
    .filter((t) => Object.keys(t.body).length > 0);
  if (templates.length > 0) payload.templates = templates;

  const staged = milestones
    .filter((m) => m.value > 0 && m.body.trim().length > 0)
    .map((m) => ({ value: m.value, metric: m.metric, body: { [locale]: m.body.trim() } }));
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
  /** Business primary locale — keys the staged milestone bodies. */
  locale: string;
  stagedTemplates: StagedTemplates;
  milestones: StagedMilestone[];
  announceEnabled: boolean;
  announceMessages: Record<string, string>;
}

/** The full ConvertRequest fired by the execute step. */
export function buildConvertRequest(args: BuildConvertRequestArgs): ConvertRequest {
  const {
    draft, designId, rate, policy, locale,
    stagedTemplates, milestones, announceEnabled, announceMessages,
  } = args;

  let announce: ConvertRequest['announce'] = null;
  if (announceEnabled) {
    const messages: Record<string, string> = {};
    for (const [loc, message] of Object.entries(announceMessages)) {
      if (message.trim()) messages[loc] = message.trim();
    }
    announce = { enabled: true, messages };
  }

  return {
    to_type: draft.toType,
    rate,
    policy,
    design_id: designId,
    config: buildTargetConfig(draft),
    reward_name: draft.toType === 'points' ? null : draft.rewardName.trim() || null,
    notifications: buildNotificationsPayload(locale, stagedTemplates, milestones),
    announce,
  };
}
