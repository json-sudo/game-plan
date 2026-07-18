import { describe, expect, it } from 'vitest';
import { FORMATIONS, getFormation, mirrorSlot } from './formations';
import { boardReducer, createInitialBoard, subNumber } from './boardReducer';
import type { BoardState, Team } from './types';

const EXPECTED_LABELS: Record<string, string[]> = {
  '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
  '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
  '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LWB', 'CM', 'CM', 'CM', 'RWB', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'DM', 'LW', 'AM', 'RW', 'ST'],
  '5-3-2': ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'ST', 'ST'],
};

const placedPlayers = (state: BoardState, team: Team) =>
  state.pieces.filter((p) => p.team === team && p.type === 'player' && p.position !== undefined);

describe('formation config', () => {
  it('defines the five decided formations', () => {
    expect(FORMATIONS.map((f) => f.name)).toEqual(['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2']);
  });

  it.each(FORMATIONS)('$name has 11 slots with the decided labels, inside my half', (formation) => {
    expect(formation.slots).toHaveLength(11);
    expect(formation.slots.map((s) => s.label)).toEqual(EXPECTED_LABELS[formation.name]);
    for (const slot of formation.slots) {
      expect(slot.x).toBeGreaterThan(0);
      expect(slot.x).toBeLessThan(76.19);
      expect(slot.y).toBeGreaterThanOrEqual(50);
      expect(slot.y).toBeLessThan(100);
    }
  });
});

describe('APPLY_FORMATION', () => {
  it('places 10 outfield starters at slots, relabels them, and records the formation', () => {
    const state = boardReducer(createInitialBoard(), {
      type: 'APPLY_FORMATION',
      team: 'mine',
      name: '4-3-3',
    });
    const placed = placedPlayers(state, 'mine');
    expect(placed).toHaveLength(10);
    expect(placed.map((p) => p.label).sort()).toEqual(
      EXPECTED_LABELS['4-3-3'].slice(1).slice().sort(),
    );
    expect(state.formation?.mine).toBe('4-3-3');
    const slots = getFormation('4-3-3')!.slots.filter((s) => s.label !== 'GK');
    for (const piece of placed) {
      expect(slots.some((s) => s.x === piece.position!.x && s.y === piece.position!.y)).toBe(true);
    }
  });

  it('repositions starters that were already placed', () => {
    let state = boardReducer(createInitialBoard(), {
      type: 'PLACE_PIECE',
      id: 'mine-1',
      position: { x: 5, y: 55 },
    });
    state = boardReducer(state, { type: 'APPLY_FORMATION', team: 'mine', name: '4-4-2' });
    const piece = state.pieces.find((p) => p.id === 'mine-1')!;
    expect(piece.position).not.toEqual({ x: 5, y: 55 });
  });

  it('places the GK only when the keeper is on, and never flips the toggle', () => {
    const noKeeper = boardReducer(createInitialBoard(), {
      type: 'APPLY_FORMATION',
      team: 'mine',
      name: '4-3-3',
    });
    expect(placedPlayers(noKeeper, 'mine')).toHaveLength(10);
    expect(noKeeper.keeper.mine).toBe(false);

    let withKeeper = boardReducer(createInitialBoard(), { type: 'SET_KEEPER', team: 'mine', on: true });
    withKeeper = boardReducer(withKeeper, { type: 'APPLY_FORMATION', team: 'mine', name: '4-3-3' });
    expect(placedPlayers(withKeeper, 'mine')).toHaveLength(11);
    const gk = withKeeper.pieces.find((p) => p.team === 'mine' && p.isKeeper)!;
    expect(gk.position).toEqual({ x: 76.19 / 2, y: 94 });
    expect(withKeeper.keeper.mine).toBe(true);
  });

  it('leaves subs and the other team untouched', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 20 });
    const opponentBefore = state.pieces.filter((p) => p.team === 'opponent');
    state = boardReducer(state, { type: 'APPLY_FORMATION', team: 'mine', name: '3-5-2' });
    const subs = state.pieces.filter((p) => p.team === 'mine' && subNumber(p) !== null);
    expect(subs.every((p) => p.position === undefined)).toBe(true);
    expect(subs.map((p) => p.label)).toEqual(Array.from({ length: 9 }, (_, i) => `S${i + 1}`));
    expect(state.pieces.filter((p) => p.team === 'opponent')).toEqual(opponentBefore);
    expect(state.pieces.find((p) => p.type === 'ball')!.position).toBeUndefined();
  });

  it('mirrors the shape for the opponent (top half)', () => {
    const mine = boardReducer(createInitialBoard(), {
      type: 'APPLY_FORMATION',
      team: 'mine',
      name: '4-2-3-1',
    });
    const opp = boardReducer(createInitialBoard(), {
      type: 'APPLY_FORMATION',
      team: 'opponent',
      name: '4-2-3-1',
    });
    const minePositions = placedPlayers(mine, 'mine').map((p) => p.position!);
    const oppPositions = placedPlayers(opp, 'opponent').map((p) => p.position!);
    expect(oppPositions).toHaveLength(10);
    for (const pos of oppPositions) {
      expect(pos.y).toBeLessThan(50);
      expect(
        minePositions.some(
          (m) => Math.abs(76.19 - m.x - pos.x) < 1e-9 && Math.abs(100 - m.y - pos.y) < 1e-9,
        ),
      ).toBe(true);
    }
  });

  it('keeps the recorded formation after a manual drag', () => {
    let state = boardReducer(createInitialBoard(), {
      type: 'APPLY_FORMATION',
      team: 'mine',
      name: '4-3-3',
    });
    state = boardReducer(state, { type: 'PLACE_PIECE', id: 'mine-1', position: { x: 30, y: 40 } });
    expect(state.formation?.mine).toBe('4-3-3');
  });

  it('regression: shrinking the squad with a formation applied removes only subs', () => {
    let state = boardReducer(createInitialBoard(), { type: 'SET_SQUAD', team: 'mine', size: 26 });
    state = boardReducer(state, { type: 'APPLY_FORMATION', team: 'mine', name: '4-3-3' });
    const startersBefore = placedPlayers(state, 'mine');
    expect(startersBefore).toHaveLength(10);
    state = boardReducer(state, { type: 'SET_SQUAD', team: 'mine', size: 11 });
    expect(placedPlayers(state, 'mine')).toEqual(startersBefore);
    expect(state.pieces.filter((p) => p.team === 'mine' && subNumber(p) !== null)).toHaveLength(0);
  });

  it('mirrorSlot point-mirrors coordinates', () => {
    expect(mirrorSlot({ label: 'ST', x: 28, y: 55 })).toEqual({ x: 76.19 - 28, y: 45 });
  });
});
