import { describe, expect, test } from 'bun:test';
import type { RewardTier } from '@/types';
import {
  buildConvertRequest,
  buildNotificationsPayload,
  buildTargetConfig,
  cheapestRewardThreshold,
  defaultConversionRate,
  defaultPolicyFor,
  normalizeStagedMilestones,
  staleTemplateVariableKeys,
  staleVariableKeys,
  type TargetProgramDraft,
} from './assemble';

const REWARDS: RewardTier[] = [
  { id: 'r1', threshold: 100, name: 'Free coffee' },
  { id: 'r2', threshold: 60, name: 'Cookie' },
];

function pointsDraft(overrides: Partial<TargetProgramDraft> = {}): TargetProgramDraft {
  return {
    toType: 'points',
    totalStamps: 10,
    rewardName: '',
    stackableRewards: false,
    maxStackedRewards: null,
    initialStamps: 0,
    pointsRate: 1,
    pointsRewards: REWARDS,
    maxBalance: null,
    ...overrides,
  };
}

function stampDraft(overrides: Partial<TargetProgramDraft> = {}): TargetProgramDraft {
  return {
    toType: 'stamp',
    totalStamps: 8,
    rewardName: 'Free coffee',
    stackableRewards: true,
    maxStackedRewards: 3,
    initialStamps: 2,
    pointsRate: 1,
    pointsRewards: [],
    maxBalance: null,
    ...overrides,
  };
}

describe('buildTargetConfig', () => {
  test('points target produces a points config with user_configured', () => {
    expect(buildTargetConfig(pointsDraft({ pointsRate: 2, maxBalance: 500 }))).toEqual({
      points_per_currency_unit: 2,
      rewards: REWARDS,
      max_balance: 500,
      user_configured: true,
    });
  });

  test('stamp target produces a stamp config and clamps prestamp under the goal', () => {
    expect(buildTargetConfig(stampDraft({ initialStamps: 12 }))).toEqual({
      total_stamps: 8,
      stackable_rewards: true,
      max_stacked_rewards: 3,
      initial_stamps: 7,
      user_configured: true,
    });
  });
});

describe('cheapestRewardThreshold', () => {
  test('returns the lowest priced reward', () => {
    expect(cheapestRewardThreshold(REWARDS)).toBe(60);
  });
  test('returns null for an empty menu', () => {
    expect(cheapestRewardThreshold([])).toBeNull();
  });
});

describe('defaultConversionRate', () => {
  test('stamps to points: cheapest NEW reward over the OLD card size', () => {
    // suggestedRate(60, 12) = 5
    expect(defaultConversionRate(pointsDraft(), { totalStamps: 12, pointsRewards: [] })).toBe(5);
  });

  test('points to stamps: cheapest OLD reward over the NEW card size', () => {
    // suggestedRate(60, 8) = 7.5
    expect(
      defaultConversionRate(stampDraft(), { totalStamps: 10, pointsRewards: REWARDS })
    ).toBe(7.5);
  });
});

describe('defaultPolicyFor', () => {
  test('direction defaults', () => {
    expect(defaultPolicyFor('points')).toBe('cheapest_reward_equivalent');
    expect(defaultPolicyFor('stamp')).toBe('bank_full_cards');
  });
});

describe('buildNotificationsPayload', () => {
  test('returns null when nothing was staged', () => {
    expect(buildNotificationsPayload({}, [])).toBeNull();
    // Whitespace-only edits count as untouched.
    expect(buildNotificationsPayload({ points_earned: { fr: '   ' } }, [])).toBeNull();
  });

  test('stages edited trigger bodies per locale, dropping empty locales', () => {
    expect(
      buildNotificationsPayload(
        {
          points_earned: { fr: 'Vous avez {{points_balance}} points', en: '' },
          reward_earned: { en: 'Reward unlocked!', fr: 'Récompense débloquée !' },
        },
        []
      )
    ).toEqual({
      templates: [
        { trigger: 'points_earned', body: { fr: 'Vous avez {{points_balance}} points' } },
        {
          trigger: 'reward_earned',
          body: { en: 'Reward unlocked!', fr: 'Récompense débloquée !' },
        },
      ],
    });
  });

  test('stages enable overrides, alone or alongside a body edit', () => {
    expect(
      buildNotificationsPayload({ points_earned: { fr: 'Merci !' } }, [], {
        points_earned: false,
        near_reward: false,
        reward_earned: true,
      })
    ).toEqual({
      templates: [
        { trigger: 'points_earned', body: { fr: 'Merci !' }, is_enabled: false },
        { trigger: 'near_reward', is_enabled: false },
        { trigger: 'reward_earned', is_enabled: true },
      ],
    });
    // An override with no body edits still produces a payload.
    expect(buildNotificationsPayload({}, [], { near_reward: false })).toEqual({
      templates: [{ trigger: 'near_reward', is_enabled: false }],
    });
  });

  test('stages per-locale milestone bodies, dropping empty locales and dead rows', () => {
    const payload = buildNotificationsPayload({}, [
      {
        value: 100,
        metric: 'balance',
        body: { en: 'You reached 100', fr: 'Vous avez atteint 100', es: '  ' },
      },
      { value: 0, metric: 'balance', body: { en: 'ignored' } },
      { value: 50, metric: 'lifetime', body: { en: '   ' } },
    ]);
    expect(payload).toEqual({
      milestones: [
        {
          value: 100,
          metric: 'balance',
          body: { en: 'You reached 100', fr: 'Vous avez atteint 100' },
        },
      ],
    });
  });
});

