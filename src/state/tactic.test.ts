import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { BALL_START, placedPlayers, playersOf } from './document';
import { createExampleDocument } from './example';
import { createPitchStore } from './store';
import { copyFmPositions } from './tactic-actions';
import { createExampleTactic, createInitialTactic, tacticFromDocument } from './tactic';
import { tacticIssues } from './tactic-validate';

function exampleStore() {
  return createPitchStore({ tactic: createExampleTactic(), ui: { mode: 'fm' } });
}

function positions(doc: ReturnType<typeof createExampleDocument>) {
  return placedPlayers(doc).map((player) => [player.id, player.base]);
}

describe('tactic defaults', () => {
  it('starts the open pitch empty with 11 benched players per team and the default ball', () => {
    const { openPitch } = createInitialTactic();
    expect(placedPlayers(openPitch)).toHaveLength(0);
    expect(playersOf(openPitch, 'mine')).toHaveLength(11);
    expect(playersOf(openPitch, 'opponent')).toHaveLength(11);
    expect(openPitch.ball).toEqual(BALL_START);
    expect(openPitch.scenario).toBeNull();
  });

  it('puts the example only in the FM layout', () => {
    const tactic = createExampleTactic();
    expect(placedPlayers(tactic.openPitch)).toHaveLength(0);
    expect(placedPlayers(tactic.fm)).toHaveLength(22);
    expect(tacticIssues(tactic, FM26_DATA)).toBeNull();
  });

  it('builds the other layout blank but with the same team names and squad sizes', () => {
    const doc = createPitchStore().getState().doc;
    const named = { ...doc, teams: { ...doc.teams, mine: { ...doc.teams.mine, name: 'Reds' } } };
    const tactic = tacticFromDocument(named, 'fm');
    expect(tactic.fm).toBe(named);
    expect(tactic.openPitch.teams.mine.name).toBe('Reds');
    expect(tacticIssues(tactic, FM26_DATA)).toBeNull();
  });
});

describe('independent layouts', () => {
  it('switching modes keeps both layouts and changes only the active selection', () => {
    const store = exampleStore();
    const { tactic, history } = store.getState();
    store.getState().setMode('openPitch');
    expect(store.getState().tactic).toBe(tactic);
    expect(store.getState().doc).toBe(tactic.openPitch);
    store.getState().setMode('fm');
    expect(store.getState().tactic).toBe(tactic);
    expect(store.getState().doc).toBe(tactic.fm);
    expect(store.getState().history).toBe(history);
  });

  it('an open pitch edit never touches the FM layout, and the reverse', () => {
    const store = exampleStore();
    const fmBefore = store.getState().tactic.fm;
    store.getState().setMode('openPitch');
    store.getState().dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_4_2' });
    store.getState().dispatch({ type: 'movePlayer', playerId: 'mine-ST', point: { x: 10, y: 10 } });
    expect(store.getState().tactic.fm).toBe(fmBefore);

    const openBefore = store.getState().tactic.openPitch;
    store.getState().setMode('fm');
    store.getState().dispatch({ type: 'tapZone', zone: 'L-D' });
    store.getState().dispatch({ type: 'movePlayer', playerId: 'mine-ST', point: { x: 5, y: 5 } });
    expect(store.getState().tactic.openPitch).toBe(openBefore);
  });

  it('ignores scenario and role actions in the open pitch', () => {
    const store = createPitchStore({ tactic: createExampleTactic() });
    const before = store.getState().tactic;
    const { dispatch } = store.getState();
    dispatch({ type: 'tapZone', zone: 'L-D' });
    dispatch({ type: 'setCarrier', playerId: 'mine-ST' });
    dispatch({ type: 'dribble', direction: 'forward' });
    dispatch({ type: 'fillDefaultRoles' });
    dispatch({ type: 'setRole', playerId: 'mine-ST', roleId: null });
    expect(store.getState().tactic).toBe(before);
    expect(store.getState().history.past).toHaveLength(0);
  });

  it('moves the open pitch ball on its own, never choosing a carrier or moving a piece', () => {
    const store = createPitchStore({ tactic: createExampleTactic() });
    store.getState().dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_4_2' });
    const { tactic } = store.getState();
    store.getState().dispatch({ type: 'dragBall', point: { x: 12, y: 30 } });
    const next = store.getState().tactic;
    expect(next.openPitch.ball).toEqual({ x: 12, y: 30 });
    expect(next.openPitch.scenario).toBeNull();
    expect(positions(next.openPitch)).toEqual(positions(tactic.openPitch));
    expect(next.fm).toBe(tactic.fm);
  });

  it('keeps the FM ball and scenario when the open pitch ball moves', () => {
    const store = exampleStore();
    const fm = store.getState().tactic.fm;
    store.getState().setMode('openPitch');
    store.getState().dispatch({ type: 'dragBall', point: { x: 40, y: 20 } });
    expect(store.getState().tactic.fm.ball).toEqual(fm.ball);
    expect(store.getState().tactic.fm.scenario).toEqual(fm.scenario);
  });

  it('gives open pitch pieces no roles even after a formation is applied', () => {
    const store = createPitchStore({ tactic: createExampleTactic() });
    store
      .getState()
      .dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    expect(store.getState().tactic.openPitch.players.some((p) => p.role !== undefined)).toBe(false);
    expect(tacticIssues(store.getState().tactic, FM26_DATA)).toBeNull();
  });
});

