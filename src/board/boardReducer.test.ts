import { describe, expect, it } from 'vitest';
import { boardReducer, createInitialBoard, subNumber } from './boardReducer';
import type { BoardState } from './types';

const teamPieces = (state: BoardState, team: 'mine' | 'opponent') =>
  state.pieces.filter((p) => p.team === team && p.type === 'player');

const subLabels = (state: BoardState, team: 'mine' | 'opponent') =>
  teamPieces(state, team)
    .filter((p) => subNumber(p) !== null)
    .map((p) => p.label);

describe('PLACE_PIECE / BENCH_PIECE', () => {
  it('PLACE_PIECE sets position immutably', () => {
    const initial = createInitialBoard();
    const next = boardReducer(initial, {
      type: 'PLACE_PIECE',
      id: 'mine-1',
      position: { x: 30, y: 25 },
    });
    expect(next.pieces.find((p) => p.id === 'mine-1')?.position).toEqual({ x: 30, y: 25 });
    expect(initial.pieces.find((p) => p.id === 'mine-1')?.position).toBeUndefined();
    expect(next).not.toBe(initial);
  });

  it('BENCH_PIECE clears position', () => {
    const placed = boardReducer(createInitialBoard(), {
      type: 'PLACE_PIECE',
      id: 'mine-1',
      position: { x: 30, y: 25 },
    });
    const next = boardReducer(placed, { type: 'BENCH_PIECE', id: 'mine-1' });
    const piece = next.pieces.find((p) => p.id === 'mine-1')!;
    expect(piece.position).toBeUndefined();
    expect('position' in piece).toBe(false);
  });
});

describe('SET_SQUAD', () => {
  it('growing 11→20 appends S1…S9', () => {
    const next = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 20 });
    expect(subLabels(next, 'mine')).toEqual(Array.from({ length: 9 }, (_, i) => `S${i + 1}`));
    expect(next.squad.mine).toBe(20);
    expect(subLabels(next, 'opponent')).toEqual([]);
  });

  it('growing again 20→26 continues at S10', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 20 });
    state = boardReducer(state, { type: 'SET_SQUAD', team: 'mine', size: 26 });
    expect(subLabels(state, 'mine')).toEqual(Array.from({ length: 15 }, (_, i) => `S${i + 1}`));
  });

  it('shrinking removes highest-numbered subs first and never touches the starters', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 26 });
    state = boardReducer(state, { type: 'SET_SQUAD', team: 'mine', size: 20 });
    expect(subLabels(state, 'mine')).toEqual(Array.from({ length: 9 }, (_, i) => `S${i + 1}`));
    state = boardReducer(state, { type: 'SET_SQUAD', team: 'mine', size: 11 });
    expect(subLabels(state, 'mine')).toEqual([]);
    expect(teamPieces(state, 'mine').map((p) => p.label)).toEqual([
      'CB',
      'CB',
      'LB',
      'RB',
      'CM',
      'CM',
      'LW',
      'RW',
      'ST',
      'DM',
    ]);
  });

  it('shrinking removes benched subs before placed ones', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 26 });
    // Place the two highest subs; shrinking to 20 must remove 6 pieces,
    // preferring the 13 benched subs (highest first) over the placed S14/S15.
    state = boardReducer(state, {
      type: 'PLACE_PIECE',
      id: 'mine-s15',
      position: { x: 10, y: 10 },
    });
    state = boardReducer(state, {
      type: 'PLACE_PIECE',
      id: 'mine-s14',
      position: { x: 20, y: 10 },
    });
    state = boardReducer(state, { type: 'SET_SQUAD', team: 'mine', size: 20 });
    expect(subLabels(state, 'mine')).toEqual([
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'S7',
      'S14',
      'S15',
    ]);
  });
});

describe('CLEAR_PITCH', () => {
  it('removes position from all pieces and changes nothing else', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 20 });
    state = boardReducer(state, { type: 'SET_KEEPER', team: 'opponent', on: true });
    state = boardReducer(state, { type: 'APPLY_FORMATION', team: 'mine', name: '4-3-3' });
    state = boardReducer(state, { type: 'APPLY_FORMATION', team: 'opponent', name: '4-4-2' });
    state = boardReducer(state, { type: 'PLACE_PIECE', id: 'ball', position: { x: 38, y: 50 } });

    const next = boardReducer(state, { type: 'CLEAR_PITCH' });
    expect(next.pieces.some((p) => 'position' in p)).toBe(false);
    expect(next.pieces).toEqual(state.pieces.map(({ position: _position, ...rest }) => rest));
    expect(next.squad).toEqual(state.squad);
    expect(next.keeper).toEqual(state.keeper);
    expect(next.formation).toEqual({ mine: '4-3-3', opponent: '4-4-2' });
  });

  it('is a no-op on an already-empty pitch', () => {
    const initial = createInitialBoard();
    expect(boardReducer(initial, { type: 'CLEAR_PITCH' })).toBe(initial);
  });
});

describe('RESET_BOARD', () => {
  it('returns the initial board from any starting state', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 26 });
    state = boardReducer(state, { type: 'SET_SQUAD', team: 'opponent', size: 20 });
    state = boardReducer(state, { type: 'SET_KEEPER', team: 'mine', on: true });
    state = boardReducer(state, { type: 'SET_KEEPER', team: 'opponent', on: true });
    state = boardReducer(state, {
      type: 'APPLY_MATCHUP',
      attacker: 'mine',
      formations: { mine: '4-3-3', opponent: '3-5-2' },
    });

    expect(boardReducer(state, { type: 'RESET_BOARD' })).toEqual(createInitialBoard());
  });
});

describe('SET_KEEPER', () => {
  it('defaults to off — the initial board has no keepers', () => {
    const state = createInitialBoard();
    expect(state.keeper).toEqual({ mine: false, opponent: false });
    expect(state.pieces.some((p) => p.isKeeper)).toBe(false);
    expect(teamPieces(state, 'mine')).toHaveLength(10);
  });

  it('on adds a benched GK', () => {
    const state = boardReducer(createInitialBoard(), {
      type: 'SET_KEEPER',
      team: 'mine',
      on: true,
    });
    const gk = state.pieces.find((p) => p.team === 'mine' && p.isKeeper)!;
    expect(gk.label).toBe('GK');
    expect(gk.position).toBeUndefined();
    expect(teamPieces(state, 'mine')).toHaveLength(11);
    expect(teamPieces(state, 'opponent')).toHaveLength(10);
  });

  it('off removes the GK even when placed', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_KEEPER', team: 'mine', on: true });
    state = boardReducer(state, { type: 'PLACE_PIECE', id: 'mine-gk', position: { x: 5, y: 25 } });
    state = boardReducer(state, { type: 'SET_KEEPER', team: 'mine', on: false });
    expect(state.pieces.find((p) => p.team === 'mine' && p.isKeeper)).toBeUndefined();
    expect(state.keeper.mine).toBe(false);
    expect(teamPieces(state, 'mine')).toHaveLength(10);
  });
});
