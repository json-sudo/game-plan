import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { createExampleDocument } from './example';
import { createInitialDocument } from './document';
import { HISTORY_LIMIT } from './history';
import { createPitchStore, initialUi } from './store';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const MINE_ST = exampleSlotId('mine', 'ST');

function blankStore() {
  return createPitchStore({ doc: createInitialDocument() });
}

function exampleStore() {
  return createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
}

describe('initial state', () => {
  it('starts in openPitch mode with an empty history unless told otherwise', () => {
    const store = blankStore();
    const state = store.getState();
    expect(state.ui).toEqual(initialUi('openPitch'));
    expect(state.history).toEqual({ past: [], future: [] });
    expect(state.doc).toEqual(createInitialDocument());
  });

  it('applies ui overrides', () => {
    expect(exampleStore().getState().ui.mode).toBe('fm');
    expect(initialUi('fm')).toMatchObject({ mode: 'fm' });
  });
});

describe('dispatch', () => {
  it('commits one history entry per user action', () => {
    const store = blankStore();
    const before = store.getState().tactic;
    store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    const state = store.getState();
    expect(state.doc.teams.mine.name).toBe('Reds');
    expect(state.history.past).toEqual([{ tactic: before, mode: 'openPitch' }]);
  });

  it('does not add history for an action that changes nothing', () => {
    const store = blankStore();
    store.getState().dispatch({ type: 'clearPitch' });
    expect(store.getState().history.past).toHaveLength(0);
  });

  it('caps the history at the limit', () => {
    const store = blankStore();
    for (let index = 0; index < HISTORY_LIMIT + 10; index += 1) {
      store.getState().dispatch({
        type: 'movePlayer',
        playerId: 'mine-1',
        point: { x: 10 + index * 0.5, y: 30 },
      });
    }
    expect(store.getState().history.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe('undo and redo', () => {
  it('undo reverts the last action and redo restores it', () => {
    const store = blankStore();
    const { dispatch, undo, redo } = store.getState();
    dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    undo();
    expect(store.getState().doc.teams.mine.name).toBe('My team');
    redo();
    expect(store.getState().doc.teams.mine.name).toBe('Reds');
  });

  it('does nothing at the ends of the history', () => {
    const store = blankStore();
    const initial = store.getState();
    initial.undo();
    initial.redo();
    expect(store.getState().doc).toBe(initial.doc);
    expect(store.getState().history).toEqual({ past: [], future: [] });
  });

  it('a new action after undo clears the redo stack', () => {
    const store = blankStore();
    const { dispatch, undo } = store.getState();
    dispatch({ type: 'renameTeam', team: 'mine', name: 'A' });
    undo();
    dispatch({ type: 'renameTeam', team: 'mine', name: 'B' });
    expect(store.getState().history.future).toHaveLength(0);
  });

  it('undoing a zone pick restores the previous ball and zone', () => {
    const store = exampleStore();
    const before = store.getState().doc;
    store.getState().dispatch({ type: 'tapZone', zone: 'R-M' });
    const applied = store.getState().doc;
    expect(applied.ball).not.toEqual(before.ball);
    expect(applied.scenario?.zone).toBe('R-M');
    store.getState().undo();
    expect(store.getState().doc).toBe(before);
    expect(store.getState().doc.scenario).toEqual(before.scenario);
    store.getState().redo();
    expect(store.getState().doc).toBe(applied);
  });

  it('undoing a zone pick and a ball placement each revert one step', () => {
    const store = exampleStore();
    const start = store.getState().doc;
    const { dispatch, undo } = store.getState();
    dispatch({ type: 'tapZone', zone: 'R-M' });
    dispatch({ type: 'placeBall', point: { x: 10, y: 90 } });
    expect(store.getState().history.past).toHaveLength(2);
    undo();
    undo();
    expect(store.getState().doc).toBe(start);
  });

  it('undoing an apply restores the previous layout', () => {
    const store = blankStore();
    const { dispatch, undo } = store.getState();
    dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    expect(store.getState().doc.teams.mine.formationId).toBe('4_3_3_dm_wide');
    undo();
    expect(store.getState().doc).toEqual(createInitialDocument());
  });

  it('reset restores the applied layout and undo brings the edit back', () => {
    const store = blankStore();
    const { dispatch, undo } = store.getState();
    dispatch({ type: 'clearPitch' });
    expect(store.getState().history.past).toHaveLength(0);
    dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    const applied = store.getState().doc.players.find((player) => player.id === MINE_ST)!.base;
    dispatch({ type: 'movePlayer', playerId: MINE_ST, point: { x: 1, y: 1 } });
    dispatch({ type: 'reset' });
    expect(store.getState().doc.players.find((player) => player.id === MINE_ST)!.base).toEqual(
      applied,
    );
    expect(store.getState().doc.teams.mine.applied).toBe('formation');
    undo();
    expect(store.getState().doc.players.find((player) => player.id === MINE_ST)!.base).toEqual({
      x: 1,
      y: 1,
    });
  });

  it('undoing a role change restores the old role', () => {
    const store = exampleStore();
    const before = store.getState().doc.players.find((p) => p.id === MINE_ST)!.role;
    const other = FM26_DATA.roles.find(
      (r) => r.possession === 'in' && r.families.includes('ST') && r.id !== before,
    )!;
    store.getState().dispatch({ type: 'setRole', playerId: MINE_ST, roleId: other.id });
    expect(store.getState().doc.players.find((p) => p.id === MINE_ST)!.role).toBe(other.id);
    store.getState().undo();
    expect(store.getState().doc.players.find((p) => p.id === MINE_ST)!.role).toBe(before);
  });
});

describe('ui state', () => {
  it('patchUi changes only the ui and never touches history', () => {
    const store = exampleStore();
    store.getState().patchUi({ selectedPlayerId: MINE_ST, theme: 'dark' });
    const state = store.getState();
    expect(state.ui).toMatchObject({ selectedPlayerId: MINE_ST, theme: 'dark' });
    expect(state.history.past).toHaveLength(0);
  });

  it('setMode to the current mode does nothing', () => {
    const store = exampleStore();
    const before = store.getState();
    before.setMode('fm');
    expect(store.getState()).toBe(before);
  });
});

describe('drag', () => {
  it('shows the live position in ui and commits once on release', () => {
    const store = exampleStore();
    const start = store.getState().doc;
    const { beginDrag, updateDrag, endDrag } = store.getState();
    beginDrag({ kind: 'player', id: MINE_ST }, { x: 30, y: 20 });
    updateDrag({ x: 31, y: 21 });
    updateDrag({ x: 32, y: 22 });
    expect(store.getState().ui.drag?.point).toEqual({ x: 32, y: 22 });
    expect(store.getState().doc).toBe(start);
    expect(store.getState().history.past).toHaveLength(0);
    endDrag();
    const state = store.getState();
    expect(state.ui.drag).toBeNull();
    expect(state.doc.players.find((p) => p.id === MINE_ST)!.base).toEqual({ x: 32, y: 22 });
    expect(state.history.past).toHaveLength(1);
  });

  it('commits an open pitch ball drag as a change to the ball alone', () => {
    const start = createInitialDocument();
    const store = createPitchStore({ doc: start });
    store.getState().beginDrag({ kind: 'ball' }, { x: 10, y: 90 });
    store.getState().endDrag();
    const { doc, history } = store.getState();
    expect(doc.ball).toEqual({ x: 10, y: 90 });
    expect(doc.scenario).toBeNull();
    expect(doc.players).toBe(start.players);
    expect(history.past).toHaveLength(1);
  });

  it('does not start a ball drag in FM mode, where only a zone places the ball', () => {
    const store = exampleStore();
    const before = store.getState();
    before.beginDrag({ kind: 'ball' }, { x: 10, y: 90 });
    expect(store.getState().ui.drag).toBeNull();
    store.getState().endDrag();
    expect(store.getState().doc).toBe(before.doc);
  });

  it('cancelDrag discards the live position without a commit', () => {
    const store = exampleStore();
    store.getState().beginDrag({ kind: 'player', id: MINE_ST }, { x: 1, y: 1 });
    store.getState().cancelDrag();
    expect(store.getState().ui.drag).toBeNull();
    expect(store.getState().history.past).toHaveLength(0);
  });

  it('ignores updates and releases with no active drag', () => {
    const store = exampleStore();
    const before = store.getState();
    before.updateDrag({ x: 1, y: 1 });
    before.endDrag();
    expect(store.getState().doc).toBe(before.doc);
    expect(store.getState().ui.drag).toBeNull();
  });
});

describe('removed ball state', () => {
  it('holds no phase, playing or arrows state and no action slot', () => {
    const { ui } = exampleStore().getState();
    expect(ui).not.toHaveProperty('phase');
    expect(ui).not.toHaveProperty('playing');
    expect(ui).not.toHaveProperty('arrows');
    expect(ui).not.toHaveProperty('action');
  });

  it('has no startAction, commitAction or cancelAction', () => {
    const store = exampleStore().getState();
    expect(store).not.toHaveProperty('startAction');
    expect(store).not.toHaveProperty('commitAction');
    expect(store).not.toHaveProperty('cancelAction');
  });
});
