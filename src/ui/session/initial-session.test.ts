import { describe, expect, it } from 'vitest';
import { VISITED_STORAGE_KEY, saveSlot, TACTICS_STORAGE_KEY } from '../../persistence';
import { encodeShareHash } from '../../share';
import {
  applyTacticAction,
  copyFmPositions,
  createExampleTactic,
  createInitialTactic,
  placedPlayers,
} from '../../state';
import { openedShareLink, resolveInitialSession, sessionNotices } from './initial-session';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  } as Storage;
}

function blockedStorage(): Storage {
  const fail = () => {
    throw new Error('blocked');
  };
  return { getItem: fail, setItem: fail, removeItem: fail } as unknown as Storage;
}

const noLink = { hash: '' };

function visited(extra: Record<string, string> = {}): Storage {
  return memoryStorage({ [VISITED_STORAGE_KEY]: '1', ...extra });
}

function storageWithSave(): Storage {
  const storage = visited();
  const arranged = copyFmPositions(createExampleTactic());
  const named = applyTacticAction(arranged, 'fm', {
    type: 'renameTeam',
    team: 'mine',
    name: 'Saved FC',
  });
  const saved = saveSlot(null, null, 'Plan', { tactic: named, mode: 'fm' }, storage, 10);
  if (saved.status !== 'ok') throw new Error('expected the save to work');
  return storage;
}

describe('first visit', () => {
  it('opens the FM example in FM mode with an empty open pitch', () => {
    const session = resolveInitialSession({ storage: memoryStorage(), location: noLink });
    expect(session.visit).toBe('first');
    expect(session.mode).toBe('fm');
    expect(session.tactic).toEqual(createExampleTactic());
    expect(placedPlayers(session.tactic.openPitch)).toHaveLength(0);
  });

  it('still opens when storage is blocked', () => {
    const session = resolveInitialSession({ storage: blockedStorage(), location: noLink });
    expect(session).toMatchObject({
      visit: 'first',
      mode: 'fm',
      tactics: { status: 'unavailable' },
    });
  });
});

describe('later visit', () => {
  it('opens an empty open pitch with 11 benched players per team when nothing is saved', () => {
    const session = resolveInitialSession({ storage: visited(), location: noLink });
    expect(session.visit).toBe('returning');
    expect(session.mode).toBe('openPitch');
    expect(session.tactic).toEqual(createInitialTactic());
    expect(session.tactics).toEqual({ status: 'empty' });
  });

  it('autoloads the newest valid save on the open pitch and keeps its FM layout', () => {
    const session = resolveInitialSession({ storage: storageWithSave(), location: noLink });
    expect(session.mode).toBe('openPitch');
    expect(session.tactic.openPitch.teams.mine.name).toBe('Saved FC');
    expect(placedPlayers(session.tactic.openPitch)).toHaveLength(22);
    expect(placedPlayers(session.tactic.fm)).toHaveLength(22);
  });

  it('falls back to an empty open pitch and reports skipped saves', () => {
    const storage = visited({
      [TACTICS_STORAGE_KEY]: JSON.stringify({ version: 4, slots: [{ nope: true }] }),
    });
    const session = resolveInitialSession({ storage, location: noLink });
    expect(session.tactic).toEqual(createInitialTactic());
    expect(session.tactics).toMatchObject({ status: 'ok', skipped: 1 });
  });

  it('does not import v3 saves', () => {
    const storage = visited({
      [TACTICS_STORAGE_KEY]: JSON.stringify({ version: 3, slots: [{ id: 'a' }] }),
    });
    const session = resolveInitialSession({ storage, location: noLink });
    expect(session.tactic).toEqual(createInitialTactic());
    expect(session.tactics).toEqual({ status: 'corrupt' });
  });

  it('treats blocked storage as a first visit and still opens', () => {
    const session = resolveInitialSession({ storage: blockedStorage(), location: noLink });
    expect(session.tactics).toEqual({ status: 'unavailable' });
    expect(session.tactic).toEqual(createExampleTactic());
  });
});

