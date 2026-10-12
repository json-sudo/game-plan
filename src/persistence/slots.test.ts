import { describe, expect, it } from 'vitest';
import { createExampleDocument, createInitialDocument, type PitchDocument } from '../state';
import {
  TACTICS_STORAGE_KEY,
  CURRENT_TACTICS_VERSION,
  type TacticsWrapper,
  type SavedSlot,
} from './schema';
import {
  canSaveTactic,
  deleteSlot,
  isStorageAvailable,
  loadTactics,
  pickAutoLoadSlot,
  saveSlot,
  skippedTacticsMessage,
} from './slots';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  } as Storage;
}

function throwingStorage(failOn: 'get' | 'set' = 'set', error: unknown = new Error('blocked')) {
  return {
    getItem: () => {
      if (failOn === 'get') throw error;
      return null;
    },
    setItem: () => {
      if (failOn === 'set') throw error;
    },
    removeItem: () => {},
  } as unknown as Storage;
}

const example = createExampleDocument();

function slot(id: string, savedAt: number, tactic: PitchDocument = example): SavedSlot {
  return { id, name: `Slot ${id}`, savedAt, tactic };
}

function wrapperOf(...slots: SavedSlot[]): TacticsWrapper {
  return { version: CURRENT_TACTICS_VERSION, slots };
}

function storedWith(raw: unknown): Storage {
  return memoryStorage({ [TACTICS_STORAGE_KEY]: JSON.stringify(raw) });
}

describe('canSaveTactic', () => {
  it('needs at least 9 placed players across both teams', () => {
    const blank = createInitialDocument();
    const place = (count: number): PitchDocument => ({
      ...blank,
      players: blank.players.map((p, i) => (i < count ? { ...p, base: { x: 10, y: 10 } } : p)),
    });
    expect(canSaveTactic(place(8))).toBe(false);
    expect(canSaveTactic(place(9))).toBe(true);
    expect(canSaveTactic(example)).toBe(true);
  });
});

describe('loadTactics', () => {
  it('is empty when nothing is stored', () => {
    expect(loadTactics(memoryStorage())).toEqual({ status: 'empty' });
  });

  it('is unavailable when storage cannot be read', () => {
    expect(loadTactics(throwingStorage('get'))).toEqual({ status: 'unavailable' });
  });

  it('is corrupt for malformed JSON, a wrong shape or a newer version', () => {
    const raw = (value: string) => memoryStorage({ [TACTICS_STORAGE_KEY]: value });
    expect(loadTactics(raw('{not json'))).toEqual({ status: 'corrupt' });
    expect(loadTactics(raw('"text"'))).toEqual({ status: 'corrupt' });
    expect(loadTactics(storedWith({ version: 3, slots: 'no' }))).toEqual({ status: 'corrupt' });
    expect(loadTactics(storedWith({ version: 999, slots: [] }))).toEqual({ status: 'corrupt' });
    expect(loadTactics(storedWith({ version: 0, slots: [] }))).toEqual({ status: 'corrupt' });
  });

  it('returns valid slots with nothing skipped', () => {
    const wrapper = wrapperOf(slot('a', 1), slot('b', 2));
    expect(loadTactics(storedWith(wrapper))).toEqual({ status: 'ok', wrapper, skipped: 0 });
  });

  it('skips and counts entries that fail the schema', () => {
    const good = slot('a', 1);
    const result = loadTactics(storedWith({ version: 3, slots: [good, { nope: true }] }));
    expect(result).toEqual({ status: 'ok', wrapper: wrapperOf(good), skipped: 1 });
  });

  it('skips entries whose tactic breaks a data rule', () => {
    const broken: PitchDocument = { ...example, scenario: { zone: 'C-F', carrierId: 'ghost' } };
    const result = loadTactics(storedWith(wrapperOf(slot('a', 1), slot('b', 2, broken))));
    expect(result).toMatchObject({ status: 'ok', skipped: 1, wrapper: { slots: [{ id: 'a' }] } });
  });

  it('skips every entry beyond the slot limit', () => {
    const result = loadTactics(
      storedWith({ version: 3, slots: [slot('a', 1), slot('b', 2), slot('c', 3)] }),
    );
    expect(result).toMatchObject({ status: 'ok', skipped: 1 });
  });

  it('round-trips a saved tactic identically', () => {
    const storage = memoryStorage();
    const saved = saveSlot(null, null, 'Alpha', example, storage, 100);
    expect(saved.status).toBe('ok');
    const loaded = loadTactics(storage);
    expect(loaded).toEqual({
      status: 'ok',
      skipped: 0,
      wrapper: wrapperOf({ id: expect.any(String), name: 'Alpha', savedAt: 100, tactic: example }),
    });
  });

  it('keeps custom piece names through a save', () => {
    const named: PitchDocument = {
      ...example,
      players: example.players.map((p) => (p.id === 'mine-ST' ? { ...p, customName: 'Ada' } : p)),
    };
    const storage = memoryStorage();
    saveSlot(null, null, 'Alpha', named, storage, 100);
    const loaded = loadTactics(storage);
    if (loaded.status !== 'ok') throw new Error('expected ok');
    expect(loaded.wrapper.slots[0].tactic.players.find((p) => p.id === 'mine-ST')?.customName).toBe(
      'Ada',
    );
  });
});

