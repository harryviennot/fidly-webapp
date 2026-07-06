import { describe, expect, test } from 'bun:test';
import { convertDraftKey, createConvertDraftStore } from './draft';

describe('convertDraftKey', () => {
  test('is scoped per business — two businesses never share a draft', () => {
    const a = convertDraftKey('dd000000-0000-4000-8000-00000000000a');
    const b = convertDraftKey('dd000000-0000-4000-8000-00000000000b');
    expect(a).not.toBe(b);
    expect(a).toContain('dd000000-0000-4000-8000-00000000000a');
  });
});

describe('createConvertDraftStore', () => {
  test('get/set/clear round-trip (in-memory without window)', () => {
    const store = createConvertDraftStore('biz-1');
    expect(store.get('design.designId')).toBeUndefined();
    store.set('design.designId', 'abc');
    expect(store.get<string>('design.designId')).toBe('abc');
    store.clear();
    expect(store.get('design.designId')).toBeUndefined();
  });
});
