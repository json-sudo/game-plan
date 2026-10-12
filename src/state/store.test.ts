import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { createExampleDocument } from './example';
import { createInitialDocument, playersOf, type BoardDocument } from './document';
import { HISTORY_LIMIT } from './history';
import { createBoardStore, initialUi } from './store';

function blankStore() {
  return createBoardStore({ doc: createInitialDocument() });
}

function exampleStore() {
  return createBoardStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
}

describe('initial state', () => {
  it('starts in sandbox mode with an empty history unless told otherwise', () => {
    const store = blankStore();
    const state = store.getState();
    expect(state.ui).toEqual(initialUi('sandbox'));
    expect(state.history).toEqual({ past: [], future: [] });
    expect(state.doc).toEqual(createInitialDocument());
  });

  it('applies ui overrides', () => {
    expect(exampleStore().getState().ui.mode).toBe('fm');
    expect(initialUi('fm')).toMatchObject({ mode: 'fm', phase: 'shape', playing: false });
  });
});

describe('dispatch', () => {
  it('commits one history entry per user action', () => {
    const store = blankStore();
    const before = store.getState().doc;
    store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    const state = store.getState();
    expect(state.doc.teams.mine.name).toBe('Reds');
    expect(state.history.past).toEqual([before]);
  });

  it('does not add history for an action that changes nothing', () => {
    const store = blankStore();
    store.getState().dispatch({ type: 'clearScenario' });
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

  it('undoing a scenario apply restores the previous ball and carrier', () => {
    const store = exampleStore();
    const before = store.getState().doc;
    store.getState().dispatch({ type: 'tapZone', zone: 'L-D' });
    const applied = store.getState().doc;
    expect(applied.ball).not.toEqual(before.ball);
    expect(applied.scenario?.zone).toBe('L-D');
    store.getState().undo();
    expect(store.getState().doc).toBe(before);
    expect(store.getState().doc.scenario).toEqual(before.scenario);
    store.getState().redo();
    expect(store.getState().doc).toBe(applied);
  });

  it('undoing a ball drag, a pass and a dribble each revert one step', () => {
    const store = exampleStore();
    const start = store.getState().doc;
    const { dispatch, undo } = store.getState();
    dispatch({ type: 'dragBall', point: { x: 20, y: 40 } });
    const receiver = playersOf(store.getState().doc, 'mine').find(
      (p) => p.id !== store.getState().doc.scenario!.carrierId && !p.isKeeper,
    )!;
    dispatch({ type: 'pass', receiverId: receiver.id });
    dispatch({ type: 'dribble', direction: 'forward' });
    expect(store.getState().history.past).toHaveLength(3);
    undo();
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

  it('undoing a role change restores the old role', () => {
    const store = exampleStore();
    const before = store.getState().doc.players.find((p) => p.id === 'mine-ST')!.role;
    const other = FM26_DATA.roles.find(
      (r) => r.possession === 'in' && r.families.includes('ST') && r.id !== before,
    )!;
    store.getState().dispatch({ type: 'setRole', playerId: 'mine-ST', roleId: other.id });
    expect(store.getState().doc.players.find((p) => p.id === 'mine-ST')!.role).toBe(other.id);
    store.getState().undo();
    expect(store.getState().doc.players.find((p) => p.id === 'mine-ST')!.role).toBe(before);
  });

  it('loading a document is undoable', () => {
    const store = blankStore();
    const loaded: BoardDocument = createExampleDocument();
    store.getState().dispatch({ type: 'loadDocument', doc: loaded });
    expect(store.getState().doc).toBe(loaded);
    store.getState().undo();
    expect(store.getState().doc).toEqual(createInitialDocument());
  });
});

describe('ui state', () => {
  it('patchUi changes only the ui and never touches history', () => {
    const store = exampleStore();
    store.getState().patchUi({ phase: 'runs', selectedPlayerId: 'mine-ST', arrows: 'selected' });
    const state = store.getState();
    expect(state.ui).toMatchObject({
      phase: 'runs',
      selectedPlayerId: 'mine-ST',
      arrows: 'selected',
    });
    expect(state.history.past).toHaveLength(0);
  });

  it('entering FM mode fills default roles, leaving it keeps them', () => {
    const store = blankStore();
    store
      .getState()
      .dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    expect(store.getState().doc.players.some((p) => p.role !== undefined)).toBe(false);
    store.getState().setMode('fm');
    expect(store.getState().ui.mode).toBe('fm');
    expect(
      playersOf(store.getState().doc, 'mine')
        .filter((p) => p.base)
        .every((p) => p.role !== undefined),
    ).toBe(true);
    store.getState().setMode('sandbox');
    expect(store.getState().ui.mode).toBe('sandbox');
    expect(playersOf(store.getState().doc, 'mine').some((p) => p.role !== undefined)).toBe(true);
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
    beginDrag({ kind: 'player', id: 'mine-ST' }, { x: 30, y: 20 });
    updateDrag({ x: 31, y: 21 });
    updateDrag({ x: 32, y: 22 });
    expect(store.getState().ui.drag?.point).toEqual({ x: 32, y: 22 });
    expect(store.getState().doc).toBe(start);
    expect(store.getState().history.past).toHaveLength(0);
    endDrag();
    const state = store.getState();
    expect(state.ui.drag).toBeNull();
    expect(state.doc.players.find((p) => p.id === 'mine-ST')!.base).toEqual({ x: 32, y: 22 });
    expect(state.history.past).toHaveLength(1);
  });

  it('commits a ball drag as a scenario change', () => {
    const store = exampleStore();
    store.getState().beginDrag({ kind: 'ball' }, { x: 10, y: 90 });
    store.getState().endDrag();
    expect(store.getState().doc.ball).toEqual({ x: 10, y: 90 });
    expect(store.getState().doc.scenario?.zone).toBe('L-D');
  });

  it('cancelDrag discards the live position without a commit', () => {
    const store = exampleStore();
    store.getState().beginDrag({ kind: 'player', id: 'mine-ST' }, { x: 1, y: 1 });
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
