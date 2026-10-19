import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { PITCH_TARGET_MARGIN } from '../engine';
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
    expect(initialUi('fm')).toMatchObject({ mode: 'fm', phase: 'shape', playing: false });
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

  it('clears an in-flight pitch action when redoing a document change', () => {
    const store = blankStore();
    store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    store.getState().undo();
    store.getState().patchUi({ action: { type: 'dribble', direction: 'forward' } });

    store.getState().redo();

    expect(store.getState().doc.teams.mine.name).toBe('Reds');
    expect(store.getState().ui.action).toBeNull();
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

  it('undoing a ball placement, a pass and a dribble each revert one step', () => {
    const store = exampleStore();
    const start = store.getState().doc;
    const { dispatch, undo } = store.getState();
    dispatch({ type: 'tapZone', zone: 'R-M' });
    dispatch({ type: 'pass', receiverId: exampleSlotId('mine', 'DR') });
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

  it('reset restores the applied layout and undo brings the edit back', () => {
    const store = blankStore();
    const { dispatch, undo } = store.getState();
    dispatch({ type: 'clearScenario' });
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
    store.getState().patchUi({ phase: 'runs', selectedPlayerId: MINE_ST, arrows: 'selected' });
    const state = store.getState();
    expect(state.ui).toMatchObject({
      phase: 'runs',
      selectedPlayerId: MINE_ST,
      arrows: 'selected',
    });
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

describe('ball actions', () => {
  it('starts a pass or dribble only in FM mode with a carrier', () => {
    const store = exampleStore();
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('mine', 'DR') });
    expect(store.getState().ui.action).toEqual({
      type: 'pass',
      receiverId: exampleSlotId('mine', 'DR'),
    });

    const open = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'openPitch' } });
    open.getState().startAction({ type: 'dribble', direction: 'forward' });
    expect(open.getState().ui.action).toBeNull();

    const noCarrier = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'fm' } });
    noCarrier.getState().startAction({ type: 'dribble', direction: 'forward' });
    expect(noCarrier.getState().ui.action).toBeNull();
  });

  it('does not start an action the document would refuse', () => {
    const store = exampleStore();
    store.getState().startAction({ type: 'pass', receiverId: 'ghost' });
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('mine', 'AMCR') });
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('opponent', 'ST') });
    expect(store.getState().ui.action).toBeNull();
  });

  it('does not start a dribble that cannot move the ball', () => {
    const base = createExampleDocument();
    const cornered = {
      ...base,
      ball: { x: PITCH_TARGET_MARGIN, y: PITCH_TARGET_MARGIN },
      scenario: { zone: 'L-F' as const, carrierId: exampleSlotId('mine', 'AMCL') },
    };
    const store = createPitchStore({ doc: cornered, ui: { mode: 'fm' } });
    store.getState().startAction({ type: 'dribble', direction: 'forward-left' });
    expect(store.getState().ui.action).toBeNull();
  });

  it('leaves the document alone until the action is committed', () => {
    const store = exampleStore();
    const before = store.getState().doc;
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('mine', 'DR') });
    expect(store.getState().doc).toBe(before);
    expect(store.getState().history.past).toHaveLength(0);
  });

  it('ignores a second action while one is running', () => {
    const store = exampleStore();
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('mine', 'DR') });
    store.getState().startAction({ type: 'dribble', direction: 'forward' });
    expect(store.getState().ui.action).toEqual({
      type: 'pass',
      receiverId: exampleSlotId('mine', 'DR'),
    });
  });

  it('commits a pass as one undoable step and clears the action', () => {
    const store = exampleStore();
    const before = store.getState().tactic;
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('mine', 'DR') });
    store.getState().commitAction();
    const { doc, ui, history } = store.getState();
    expect(ui.action).toBeNull();
    expect(doc.scenario?.carrierId).toBe(exampleSlotId('mine', 'DR'));
    expect(history.past).toEqual([{ tactic: before, mode: 'fm' }]);
  });

  it('commits a dribble through the same path', () => {
    const store = exampleStore();
    const before = store.getState().doc;
    store.getState().startAction({ type: 'dribble', direction: 'forward' });
    store.getState().commitAction();
    const { doc, ui } = store.getState();
    expect(ui.action).toBeNull();
    expect(doc.ball.y).toBeLessThan(before.ball.y);
    expect(doc.scenario?.carrierId).toBe(before.scenario?.carrierId);
  });

  it('does nothing on commit without a running action', () => {
    const store = exampleStore();
    const before = store.getState();
    before.commitAction();
    expect(store.getState().doc).toBe(before.doc);
  });

  it('drops a refused action without adding an undo step', () => {
    const store = exampleStore();
    store.getState().startAction({ type: 'pass', receiverId: 'ghost' });
    store.getState().commitAction();
    expect(store.getState().ui.action).toBeNull();
    expect(store.getState().history.past).toHaveLength(0);
  });

  it('cancels a running action without touching the document', () => {
    const store = exampleStore();
    const before = store.getState().doc;
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('mine', 'DR') });
    store.getState().cancelAction();
    expect(store.getState().ui.action).toBeNull();
    expect(store.getState().doc).toBe(before);
  });

  it('abandons a running action when the mode changes or the user undoes', () => {
    const store = exampleStore();
    store.getState().startAction({ type: 'pass', receiverId: exampleSlotId('mine', 'DR') });
    store.getState().setMode('openPitch');
    expect(store.getState().ui.action).toBeNull();
    store.getState().setMode('fm');
    store.getState().dispatch({ type: 'tapZone', zone: 'R-M' });
    store.getState().startAction({ type: 'dribble', direction: 'forward' });
    store.getState().undo();
    expect(store.getState().ui.action).toBeNull();
  });
});