describe('shared roster', () => {
  it('shares team names and squad size between layouts', () => {
    const store = exampleStore();
    store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    store.getState().dispatch({ type: 'setSquadSize', team: 'mine', size: 20 });
    const { openPitch, fm } = store.getState().tactic;
    expect(openPitch.teams.mine.name).toBe('Reds');
    expect(openPitch.teams.mine.squadSize).toBe(20);
    expect(playersOf(openPitch, 'mine')).toHaveLength(20);
    expect(playersOf(fm, 'mine')).toHaveLength(20);
    expect(tacticIssues(store.getState().tactic, FM26_DATA)).toBeNull();
  });

  it('shares a piece name with the same piece in the other layout', () => {
    const store = createPitchStore({ tactic: createExampleTactic() });
    store
      .getState()
      .dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    store.getState().dispatch({ type: 'setPieceName', playerId: 'mine-ST', name: 'Ada' });
    const { fm } = store.getState().tactic;
    expect(fm.players.find((p) => p.id === 'mine-ST')?.customName).toBe('Ada');
    store.getState().setMode('fm');
    store.getState().dispatch({ type: 'setPieceName', playerId: 'mine-ST', name: '' });
    const openPitch = store.getState().tactic.openPitch;
    expect(openPitch.players.find((p) => p.id === 'mine-ST')?.customName).toBeUndefined();
  });

  it('lets a new piece take the name it already has in the other layout', () => {
    const store = exampleStore();
    store.getState().dispatch({ type: 'setPieceName', playerId: 'mine-ST', name: 'Ada' });
    store.getState().setMode('openPitch');
    store
      .getState()
      .dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    const { openPitch, fm } = store.getState().tactic;
    expect(openPitch.players.find((p) => p.id === 'mine-ST')?.customName).toBe('Ada');
    expect(fm.players.find((p) => p.id === 'mine-ST')?.customName).toBe('Ada');
  });
});

describe('roster changes that the other layout cannot follow', () => {
  it('drops the whole action instead of leaving the layouts disagreeing', () => {
    const store = exampleStore();
    store.getState().dispatch({ type: 'setSquadSize', team: 'mine', size: 20 });
    store.getState().setMode('openPitch');
    Array.from({ length: 12 }, (_, index) => `mine-${index + 1}`).forEach((playerId, index) => {
      store.getState().dispatch({ type: 'movePlayer', playerId, point: { x: 5 + index, y: 50 } });
    });
    store.getState().setMode('fm');
    const before = store.getState().tactic;
    store.getState().dispatch({ type: 'setSquadSize', team: 'mine', size: 11 });
    expect(store.getState().tactic).toBe(before);
    expect(tacticIssues(before, FM26_DATA)).toBeNull();
  });
});

describe('patchUi', () => {
  it('keeps the active document in step when the mode is patched', () => {
    const store = exampleStore();
    store.getState().patchUi({ mode: 'openPitch' });
    expect(store.getState().doc).toBe(store.getState().tactic.openPitch);
  });
});