describe('saveSlot', () => {
  it('adds a new slot without touching an existing one', () => {
    const other = slot('a', 100);
    const result = saveSlot(wrapperOf(other), null, 'Bravo', example, memoryStorage(), 200);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.wrapper.slots).toHaveLength(2);
    expect(result.wrapper.slots[0]).toEqual(other);
    expect(result.wrapper.slots[1]).toMatchObject({ name: 'Bravo', savedAt: 200 });
    expect(result.slotId).toBe(result.wrapper.slots[1].id);
  });

  it('overwrites only the targeted slot', () => {
    const a = slot('a', 100);
    const b = slot('b', 150);
    const result = saveSlot(wrapperOf(a, b), 'a', 'Renamed', example, memoryStorage(), 300);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.wrapper.slots.find((s) => s.id === 'b')).toEqual(b);
    expect(result.wrapper.slots.find((s) => s.id === 'a')).toMatchObject({
      name: 'Renamed',
      savedAt: 300,
    });
  });

  it('trims and caps the slot name at 24 characters', () => {
    const result = saveSlot(null, null, `  ${'n'.repeat(40)}  `, example, memoryStorage(), 1);
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.wrapper.slots[0].name).toHaveLength(24);
  });

  it('needs an explicit target when both slots are full and never creates a third', () => {
    const full = wrapperOf(slot('a', 1), slot('b', 2));
    expect(saveSlot(full, null, 'C', example, memoryStorage()).status).toBe('error');
    expect(saveSlot(full, 'ghost', 'C', example, memoryStorage()).status).toBe('error');
  });

  it('refuses a pitch that breaks a data rule', () => {
    const broken: PitchDocument = { ...example, scenario: { zone: 'C-F', carrierId: 'ghost' } };
    expect(saveSlot(null, null, 'X', broken, memoryStorage())).toMatchObject({ status: 'error' });
  });

  it('reports a full storage and leaves the prior wrapper untouched', () => {
    const a = slot('a', 100);
    const wrapper = wrapperOf(a);
    const result = saveSlot(
      wrapper,
      null,
      'B',
      example,
      throwingStorage('set', new DOMException('q', 'QuotaExceededError')),
    );
    expect(result).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/storage is full/i),
    });
    expect(wrapper.slots).toEqual([a]);
  });
});

describe('deleteSlot', () => {
  it('removes one slot and persists the rest', () => {
    const storage = memoryStorage();
    const result = deleteSlot(wrapperOf(slot('a', 1), slot('b', 2)), 'a', storage);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.wrapper.slots.map((s) => s.id)).toEqual(['b']);
    expect(JSON.parse(storage.getItem(TACTICS_STORAGE_KEY)!).slots).toHaveLength(1);
  });

  it('errors for an unknown slot or a failing write', () => {
    expect(deleteSlot(wrapperOf(slot('a', 1)), 'ghost', memoryStorage()).status).toBe('error');
    expect(deleteSlot(wrapperOf(slot('a', 1)), 'a', throwingStorage()).status).toBe('error');
  });
});

describe('pickAutoLoadSlot', () => {
  it('picks the newest slot', () => {
    expect(pickAutoLoadSlot(wrapperOf(slot('a', 100), slot('b', 200)))?.id).toBe('b');
    expect(pickAutoLoadSlot(wrapperOf(slot('b', 200), slot('a', 100)))?.id).toBe('b');
    expect(pickAutoLoadSlot(wrapperOf())).toBeNull();
  });
});

describe('skippedTacticsMessage', () => {
  it('words the skipped count for the user', () => {
    expect(skippedTacticsMessage(0)).toBeNull();
    expect(skippedTacticsMessage(1)).toBe('1 saved tactic was skipped.');
    expect(skippedTacticsMessage(2)).toBe('2 saved tactics were skipped.');
  });
});

describe('isStorageAvailable', () => {
  it('is true for working storage and false when writes throw', () => {
    expect(isStorageAvailable(memoryStorage())).toBe(true);
    expect(isStorageAvailable(throwingStorage())).toBe(false);
  });
});
