import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { computePhases, type PhaseInput } from '../engine';
import { phasePlayersOf } from './context';
import { createExampleDocument } from './example';
import { createInitialDocument } from './document';
import {
  selectCanRedo,
  selectCanUndo,
  selectDisplayPositions,
  selectPhasePositions,
  selectTeamPlayers,
} from './selectors';
import { createPitchStore } from './store';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const MINE_GK = exampleSlotId('mine', 'GK');
const MINE_ST = exampleSlotId('mine', 'ST');

describe('selectPhasePositions', () => {
  it('matches the engine for the example pitch and keeps the carrier on the ball', () => {
    const doc = createExampleDocument();
    const phases = selectPhasePositions(doc);
    const input: PhaseInput = {
      attacker: doc.attacker,
      players: phasePlayersOf(doc, FM26_DATA),
      ball: doc.ball,
      carrierId: doc.scenario!.carrierId,
      tables: {
        movement: FM26_DATA.movement,
        shapeLineShift: FM26_DATA.shapeLineShift,
        lineShift: FM26_DATA.lineShift,
      },
    };
    expect(phases).toEqual(computePhases(input).positions);
    for (const phase of ['shape', 'runs', 'final'] as const) {
      expect(phases[phase].get(doc.scenario!.carrierId)).toEqual(doc.ball);
    }
  });

  it('is memoised on the document reference', () => {
    const doc = createExampleDocument();
    expect(selectPhasePositions(doc)).toBe(selectPhasePositions(doc));
    expect(selectPhasePositions({ ...doc })).not.toBe(selectPhasePositions(doc));
  });

  it('gives the base shape in every phase when there is no scenario', () => {
    const doc = { ...createExampleDocument(), scenario: null };
    const phases = selectPhasePositions(doc);
    const st = doc.players.find((p) => p.id === MINE_ST)!;
    expect(phases.shape.get(MINE_ST)).toEqual(st.base);
    expect(phases.final.get(MINE_ST)).toEqual(st.base);
  });

  it('moves players between shape and final when a zone with movement data is applied', () => {
    const doc = createExampleDocument();
    const phases = selectPhasePositions(doc);
    const moved = [...phases.final].some(([id, point]) => {
      const shape = phases.shape.get(id)!;
      return shape.x !== point.x || shape.y !== point.y;
    });
    expect(moved).toBe(true);
  });
});

describe('store selectors', () => {
  it('reports whether undo and redo are available', () => {
    const store = createPitchStore({ doc: createInitialDocument() });
    expect(selectCanUndo(store.getState())).toBe(false);
    expect(selectCanRedo(store.getState())).toBe(false);
    store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'A' });
    expect(selectCanUndo(store.getState())).toBe(true);
    store.getState().undo();
    expect(selectCanRedo(store.getState())).toBe(true);
  });

  it('lists the players of a team and keeps the array stable per document', () => {
    const state = createPitchStore({ doc: createExampleDocument() }).getState();
    const mine = selectTeamPlayers(state.doc, 'mine');
    expect(mine).toHaveLength(11);
    expect(selectTeamPlayers(state.doc, 'mine')).toBe(mine);
    expect(mine.every((p) => p.team === 'mine')).toBe(true);
  });

  it('shows positions for the current phase and the live drag position', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { phase: 'final' } });
    const state = store.getState();
    expect(selectDisplayPositions(state)).toBe(selectPhasePositions(state.doc).final);
    store.getState().beginDrag({ kind: 'player', id: MINE_ST }, { x: 5, y: 6 });
    const dragged = selectDisplayPositions(store.getState());
    expect(dragged.get(MINE_ST)).toEqual({ x: 5, y: 6 });
    expect(dragged.get(MINE_GK)).toEqual(selectPhasePositions(state.doc).final.get(MINE_GK));
  });

  it('returns the same drag positions until the drag or phase changes', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { phase: 'final' } });
    store.getState().beginDrag({ kind: 'player', id: MINE_ST }, { x: 5, y: 6 });
    const dragged = selectDisplayPositions(store.getState());
    expect(selectDisplayPositions(store.getState())).toBe(dragged);
    store.getState().patchUi({ phase: 'shape' });
    const shape = selectDisplayPositions(store.getState());
    expect(shape).not.toBe(dragged);
    expect(selectDisplayPositions(store.getState())).toBe(shape);
    store.getState().updateDrag({ x: 7, y: 8 });
    const moved = selectDisplayPositions(store.getState());
    expect(moved).not.toBe(shape);
    expect(moved.get(MINE_ST)).toEqual({ x: 7, y: 8 });
  });
});
