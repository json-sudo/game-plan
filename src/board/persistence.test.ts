import { describe, expect, it } from 'vitest';
import { createInitialBoard } from './boardReducer';
import type { BoardState } from './types';
import {
  BOARDS_STORAGE_KEY,
  canSaveBoard,
  isStorageAvailable,
  loadBoardsWrapper,
  pickAutoLoadSlot,
  runMigrations,
  saveSlot,
  type BoardsWrapper,
  type Migration,
} from './persistence';

function placedBoard(count: number): BoardState {
  const board = createInitialBoard();
  return {
    ...board,
    pieces: board.pieces.map((p, i) =>
      p.type === 'player' && i < count ? { ...p, position: { x: 10, y: 10 } } : p,
    ),
  };
}

describe('canSaveBoard', () => {
  it('is false below 9 combined placed players and true at 9, regardless of team split', () => {
    expect(canSaveBoard(placedBoard(8))).toBe(false);
    expect(canSaveBoard(placedBoard(9))).toBe(true);

    const board = createInitialBoard();
    const split: BoardState = {
      ...board,
      pieces: board.pieces.map((p) => {
        if (p.type !== 'player') return p;
        const mineIdx = board.pieces.filter((pp) => pp.team === 'mine').indexOf(p);
        const oppIdx = board.pieces.filter((pp) => pp.team === 'opponent').indexOf(p);
        if (p.team === 'mine' && mineIdx < 5) return { ...p, position: { x: 10, y: 10 } };
        if (p.team === 'opponent' && oppIdx < 4) return { ...p, position: { x: 10, y: 10 } };
        return p;
      }),
    };
    expect(canSaveBoard(split)).toBe(true);
  });
});

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

describe('saveSlot', () => {
  it('adds a new slot without touching an unrelated existing slot', () => {
    const other = { id: 'a', name: 'Alpha', savedAt: 100, board: createInitialBoard() };
    const wrapper: BoardsWrapper = { version: 1, slots: [other] };
    const storage = memoryStorage();

    const result = saveSlot(wrapper, null, 'Bravo', createInitialBoard(), storage, 200);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.wrapper.slots).toHaveLength(2);
    expect(result.wrapper.slots[0]).toEqual(other);
    expect(result.wrapper.slots[1].name).toBe('Bravo');
    expect(result.wrapper.slots[1].savedAt).toBe(200);
  });

  it('overwrites only the targeted slot, preserving the other slot untouched', () => {
    const a = { id: 'a', name: 'Alpha', savedAt: 100, board: createInitialBoard() };
    const b = { id: 'b', name: 'Bravo', savedAt: 150, board: createInitialBoard() };
    const wrapper: BoardsWrapper = { version: 1, slots: [a, b] };
    const newBoard = placedBoard(9);

    const result = saveSlot(wrapper, 'a', 'Alpha renamed', newBoard, undefined, 300);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.wrapper.slots.find((s) => s.id === 'b')).toEqual(b);
    const updated = result.wrapper.slots.find((s) => s.id === 'a')!;
    expect(updated.name).toBe('Alpha renamed');
    expect(updated.savedAt).toBe(300);
    expect(updated.board).toEqual(newBoard);
  });

  it('requires an explicit target when both slots are full and never creates a 3rd', () => {
    const a = { id: 'a', name: 'Alpha', savedAt: 100, board: createInitialBoard() };
    const b = { id: 'b', name: 'Bravo', savedAt: 150, board: createInitialBoard() };
    const wrapper: BoardsWrapper = { version: 1, slots: [a, b] };

    const result = saveSlot(wrapper, null, 'Charlie', createInitialBoard());
    expect(result.status).toBe('error');

    const resultUnknownId = saveSlot(wrapper, 'nonexistent', 'Charlie', createInitialBoard());
    expect(resultUnknownId.status).toBe('error');
  });

  it('surfaces a typed error when the underlying write throws, leaving prior slots intact', () => {
    const a = { id: 'a', name: 'Alpha', savedAt: 100, board: createInitialBoard() };
    const wrapper: BoardsWrapper = { version: 1, slots: [a] };
    const throwingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      },
      removeItem: () => {},
    } as unknown as Storage;

    const result = saveSlot(wrapper, null, 'Bravo', createInitialBoard(), throwingStorage);
    expect(result).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/storage is full/i),
    });
    // The wrapper object passed in (representing prior state) is untouched.
    expect(wrapper.slots).toEqual([a]);
  });
});

describe('pickAutoLoadSlot', () => {
  it('picks the slot with the max savedAt', () => {
    const a = { id: 'a', name: 'Alpha', savedAt: 100, board: createInitialBoard() };
    const b = { id: 'b', name: 'Bravo', savedAt: 200, board: createInitialBoard() };
    expect(pickAutoLoadSlot({ version: 1, slots: [a, b] })?.id).toBe('b');
    expect(pickAutoLoadSlot({ version: 1, slots: [b, a] })?.id).toBe('b');
    expect(pickAutoLoadSlot({ version: 1, slots: [] })).toBeNull();
  });
});

describe('loadBoardsWrapper', () => {
  it('returns "empty" when no data is stored', () => {
    expect(loadBoardsWrapper(memoryStorage())).toEqual({ status: 'empty' });
  });

  it('returns a typed "corrupt" result for malformed JSON', () => {
    const storage = memoryStorage({ [BOARDS_STORAGE_KEY]: '{not json' });
    expect(loadBoardsWrapper(storage)).toEqual({ status: 'corrupt' });
  });

  it('returns a typed "corrupt" result for schema-invalid objects', () => {
    const storage = memoryStorage({
      [BOARDS_STORAGE_KEY]: JSON.stringify({ version: 1, slots: [{ nope: true }] }),
    });
    expect(loadBoardsWrapper(storage)).toEqual({ status: 'corrupt' });
  });

  it('returns a typed "corrupt" result for an unknown future version', () => {
    const storage = memoryStorage({
      [BOARDS_STORAGE_KEY]: JSON.stringify({ version: 999, slots: [] }),
    });
    expect(loadBoardsWrapper(storage)).toEqual({ status: 'corrupt' });
  });

  it('returns "ok" for a valid wrapper', () => {
    const wrapper: BoardsWrapper = {
      version: 1,
      slots: [{ id: 'a', name: 'Alpha', savedAt: 1, board: createInitialBoard() }],
    };
    const storage = memoryStorage({ [BOARDS_STORAGE_KEY]: JSON.stringify(wrapper) });
    expect(loadBoardsWrapper(storage)).toEqual({ status: 'ok', wrapper });
  });
});

describe('migration chain', () => {
  it('passes a version 1 fixture through untouched once a hypothetical version 2 exists', () => {
    const fixture = { version: 1, slots: [] };
    const fakeMigrations: Record<number, Migration> = {
      1: (data) => ({ ...data, version: 2 }),
    };
    const result = runMigrations(fixture, fakeMigrations, 2);
    expect(result).toEqual({ version: 2, slots: [] });
  });

  it('returns null when no migration path exists for the stored version', () => {
    const fixture = { version: 5, slots: [] };
    const result = runMigrations(fixture, {}, 1);
    expect(result).toBeNull();
  });
});

describe('isStorageAvailable', () => {
  it('is true for a working storage and false when writes throw', () => {
    expect(isStorageAvailable(memoryStorage())).toBe(true);
    const throwingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('disabled');
      },
      removeItem: () => {},
    } as unknown as Storage;
    expect(isStorageAvailable(throwingStorage)).toBe(false);
  });
});
