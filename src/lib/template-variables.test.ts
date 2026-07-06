import { describe, expect, test } from 'bun:test';
import { insertVariableAtCursor } from './template-variables';

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
