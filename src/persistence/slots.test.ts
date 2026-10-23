import { describe, expect, it } from 'vitest';
import {
  applyTacticAction,
  copyFmPositions,
  createExampleDocument,
  createExampleTactic,
  createInitialTactic,
  type Tactic,
  type TacticSnapshot,
} from '../state';
import {
  TACTICS_STORAGE_KEY,
  CURRENT_TACTICS_VERSION,
  MAX_TACTICS_STORAGE_CHARS,
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

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const MINE_ST = exampleSlotId('mine', 'ST');

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

const exampleTactic = createExampleTactic();
const example: TacticSnapshot = { tactic: exampleTactic, mode: 'fm' };

function slot(id: string, savedAt: number, tactic: Tactic = exampleTactic): SavedSlot {
  return { id, name: `Slot ${id}`, savedAt, tactic };
}

function wrapperOf(...slots: SavedSlot[]): TacticsWrapper {
  return { version: CURRENT_TACTICS_VERSION, slots };
}

function storedWith(raw: unknown): Storage {
  return memoryStorage({ [TACTICS_STORAGE_KEY]: JSON.stringify(raw) });
}

describe('canSaveTactic', () => {
  it('needs at least 9 placed players in the active layout', () => {
    const blank = createInitialTactic();
    const place = (count: number): Tactic => ({
      ...blank,
      openPitch: {
        ...blank.openPitch,
        players: blank.openPitch.players.map((p, i) =>
          i < count ? { ...p, base: { x: 10, y: 10 } } : p,
        ),
      },
    });
    const open = (tactic: Tactic): TacticSnapshot => ({ tactic, mode: 'openPitch' });
    expect(canSaveTactic(open(place(8)))).toBe(false);
    expect(canSaveTactic(open(place(9)))).toBe(true);
    expect(canSaveTactic(example)).toBe(true);
  });

  it('ignores the other layout in both directions', () => {
    expect(canSaveTactic({ tactic: exampleTactic, mode: 'openPitch' })).toBe(false);
    const swapped: Tactic = { openPitch: exampleTactic.fm, fm: exampleTactic.openPitch };
    expect(canSaveTactic({ tactic: swapped, mode: 'fm' })).toBe(false);
    expect(canSaveTactic({ tactic: swapped, mode: 'openPitch' })).toBe(true);
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
    expect(loadTactics(storedWith({ version: 5, slots: 'no' }))).toEqual({ status: 'corrupt' });
    expect(loadTactics(storedWith({ version: 999, slots: [] }))).toEqual({ status: 'corrupt' });
    expect(loadTactics(storedWith({ version: 0, slots: [] }))).toEqual({ status: 'corrupt' });
  });

  it('returns valid slots with nothing skipped', () => {
    const wrapper = wrapperOf(slot('a', 1), slot('b', 2));
    expect(loadTactics(storedWith(wrapper))).toEqual({ status: 'ok', wrapper, skipped: 0 });
  });

  it('skips and counts entries that fail the schema', () => {
    const good = slot('a', 1);
    const result = loadTactics(storedWith({ version: 5, slots: [good, { nope: true }] }));
    expect(result).toEqual({ status: 'ok', wrapper: wrapperOf(good), skipped: 1 });
  });

  it('skips entries whose tactic breaks a data rule', () => {
    const broken: Tactic = {
      ...exampleTactic,
      fm: { ...exampleTactic.fm, scenario: { zone: 'C-F', sequenceIndex: -1 } },
    };
    const result = loadTactics(storedWith(wrapperOf(slot('a', 1), slot('b', 2, broken))));
    expect(result).toMatchObject({ status: 'ok', skipped: 1, wrapper: { slots: [{ id: 'a' }] } });
  });

  it('skips every entry beyond the slot limit', () => {
    const result = loadTactics(
      storedWith({ version: 5, slots: [slot('a', 1), slot('b', 2), slot('c', 3)] }),
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
      wrapper: wrapperOf({
        id: expect.any(String),
        name: 'Alpha',
        savedAt: 100,
        tactic: exampleTactic,
      }),
    });
  });

  it('keeps custom piece names through a save', () => {
    const named = applyTacticAction(createExampleTactic(), 'fm', {
      type: 'setPieceName',
      playerId: MINE_ST,
      name: 'Ada',
    });
    const storage = memoryStorage();
    saveSlot(null, null, 'Alpha', { tactic: named, mode: 'fm' }, storage, 100);
    const loaded = loadTactics(storage);
    if (loaded.status !== 'ok') throw new Error('expected ok');
    const { tactic } = loaded.wrapper.slots[0];
    for (const layout of [tactic.fm, tactic.openPitch]) {
      expect(layout.players.find((p) => p.id === MINE_ST)?.customName).toBe('Ada');
    }
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
    const broken: Tactic = {
      ...exampleTactic,
      fm: { ...exampleTactic.fm, scenario: { zone: 'C-F', sequenceIndex: -1 } },
    };
    expect(
      saveSlot(null, null, 'X', { tactic: broken, mode: 'fm' }, memoryStorage()),
    ).toMatchObject({
      status: 'error',
    });
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

describe('new-format only', () => {
  const v3Document = createExampleDocument();

  it('treats a stored v3 wrapper as unsupported and never reads its slots', () => {
    const legacy = {
      version: 3,
      slots: [{ id: 'a', name: 'Old', savedAt: 1, tactic: v3Document }],
    };
    expect(loadTactics(storedWith(legacy))).toEqual({ status: 'corrupt' });
  });

  it('skips a v3-shaped slot inside a v4 wrapper without partially applying it', () => {
    const legacySlot = { id: 'a', name: 'Old', savedAt: 5, tactic: v3Document };
    const result = loadTactics(storedWith({ version: 5, slots: [legacySlot, slot('b', 1)] }));
    expect(result).toMatchObject({ status: 'ok', skipped: 1, wrapper: { slots: [{ id: 'b' }] } });
  });

  it('skips a slot whose layouts disagree about the roster', () => {
    const renamed = createExampleTactic();
    const mismatched: Tactic = {
      ...renamed,
      openPitch: {
        ...renamed.openPitch,
        teams: {
          ...renamed.openPitch.teams,
          mine: { ...renamed.openPitch.teams.mine, name: 'Elsewhere' },
        },
      },
    };
    const result = loadTactics(storedWith(wrapperOf(slot('a', 1, mismatched), slot('b', 2))));
    expect(result).toMatchObject({ status: 'ok', skipped: 1, wrapper: { slots: [{ id: 'b' }] } });
  });

  it('skips a slot whose open pitch pieces carry roles', () => {
    const roled: Tactic = { ...exampleTactic, openPitch: exampleTactic.fm };
    const result = loadTactics(storedWith(wrapperOf(slot('a', 1, roled))));
    expect(result).toMatchObject({ status: 'ok', skipped: 1, wrapper: { slots: [] } });
  });

  it('refuses stored data over the size limit', () => {
    const padded = { version: 5, slots: [], padding: 'x'.repeat(MAX_TACTICS_STORAGE_CHARS) };
    expect(loadTactics(storedWith(padded))).toEqual({ status: 'corrupt' });
  });
});

describe('both layouts in a save', () => {
  function arranged(): Tactic {
    const placed = copyFmPositions(exampleTactic);
    const moved = applyTacticAction(placed, 'openPitch', {
      type: 'movePlayer',
      playerId: MINE_ST,
      point: { x: 11, y: 22 },
    });
    return applyTacticAction(moved, 'fm', { type: 'tapZone', zone: 'L-D' });
  }

  it('saves and reloads both layouts independently, with the mode it was saved in', () => {
    const tactic = arranged();
    const storage = memoryStorage();
    const saved = saveSlot(null, null, 'Both', { tactic, mode: 'openPitch' }, storage, 7);
    expect(saved.status).toBe('ok');
    const loaded = loadTactics(storage);
    if (loaded.status !== 'ok') throw new Error('expected ok');
    const [only] = loaded.wrapper.slots;
    expect(only).not.toHaveProperty('mode');
    expect(only.tactic).toEqual(tactic);
    expect(only.tactic.openPitch.players.find((p) => p.id === MINE_ST)?.base).toEqual({
      x: 11,
      y: 22,
    });
    expect(only.tactic.fm.players.find((p) => p.id === MINE_ST)?.base).not.toEqual({
      x: 11,
      y: 22,
    });
    expect(only.tactic.fm.scenario?.zone).toBe('L-D');
    expect(only.tactic.openPitch.scenario).toBeNull();
  });

  it('counts only the active layout against the save threshold', () => {
    const storage = memoryStorage();
    const open = saveSlot(
      null,
      null,
      'Open',
      { tactic: exampleTactic, mode: 'openPitch' },
      storage,
    );
    expect(open).toEqual({ status: 'error', message: "This tactic can't be saved." });
    expect(storage.getItem(TACTICS_STORAGE_KEY)).toBeNull();
    expect(saveSlot(null, null, 'Fm', example, storage).status).toBe('ok');
  });

  it('autoloads the newest valid slot and skips an invalid newer one', () => {
    const broken = { ...slot('new', 900), tactic: { openPitch: {}, fm: {} } };
    const result = loadTactics(storedWith({ version: 5, slots: [slot('old', 100), broken] }));
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.skipped).toBe(1);
    expect(pickAutoLoadSlot(result.wrapper)?.id).toBe('old');
  });

  it('refuses to write a wrapper over the size limit', () => {
    const bloated = { ...slot('a', 1), name: 'n'.repeat(MAX_TACTICS_STORAGE_CHARS) };
    const storage = memoryStorage();
    const result = saveSlot(wrapperOf(bloated), null, 'B', example, storage);
    expect(result).toMatchObject({ status: 'error', message: expect.stringMatching(/too large/i) });
    expect(storage.getItem(TACTICS_STORAGE_KEY)).toBeNull();
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