describe('copyFmPositions', () => {
  function copiedStore() {
    const store = exampleStore();
    store.getState().dispatch({ type: 'tapZone', zone: 'L-D' });
    store.getState().setMode('openPitch');
    store.getState().dispatch({ type: 'dragBall', point: { x: 55, y: 12 } });
    store.getState().dispatch({ type: 'setSquadSize', team: 'mine', size: 20 });
    store.getState().copyFmPositions();
    return store;
  }

  it('places the FM starting XI at its base positions, not zone destinations', () => {
    const { tactic } = copiedStore().getState();
    const fmBases = tactic.fm.players.flatMap((p) => (p.base ? [[p.id, p.base]] : []));
    expect(positions(tactic.openPitch)).toEqual(fmBases);
    expect(tactic.openPitch.players.every((p) => p.role === undefined)).toBe(true);
  });

  it('keeps the open pitch ball, the FM layout and the squad, benching extra players', () => {
    const store = copiedStore();
    const { tactic } = store.getState();
    expect(tactic.openPitch.ball).toEqual({ x: 55, y: 12 });
    expect(tactic.openPitch.scenario).toBeNull();
    expect(tactic.openPitch.teams.mine.squadSize).toBe(20);
    const mine = playersOf(tactic.openPitch, 'mine');
    expect(mine).toHaveLength(20);
    expect(mine.filter((p) => p.base)).toHaveLength(11);
    expect(mine.filter((p) => !p.base)).toHaveLength(9);
    expect(tactic.fm.scenario?.zone).toBe('L-D');
    expect(tacticIssues(tactic, FM26_DATA)).toBeNull();
  });

  it('replaces whatever was placed before and is one undo step', () => {
    const store = exampleStore();
    store.getState().setMode('openPitch');
    store.getState().dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_4_2' });
    store.getState().dispatch({ type: 'movePlayer', playerId: 'mine-ST', point: { x: 3, y: 3 } });
    const before = store.getState().tactic;
    const past = store.getState().history.past.length;
    store.getState().copyFmPositions();
    expect(store.getState().history.past).toHaveLength(past + 1);
    expect(store.getState().tactic.openPitch.teams.mine.formationId).toBe('4_3_3_dm_wide');
    store.getState().undo();
    expect(store.getState().tactic).toBe(before);
  });

  it('does nothing when the FM layout has no placed players', () => {
    const tactic = createInitialTactic();
    expect(copyFmPositions(tactic)).toBe(tactic);
  });

  it('does nothing when the open pitch already matches', () => {
    const store = copiedStore();
    const past = store.getState().history.past.length;
    store.getState().copyFmPositions();
    expect(store.getState().history.past).toHaveLength(past);
  });
});

describe('loadTactic', () => {
  it('replaces both layouts and the mode in one undoable step', () => {
    const store = createPitchStore({ tactic: createInitialTactic() });
    const before = store.getState().tactic;
    const loaded = createExampleTactic();
    expect(store.getState().loadTactic(loaded, { mode: 'fm' })).toBe(true);
    expect(store.getState().tactic).toBe(loaded);
    expect(store.getState().ui.mode).toBe('fm');
    expect(store.getState().doc).toBe(loaded.fm);
    expect(store.getState().history.past).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().tactic).toBe(before);
    expect(store.getState().ui.mode).toBe('openPitch');
    store.getState().redo();
    expect(store.getState().tactic).toBe(loaded);
    expect(store.getState().ui.mode).toBe('fm');
  });

  it('refuses a tactic that breaks a rule and leaves everything as it was', () => {
    const store = exampleStore();
    const state = store.getState();
    const broken = { ...createExampleTactic(), openPitch: createExampleDocument() };
    expect(state.loadTactic(broken, { mode: 'openPitch' })).toBe(false);
    expect(store.getState().tactic).toBe(state.tactic);
    expect(store.getState().ui.mode).toBe('fm');
    expect(store.getState().history.past).toHaveLength(0);
  });

  it('resets the transient ui when a tactic is loaded', () => {
    const store = exampleStore();
    store.getState().patchUi({ selectedPlayerId: 'mine-ST', phase: 'final', playing: true });
    store.getState().loadTactic(createExampleTactic(), { mode: 'fm', phase: 'runs' });
    expect(store.getState().ui).toMatchObject({
      selectedPlayerId: null,
      playing: false,
      phase: 'runs',
      drag: null,
    });
  });
});

describe('undo and the active mode', () => {
  it('undo returns to the mode the edit was made in', () => {
    const store = exampleStore();
    store.getState().setMode('openPitch');
    store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    store.getState().setMode('fm');
    store.getState().undo();
    expect(store.getState().ui.mode).toBe('openPitch');
    expect(store.getState().tactic.fm.teams.mine.name).toBe('My team');
  });
});
