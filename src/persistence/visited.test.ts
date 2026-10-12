import { describe, expect, it } from 'vitest';
import { VISITED_STORAGE_KEY, isFirstVisit, markVisited } from './visited';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  } as Storage;
}

const blocked = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

describe('first-visit flag', () => {
  it('is the first visit until the flag is written', () => {
    const storage = memoryStorage();
    expect(isFirstVisit(storage)).toBe(true);
    markVisited(storage);
    expect(storage.getItem(VISITED_STORAGE_KEY)).toBe('1');
    expect(isFirstVisit(storage)).toBe(false);
  });

  it('counts every load as a first visit when storage is blocked, without throwing', () => {
    expect(isFirstVisit(blocked)).toBe(true);
    expect(() => markVisited(blocked)).not.toThrow();
  });
});
