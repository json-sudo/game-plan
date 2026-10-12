import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { documentIssues } from '../state';
import { createInitialBoard } from './fixtures';
import {
  MIGRATIONS,
  V1_LABEL_FAMILIES,
  migrateV1Board,
  runMigrations,
  type Migration,
} from './migrations';
import type { BoardState, Piece } from './types';

function withLabels(labels: string[]): BoardState {
  const board = createInitialBoard();
  const mine = board.pieces.filter((p) => p.team === 'mine' && p.type === 'player');
  return {
    ...board,
    pieces: board.pieces.map((piece) => {
      const index = mine.indexOf(piece);
      return index >= 0 && index < labels.length ? { ...piece, label: labels[index] } : piece;
    }),
  };
}

describe('V1_LABEL_FAMILIES', () => {
  it('maps every v1 label to its family', () => {
    expect(V1_LABEL_FAMILIES).toEqual({
      GK: 'GK',
      LB: 'D(L)',
      CB: 'D(C)',
      RB: 'D(R)',
      LWB: 'WB(L)',
      RWB: 'WB(R)',
      DM: 'DM',
      CM: 'M(C)',
      LM: 'M(L)',
      RM: 'M(R)',
      AM: 'AM(C)',
      LW: 'AM(L)',
      RW: 'AM(R)',
      ST: 'ST',
    });
  });
});

describe('migrateV1Board', () => {
  it('turns v1 labels into families with no slot and keeps every piece', () => {
    const labels = Object.keys(V1_LABEL_FAMILIES);
    const doc = migrateV1Board(withLabels(labels));
    const mine = doc.players.filter((p) => p.team === 'mine');
    expect(mine).toHaveLength(11);
    mine.slice(0, labels.length).forEach((player, index) => {
      expect(player.family).toBe(V1_LABEL_FAMILIES[labels[index]]);
      expect(player.slot).toBeNull();
    });
    expect(doc.players).toHaveLength(22);
  });

  it('maps unknown or numeric labels to no family instead of failing', () => {
    const doc = migrateV1Board(createInitialBoard());
    expect(doc.players.every((p) => p.family === null)).toBe(true);
    expect(documentIssues(doc, FM26_DATA)).toBeNull();
  });

  it('keeps positions (clamped and rounded), custom names, keepers and the ball', () => {
    const board = createInitialBoard();
    const pieces: Piece[] = board.pieces.map((piece) => {
      if (piece.id === 'mine-1')
        return { ...piece, label: 'ST', position: { x: 12.3456, y: 34.5678 }, name: 'Ada' };
      if (piece.id === 'mine-2') return { ...piece, position: { x: -5, y: 400 } };
      if (piece.id === 'mine-3') return { ...piece, isKeeper: true, label: '3' };
      if (piece.type === 'ball') return { ...piece, position: { x: 20.555, y: 40 } };
      return piece;
    });
    const doc = migrateV1Board({ ...board, pieces, keeper: { mine: true, opponent: false } });
    const byId = (id: string) => doc.players.find((p) => p.id === id)!;
    expect(byId('mine-1')).toMatchObject({
      base: { x: 12.35, y: 34.57 },
      customName: 'Ada',
      family: 'ST',
    });
    expect(byId('mine-2').base).toEqual({ x: 0, y: 100 });
    expect(byId('mine-3')).toMatchObject({ isKeeper: true, family: 'GK' });
    expect(byId('mine-4').base).toBeUndefined();
    expect(doc.ball).toEqual({ x: 20.56, y: 40 });
    expect(doc.teams.mine.keeper).toBe(true);
    expect(doc.teams.opponent.keeper).toBe(false);
    expect(documentIssues(doc, FM26_DATA)).toBeNull();
  });

  it('puts the ball at the centre when v1 never placed it', () => {
    const doc = migrateV1Board(createInitialBoard());
    expect(doc.ball).toEqual({ x: 38.1, y: 50 });
  });

  it('keeps the squad sizes and gives default names, formation and attacker', () => {
    const board = { ...createInitialBoard(), squad: { mine: 20 as const, opponent: 26 as const } };
    const doc = migrateV1Board(board);
    expect(doc.teams.mine).toMatchObject({
      squadSize: 20,
      formationId: null,
      applied: null,
      name: 'My team',
    });
    expect(doc.teams.opponent.squadSize).toBe(26);
    expect(doc.attacker).toBe('mine');
    expect(doc.scenario).toBeNull();
  });

  it('sets default roles by possession for pieces that have a family', () => {
    const doc = migrateV1Board(withLabels(['ST']));
    const mineST = doc.players.find((p) => p.id === 'mine-1')!;
    const role = FM26_DATA.roles.find((r) => r.id === mineST.role)!;
    expect(role.possession).toBe('in');
    expect(role.families).toContain('ST');
    expect(doc.players.find((p) => p.id === 'mine-2')!.role).toBeUndefined();
    expect(documentIssues(doc, FM26_DATA)).toBeNull();
  });
});

describe('MIGRATIONS[1]', () => {
  it('migrates a v1 slot entry to version 2', () => {
    const slot = { id: 'a', name: 'Alpha', savedAt: 5, board: createInitialBoard() };
    const result = MIGRATIONS[1]({ version: 1, slot });
    expect(result.version).toBe(2);
    expect(result.slot).toMatchObject({ id: 'a', name: 'Alpha', savedAt: 5 });
    expect((result.slot as { board: { teams: unknown } }).board.teams).toBeDefined();
  });

  it('leaves an unreadable v1 entry untouched so validation can skip it', () => {
    const result = MIGRATIONS[1]({ version: 1, slot: { nope: true } });
    expect(result).toEqual({ version: 2, slot: { nope: true } });
  });
});

describe('runMigrations', () => {
  it('walks the chain until the target version', () => {
    const chain: Record<number, Migration> = {
      1: (data) => ({ ...data, version: 2 }),
      2: (data) => ({ ...data, version: 3 }),
    };
    expect(runMigrations({ version: 1, slot: 'x' }, chain, 3)).toEqual({ version: 3, slot: 'x' });
  });

  it('returns the entry as is when already at the target', () => {
    const entry = { version: 2, slot: 'x' };
    expect(runMigrations(entry, {}, 2)).toBe(entry);
  });

  it('returns null when no migration path exists or the version is newer', () => {
    expect(runMigrations({ version: 5, slot: 1 }, {}, 2)).toBeNull();
    expect(runMigrations({ version: 1, slot: 1 }, {}, 2)).toBeNull();
    expect(runMigrations({ version: 9, slot: 1 }, MIGRATIONS, 2)).toBeNull();
  });
});
