import { describe, expect, it } from 'vitest';
import { DEFAULT_TEAM_NAMES, placedPlayers } from './document';
import { selectFmVisualization } from './selectors';
import { createPitchStore } from './store';

function fmStore() {
  const store = createPitchStore({ ui: { mode: 'fm' } });
  const { dispatch } = store.getState();
  dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
  dispatch({ type: 'fillDefaultRoles' });
  return store;
}

function sequenceIndex(store: ReturnType<typeof fmStore>) {
  return store.getState().doc.scenario?.sequenceIndex;
}

describe('zone picks and Show another', () => {
  it('records the zone with index 0, and a different zone resets the index', () => {
    const store = fmStore();
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    expect(store.getState().doc.scenario).toEqual({ zone: 'C-M', sequenceIndex: 0 });
    store.getState().showAnotherVisualization();
    expect(sequenceIndex(store)).toBe(1);
    store.getState().dispatch({ type: 'tapZone', zone: 'LH-F' });
    expect(store.getState().doc.scenario).toEqual({ zone: 'LH-F', sequenceIndex: 0 });
  });

  it('wraps to 0 after the last visualization', () => {
    const store = fmStore();
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    store.getState().showAnotherVisualization();
    expect(sequenceIndex(store)).toBe(1);
    store.getState().showAnotherVisualization();
    expect(sequenceIndex(store)).toBe(0);
  });

  it('adds no history entries and does nothing without a zone', () => {
    const store = fmStore();
    store.getState().showAnotherVisualization();
    expect(store.getState().doc.scenario).toBeNull();
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    const { history } = store.getState();
    store.getState().showAnotherVisualization();
    expect(store.getState().history).toBe(history);
  });
});

describe('recompute on setup changes', () => {
  it('keeps the index and zone on a role change that keeps the count', () => {
    const store = fmStore();
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    store.getState().showAnotherVisualization();
    store.getState().dispatch({ type: 'setRole', playerId: 'mine-9', roleId: 'inside_forward_ip' });
    expect(store.getState().doc.scenario).toEqual({ zone: 'C-M', sequenceIndex: 1 });
  });

  it('wraps the index when a role change shrinks the count to 1', () => {
    const store = fmStore();
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    store.getState().showAnotherVisualization();
    store
      .getState()
      .dispatch({ type: 'setRole', playerId: 'mine-7', roleId: 'channel_midfielder_ip' });
    expect(selectFmVisualization(store.getState())?.total).toBe(1);
    expect(store.getState().doc.scenario).toEqual({ zone: 'C-M', sequenceIndex: 0 });
  });
});

describe('selectFmVisualization', () => {
  it('is null without a zone and describes the current visualization with one', () => {
    const store = fmStore();
    expect(selectFmVisualization(store.getState())).toBeNull();
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    const view = selectFmVisualization(store.getState());
    expect(view).toMatchObject({ index: 0, total: 2 });
    expect(view?.frames).toHaveLength((view?.passes.length ?? 0) + 1);
    expect(view?.starterId).toMatch(/^mine:/);
  });

  it('returns the same reference until the document changes', () => {
    const store = fmStore();
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    const view = selectFmVisualization(store.getState());
    store.getState().patchUi({ setupStep: null });
    expect(selectFmVisualization(store.getState())).toBe(view);
    store.getState().showAnotherVisualization();
    expect(selectFmVisualization(store.getState())).not.toBe(view);
  });

  it('is null before any formation is set', () => {
    const store = createPitchStore({ ui: { mode: 'fm' } });
    store.getState().dispatch({ type: 'tapZone', zone: 'C-M' });
    expect(selectFmVisualization(store.getState())).toBeNull();
  });
});

describe('FM Reset', () => {
  it('clears zone, formations and roles, keeps names, in one undo step', () => {
    const store = fmStore();
    const { dispatch } = store.getState();
    dispatch({ type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' });
    dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    dispatch({ type: 'setAttacker', attacker: 'opponent' });
    dispatch({ type: 'tapZone', zone: 'C-M' });
    const before = store.getState().doc;
    const pastLength = store.getState().history.past.length;
    dispatch({ type: 'reset' });
    const { doc, history } = store.getState();
    expect(doc.scenario).toBeNull();
    expect(doc.attacker).toBe('mine');
    expect(doc.teams.mine).toMatchObject({ name: 'Reds', formationId: null });
    expect(doc.teams.opponent).toMatchObject({
      name: DEFAULT_TEAM_NAMES.opponent,
      formationId: null,
    });
    expect(placedPlayers(doc)).toHaveLength(0);
    expect(doc.players.every((player) => player.role === undefined)).toBe(true);
    expect(history.past).toHaveLength(pastLength + 1);
    store.getState().undo();
    expect(store.getState().doc).toBe(before);
  });

  it('gives FM26 default roles again when a formation is picked after Reset', () => {
    const store = fmStore();
    const { dispatch } = store.getState();
    dispatch({ type: 'setRole', playerId: 'mine-9', roleId: 'inside_forward_ip' });
    dispatch({ type: 'tapZone', zone: 'C-M' });
    dispatch({ type: 'reset' });
    dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    dispatch({ type: 'fillDefaultRoles' });
    expect(store.getState().doc.players.find((p) => p.id === 'mine-9')?.role).toBe('winger_ip');
  });

  it('does nothing without a zone', () => {
    const store = fmStore();
    const before = store.getState().tactic;
    store.getState().dispatch({ type: 'reset' });
    expect(store.getState().tactic).toBe(before);
  });
});
