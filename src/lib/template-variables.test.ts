import { describe, expect, test } from 'bun:test';
import {
  insertVariableAtCursor,
  programVariableKeys,
  triggerVariableKeys,
  renderSamplePreview,
  VARIABLE_DISPLAY_NAMES,
  VARIABLE_KEYS,
  type Locale,
} from './template-variables';

describe('insertVariableAtCursor', () => {
  test('inserts at the cursor, not at the end', () => {
    const { text } = insertVariableAtCursor('Hello , welcome back!', 6, 6, 'customer_name');
    expect(text).toBe('Hello {{customer_name}}, welcome back!');
  });

  test('empty text gets the bare token with cursor after it', () => {
    const { text, cursor } = insertVariableAtCursor('', 0, 0, 'points_balance');
    expect(text).toBe('{{points_balance}}');
    expect(cursor).toBe('{{points_balance}}'.length);
  });

  test('adds a space before when glued to a word', () => {
    const { text } = insertVariableAtCursor('You have', 8, 8, 'points_balance');
    expect(text).toBe('You have {{points_balance}}');
  });

  test('does not add a space before after existing whitespace', () => {
    const { text } = insertVariableAtCursor('You have ', 9, 9, 'points_balance');
    expect(text).toBe('You have {{points_balance}}');
  });

  test('adds a space after when glued to a following word', () => {
    const { text } = insertVariableAtCursor('points left', 0, 0, 'points_balance');
    expect(text).toBe('{{points_balance}} points left');
  });

  test('no space before punctuation', () => {
    const { text } = insertVariableAtCursor('You have !', 9, 9, 'points_balance');
    expect(text).toBe('You have {{points_balance}}!');
  });

  test('replaces the selection', () => {
    const { text } = insertVariableAtCursor('Hello NAME, welcome', 6, 10, 'customer_name');
    expect(text).toBe('Hello {{customer_name}}, welcome');
  });

  test('cursor lands right after the inserted token', () => {
    const { text, cursor } = insertVariableAtCursor('ab cd', 3, 3, 'reward_name');
    // 'ab {{reward_name}} cd' — cursor after '}}' + the joining space
    expect(text).toBe('ab {{reward_name}} cd');
    expect(text.slice(cursor)).toBe('cd');
  });

  test('out-of-range cursor clamps to the end', () => {
    const { text } = insertVariableAtCursor('short', 99, 99, 'reward_name');
    expect(text).toBe('short {{reward_name}}');
  });
});

describe('next_reward_points (absolute next milestone)', () => {
  test('is a known canonical key', () => {
    expect(VARIABLE_KEYS).toContain('next_reward_points');
  });

  test('is offered to points programs, single and multi reward', () => {
    expect(programVariableKeys({ type: 'points', rewardCount: 1 })).toContain(
      'next_reward_points'
    );
    expect(programVariableKeys({ type: 'points', rewardCount: 3 })).toContain(
      'next_reward_points'
    );
  });

  test('is never offered to stamp programs', () => {
    expect(programVariableKeys({ type: 'stamp', rewardCount: 1 })).not.toContain(
      'next_reward_points'
    );
  });

  test('appears on the reward_earned trigger but not reward_completed (no next tier)', () => {
    expect(
      triggerVariableKeys({ type: 'points', rewardCount: 3, trigger: 'reward_earned' })
    ).toContain('next_reward_points');
    expect(
      triggerVariableKeys({ type: 'points', rewardCount: 3, trigger: 'reward_completed' })
    ).not.toContain('next_reward_points');
  });

  test('has a display token in every locale', () => {
    for (const locale of ['en', 'fr', 'es'] as Locale[]) {
      expect(VARIABLE_DISPLAY_NAMES[locale].next_reward_points).toBeTruthy();
    }
  });

  test('renders a sample value in previews (balance 120 + delta 80 = goal 200)', () => {
    expect(renderSamplePreview('Goal {{next_reward_points}}')).toBe('Goal 200');
  });
});