describe('share link', () => {
  function linkTo(mode: 'openPitch' | 'fm') {
    const tactic = copyFmPositions(createExampleTactic());
    const encoded = encodeShareHash({ tactic, mode }, 'runs');
    if (encoded.status !== 'ok') throw new Error('expected a link');
    return { tactic, hash: encoded.hash };
  }

  it('restores the mode active when the link was made, with both layouts', () => {
    for (const mode of ['openPitch', 'fm'] as const) {
      const { tactic, hash } = linkTo(mode);
      const session = resolveInitialSession({ storage: visited(), location: { hash } });
      expect(session).toMatchObject({ visit: 'shared', mode, phase: 'runs', tactic });
    }
  });

  it('wins over the first-visit example and over an autoloaded save', () => {
    const { hash, tactic } = linkTo('openPitch');
    expect(resolveInitialSession({ storage: memoryStorage(), location: { hash } }).tactic).toEqual(
      tactic,
    );
    expect(
      resolveInitialSession({ storage: storageWithSave(), location: { hash } }).tactic,
    ).toEqual(tactic);
  });

  it('reports an old link and keeps the usual visit behaviour', () => {
    const session = resolveInitialSession({ storage: visited(), location: { hash: '#s=v3.abc' } });
    expect(session.share).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/old Game Plan/),
    });
    expect(session.tactic).toEqual(createInitialTactic());
    expect(session.mode).toBe('openPitch');
  });

  it('reports a damaged link on a first visit without losing the example', () => {
    const session = resolveInitialSession({
      storage: memoryStorage(),
      location: { hash: '#s=v4.not-a-payload' },
    });
    expect(session.share.status).toBe('error');
    expect(session.tactic).toEqual(createExampleTactic());
    expect(session.mode).toBe('fm');
  });
});

describe('session notices', () => {
  it('reports nothing for an ordinary visit', () => {
    const session = resolveInitialSession({ storage: storageWithSave(), location: noLink });
    expect(sessionNotices(session)).toEqual([]);
    expect(openedShareLink(session)).toBe(false);
  });

  it('reports an old link and marks it for clearing', () => {
    const session = resolveInitialSession({ storage: visited(), location: { hash: '#s=v3.abc' } });
    expect(sessionNotices(session)).toEqual([
      { id: 'share', tone: 'error', title: expect.stringMatching(/old Game Plan/) },
    ]);
    expect(openedShareLink(session)).toBe(true);
  });

  it('marks a valid link for clearing so a reload does not reapply it', () => {
    const encoded = encodeShareHash({ tactic: createExampleTactic(), mode: 'fm' }, 'shape');
    if (encoded.status !== 'ok') throw new Error('expected a link');
    const session = resolveInitialSession({ storage: visited(), location: encoded });
    expect(sessionNotices(session)).toEqual([]);
    expect(openedShareLink(session)).toBe(true);
  });

  it('reports blocked storage', () => {
    const session = resolveInitialSession({ storage: blockedStorage(), location: noLink });
    expect(sessionNotices(session)).toEqual([
      expect.objectContaining({ id: 'storage', title: 'Saving is off in this browser.' }),
    ]);
  });

  it('reports skipped and unreadable saves', () => {
    const skipped = visited({
      [TACTICS_STORAGE_KEY]: JSON.stringify({ version: 4, slots: [{ nope: true }] }),
    });
    expect(sessionNotices(resolveInitialSession({ storage: skipped, location: noLink }))).toEqual([
      { id: 'saved', tone: 'error', title: '1 saved tactic was skipped.' },
    ]);
    const legacy = visited({
      [TACTICS_STORAGE_KEY]: JSON.stringify({ version: 3, slots: [{ id: 'a' }] }),
    });
    expect(sessionNotices(resolveInitialSession({ storage: legacy, location: noLink }))).toEqual([
      expect.objectContaining({ id: 'saved', title: 'Saved tactics were skipped.' }),
    ]);
  });
});