describe('normalizeStagedMilestones', () => {
  test('upgrades legacy single-string bodies to a per-locale map', () => {
    expect(
      normalizeStagedMilestones([{ value: 5, metric: 'balance', body: 'old copy' }], 'fr')
    ).toEqual([{ value: 5, metric: 'balance', body: { fr: 'old copy' } }]);
  });

  test('passes through the current shape and tolerates junk', () => {
    expect(
      normalizeStagedMilestones(
        [{ value: 100, metric: 'lifetime', body: { en: 'hi' } }, { bogus: true }],
        'en'
      )
    ).toEqual([
      { value: 100, metric: 'lifetime', body: { en: 'hi' } },
      { value: 0, metric: 'balance', body: {} },
    ]);
    expect(normalizeStagedMilestones('not-an-array', 'en')).toEqual([]);
  });
});

describe('staleVariableKeys', () => {
  test('flags variables that do not exist for the target type', () => {
    expect(
      staleVariableKeys(['You have {{stamp_count}} of {{total_stamps}}'], 'points', 2)
    ).toEqual(['stamp_count', 'total_stamps']);
  });

  test('accepts valid target-type variables and ignores unknown-but-empty bodies', () => {
    expect(staleVariableKeys(['{{points_balance}} pts, {{next_reward_name}}'], 'points', 2)).toEqual(
      []
    );
    expect(staleVariableKeys(['', '   '], 'stamp', 1)).toEqual([]);
  });
});

describe('staleTemplateVariableKeys', () => {
  test('allows trigger-specific variables the generic set would reject', () => {
    // {{last_reward_name}} only exists on the reward triggers — a per-trigger
    // check must not flag it, while a stamp var stays flagged.
    expect(
      staleTemplateVariableKeys(
        {
          reward_completed: { fr: 'Bravo, {{last_reward_name}} !' },
          points_earned: { fr: '{{points_balance}} pts ({{stamp_count}})' },
        },
        'points',
        2
      )
    ).toEqual(['stamp_count']);
  });

  test('empty staging flags nothing', () => {
    expect(staleTemplateVariableKeys({}, 'points', 2)).toEqual([]);
  });
});

describe('buildConvertRequest', () => {
  test('assembles the full request for a points conversion with announce', () => {
    const req = buildConvertRequest({
      draft: pointsDraft({ pointsRate: 2 }),
      designId: 'design-1',
      rate: 6,
      policy: 'cheapest_reward_equivalent',
      stagedTemplates: { points_earned: { fr: 'Merci !' } },
      milestones: [],
      announceEnabled: true,
      announceMessages: { en: 'Hello', fr: 'Bonjour', es: '' },
    });
    expect(req.to_type).toBe('points');
    expect(req.rate).toBe(6);
    expect(req.design_id).toBe('design-1');
    expect(req.reward_name).toBeNull();
    expect(req.config).toEqual({
      points_per_currency_unit: 2,
      rewards: REWARDS,
      max_balance: null,
      user_configured: true,
    });
    expect(req.notifications).toEqual({
      templates: [{ trigger: 'points_earned', body: { fr: 'Merci !' } }],
    });
    // Empty locale messages are dropped from the announce payload.
    expect(req.announce).toEqual({ enabled: true, messages: { en: 'Hello', fr: 'Bonjour' } });
  });

  test('stamp conversion keeps the reward name and omits announce when off', () => {
    const req = buildConvertRequest({
      draft: stampDraft(),
      designId: 'design-2',
      rate: 7.5,
      policy: 'bank_full_cards',
      stagedTemplates: {},
      milestones: [],
      announceEnabled: false,
      announceMessages: { en: 'unused', fr: '', es: '' },
    });
    expect(req.to_type).toBe('stamp');
    expect(req.reward_name).toBe('Free coffee');
    expect(req.notifications).toBeNull();
    expect(req.announce).toBeNull();
  });
});
