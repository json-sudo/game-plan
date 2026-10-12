import { describe, expect, it } from 'vitest';
import { createExampleDocument, createInitialDocument, type BoardDocument } from '../state';
import { createInitialBoard } from './fixtures';
import {
  BOARDS_STORAGE_KEY,
  CURRENT_BOARDS_VERSION,
  LEGACY_BOARDS_STORAGE_KEY,
  type BoardsWrapper,
  type SavedSlot,
} from './schema';
import {
  canSaveBoard,
  deleteSlot,
  isStorageAvailable,
  loadBoards,
  pickAutoLoadSlot,
  saveSlot,
  skippedBoardsMessage,
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

function slot(id: string, savedAt: number, board: BoardDocument = example): SavedSlot {
  return { id, name: `Slot ${id}`, savedAt, board };
}

function wrapperOf(...slots: SavedSlot[]): BoardsWrapper {
  return { version: CURRENT_BOARDS_VERSION, slots };
}

function storedWith(raw: unknown): Storage {
  return memoryStorage({ [BOARDS_STORAGE_KEY]: JSON.stringify(raw) });
}

describe('canSaveBoard', () => {
  it('needs at least 9 placed players across both teams', () => {
    const blank = createInitialDocument();
    const place = (count: number): BoardDocument => ({
      ...blank,
      players: blank.players.map((p, i) => (i < count ? { ...p, base: { x: 10, y: 10 } } : p)),
    });
    expect(canSaveBoard(place(8))).toBe(false);
    expect(canSaveBoard(place(9))).toBe(true);
    expect(canSaveBoard(example)).toBe(true);
  });
});

describe('loadBoards', () => {
  it('is empty when nothing is stored', () => {
    expect(loadBoards(memoryStorage())).toEqual({ status: 'empty' });
  });

  it('is unavailable when storage cannot be read', () => {
    expect(loadBoards(throwingStorage('get'))).toEqual({ status: 'unavailable' });
  });

  it('is corrupt for malformed JSON, a wrong shape or a newer version', () => {
    const raw = (value: string) => memoryStorage({ [BOARDS_STORAGE_KEY]: value });
    expect(loadBoards(raw('{not json'))).toEqual({ status: 'corrupt' });
    expect(loadBoards(raw('"text"'))).toEqual({ status: 'corrupt' });
    expect(loadBoards(storedWith({ version: 2, slots: 'no' }))).toEqual({ status: 'corrupt' });
    expect(loadBoards(storedWith({ version: 999, slots: [] }))).toEqual({ status: 'corrupt' });
    expect(loadBoards(storedWith({ version: 0, slots: [] }))).toEqual({ status: 'corrupt' });
  });

  it('returns valid slots with nothing skipped', () => {
    const wrapper = wrapperOf(slot('a', 1), slot('b', 2));
    expect(loadBoards(storedWith(wrapper))).toEqual({ status: 'ok', wrapper, skipped: 0 });
  });

  it('skips and counts entries that fail the schema', () => {
    const good = slot('a', 1);
    const result = loadBoards(storedWith({ version: 2, slots: [good, { nope: true }] }));
    expect(result).toEqual({ status: 'ok', wrapper: wrapperOf(good), skipped: 1 });
  });

  it('skips entries whose board breaks a data rule', () => {
    const broken: BoardDocument = { ...example, scenario: { zone: 'C-F', carrierId: 'ghost' } };
    const result = loadBoards(storedWith(wrapperOf(slot('a', 1), slot('b', 2, broken))));
    expect(result).toMatchObject({ status: 'ok', skipped: 1, wrapper: { slots: [{ id: 'a' }] } });
  });

  it('skips every entry beyond the slot limit', () => {
    const result = loadBoards(
      storedWith({ version: 2, slots: [slot('a', 1), slot('b', 2), slot('c', 3)] }),
    );
    expect(result).toMatchObject({ status: 'ok', skipped: 1 });
  });

  it('round-trips a saved board identically', () => {
    const storage = memoryStorage();
    const saved = saveSlot(null, null, 'Alpha', example, storage, 100);
    expect(saved.status).toBe('ok');
    const loaded = loadBoards(storage);
    expect(loaded).toEqual({
      status: 'ok',
      skipped: 0,
      wrapper: wrapperOf({ id: expect.any(String), name: 'Alpha', savedAt: 100, board: example }),
    });
  });

  it('keeps custom piece names through a save', () => {
    const named: BoardDocument = {
      ...example,
      players: example.players.map((p) => (p.id === 'mine-ST' ? { ...p, customName: 'Ada' } : p)),
    };
    const storage = memoryStorage();
    saveSlot(null, null, 'Alpha', named, storage, 100);
    const loaded = loadBoards(storage);
    if (loaded.status !== 'ok') throw new Error('expected ok');
    expect(loaded.wrapper.slots[0].board.players.find((p) => p.id === 'mine-ST')?.customName).toBe(
      'Ada',
    );
  });
});

describe('legacy v1 key', () => {
  const v1Slot = { id: 'old', name: 'Old board', savedAt: 7, board: createInitialBoard() };

  it('migrates v1 saves once, writes the new key and removes the old one', () => {
    const storage = memoryStorage({
      [LEGACY_BOARDS_STORAGE_KEY]: JSON.stringify({ version: 1, slots: [v1Slot] }),
    });
    const result = loadBoards(storage);
    expect(result).toMatchObject({ status: 'ok', skipped: 0 });
    if (result.status !== 'ok') return;
    expect(result.wrapper.version).toBe(2);
    expect(result.wrapper.slots[0]).toMatchObject({ id: 'old', name: 'Old board', savedAt: 7 });
    expect(storage.getItem(LEGACY_BOARDS_STORAGE_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(BOARDS_STORAGE_KEY)!).version).toBe(2);
    expect(loadBoards(storage)).toMatchObject({ status: 'ok', skipped: 0 });
  });

  it('skips unreadable v1 entries and counts them', () => {
    const storage = memoryStorage({
      [LEGACY_BOARDS_STORAGE_KEY]: JSON.stringify({ version: 1, slots: [v1Slot, { id: 1 }] }),
    });
    expect(loadBoards(storage)).toMatchObject({ status: 'ok', skipped: 1 });
  });

  it('prefers the new key and leaves the old one alone', () => {
    const wrapper = wrapperOf(slot('a', 1));
    const storage = memoryStorage({
      [BOARDS_STORAGE_KEY]: JSON.stringify(wrapper),
      [LEGACY_BOARDS_STORAGE_KEY]: JSON.stringify({ version: 1, slots: [v1Slot] }),
    });
    expect(loadBoards(storage)).toEqual({ status: 'ok', wrapper, skipped: 0 });
    expect(storage.getItem(LEGACY_BOARDS_STORAGE_KEY)).not.toBeNull();
  });

  it('treats a corrupt old key as corrupt and keeps it', () => {
    const storage = memoryStorage({ [LEGACY_BOARDS_STORAGE_KEY]: '{bad' });
    expect(loadBoards(storage)).toEqual({ status: 'corrupt' });
    expect(storage.getItem(LEGACY_BOARDS_STORAGE_KEY)).toBe('{bad');
  });

  it('still returns the migrated boards when the new key cannot be written', () => {
    const inner = memoryStorage({
      [LEGACY_BOARDS_STORAGE_KEY]: JSON.stringify({ version: 1, slots: [v1Slot] }),
    });
    const readOnly = {
      getItem: inner.getItem.bind(inner),
      setItem: () => {
        throw new Error('full');
      },
      removeItem: inner.removeItem.bind(inner),
    } as unknown as Storage;
    expect(loadBoards(readOnly)).toMatchObject({ status: 'ok', skipped: 0 });
    expect(inner.getItem(LEGACY_BOARDS_STORAGE_KEY)).not.toBeNull();
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

  it('refuses a board that breaks a data rule', () => {
    const broken: BoardDocument = { ...example, scenario: { zone: 'C-F', carrierId: 'ghost' } };
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
    expect(JSON.parse(storage.getItem(BOARDS_STORAGE_KEY)!).slots).toHaveLength(1);
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

describe('skippedBoardsMessage', () => {
  it('words the skipped count for the user', () => {
    expect(skippedBoardsMessage(0)).toBeNull();
    expect(skippedBoardsMessage(1)).toBe('1 saved board could not be read and was skipped.');
    expect(skippedBoardsMessage(2)).toBe('2 saved boards could not be read and were skipped.');
  });
});

describe('isStorageAvailable', () => {
  it('is true for working storage and false when writes throw', () => {
    expect(isStorageAvailable(memoryStorage())).toBe(true);
    expect(isStorageAvailable(throwingStorage())).toBe(false);
  });
});
