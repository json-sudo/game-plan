import { describe, expect, it } from 'vitest';
import { createExampleDocument } from './example';
import { createInitialDocument } from './document';
import {
  selectCanRedo,
  selectCanUndo,
  selectDisplayPositions,
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

  it('shows the placed base positions and the live drag position', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    const state = store.getState();
    const base = selectDisplayPositions(state);
    expect(base.get(MINE_GK)).toEqual(state.doc.players.find((p) => p.id === MINE_GK)!.base);
    store.getState().beginDrag({ kind: 'player', id: MINE_ST }, { x: 5, y: 6 });
    const dragged = selectDisplayPositions(store.getState());
    expect(dragged.get(MINE_ST)).toEqual({ x: 5, y: 6 });
    expect(dragged.get(MINE_GK)).toEqual(base.get(MINE_GK));
  });

  it('returns the same drag positions until the drag changes', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    store.getState().beginDrag({ kind: 'player', id: MINE_ST }, { x: 5, y: 6 });
    const dragged = selectDisplayPositions(store.getState());
    expect(selectDisplayPositions(store.getState())).toBe(dragged);
    store.getState().updateDrag({ x: 7, y: 8 });
    const moved = selectDisplayPositions(store.getState());
    expect(moved).not.toBe(dragged);
    expect(moved.get(MINE_ST)).toEqual({ x: 7, y: 8 });
  });
});
