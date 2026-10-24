import { describe, expect, it } from 'vitest';
import { createPitchStore } from './store';
import { BALL_START, playersOf } from './document';

const MINE = '4_3_3_dm_wide';
const OPPONENT = '4_2_3_1_dm_wide';

function openPitchStore() {
  const store = createPitchStore();
  const { dispatch } = store.getState();
  dispatch({ type: 'applyFormation', team: 'mine', formationId: MINE });
  dispatch({ type: 'applyFormation', team: 'opponent', formationId: OPPONENT });
  return store;
}

const layoutOf = (store: ReturnType<typeof createPitchStore>, team: 'mine' | 'opponent') =>
  playersOf(store.getState().doc, team).map((player) => ({ id: player.id, base: player.base }));

describe('Open pitch apply', () => {
  it('leaves the other team untouched when one formation is applied', () => {
    const store = openPitchStore();
    const { dispatch } = store.getState();
    const opponent = playersOf(store.getState().doc, 'opponent').find((p) => p.slot === 'ST')!;
    dispatch({ type: 'movePlayer', playerId: opponent.id, point: { x: 30, y: 33 } });
    const before = layoutOf(store, 'opponent');
    dispatch({ type: 'applyFormation', team: 'mine', formationId: '3_4_3_dm_wide' });
    expect(layoutOf(store, 'opponent')).toEqual(before);
  });

  it('never moves the ball on Apply, with a matchup or a single formation', () => {
    const store = openPitchStore();
    const { dispatch } = store.getState();
    dispatch({ type: 'placeBall', point: { x: 12, y: 20 } });
    dispatch({ type: 'applyFormation', team: 'mine', formationId: '3_4_3_dm_wide' });
    expect(store.getState().doc.ball).toEqual({ x: 12, y: 20 });
    dispatch({ type: 'applyMatchup' });
    expect(store.getState().doc.ball).toEqual({ x: 12, y: 20 });
    dispatch({ type: 'applyMatchupChoice', mine: MINE, opponent: OPPONENT });
    expect(store.getState().doc.ball).toEqual({ x: 12, y: 20 });
  });

  it('does not reflow when the rendered footprint changes, only on the next explicit Apply', () => {
    const store = openPitchStore();
    const { dispatch, patchUi } = store.getState();
    dispatch({ type: 'applyMatchup' });
    const applied = store.getState().doc.players;
    patchUi({ bodyClearance: 9 });
    expect(store.getState().doc.players).toBe(applied);
    dispatch({ type: 'applyMatchup' });
    expect(store.getState().doc.players).not.toEqual(applied);
  });

  it('uses the current footprint as the minimum body distance', () => {
    const store = openPitchStore();
    store.getState().patchUi({ bodyClearance: 7 });
    store.getState().dispatch({ type: 'applyMatchup' });
    const bases = store.getState().doc.players.map((p) => p.base!);
    for (let i = 0; i < bases.length; i += 1) {
      for (let j = i + 1; j < bases.length; j += 1) {
        const distance = Math.hypot(bases[i].x - bases[j].x, bases[i].y - bases[j].y);
        expect(distance).toBeGreaterThanOrEqual(7 - 0.02);
      }
    }
  });

  it('does not reflow when a piece or the ball is dragged', () => {
    const store = openPitchStore();
    const { dispatch } = store.getState();
    dispatch({ type: 'applyMatchup' });
    const [moved, ...rest] = store.getState().doc.players.filter((p) => p.base);
    dispatch({ type: 'movePlayer', playerId: moved.id, point: { x: 5, y: 5 } });
    dispatch({ type: 'placeBall', point: { x: 40, y: 40 } });
    const after = store.getState().doc.players;
    for (const player of rest) {
      expect(after.find((p) => p.id === player.id)!.base).toEqual(player.base);
    }
    expect(after.find((p) => p.id === moved.id)!.base).toEqual({ x: 5, y: 5 });
  });

  it('resets to the selected one-team setups as one undoable action', () => {
    const store = openPitchStore();
    const { dispatch } = store.getState();
    const applied = store.getState().doc.players;
    const mover = applied.find((p) => p.team === 'mine' && p.slot === 'ST')!;
    dispatch({ type: 'movePlayer', playerId: mover.id, point: { x: 3, y: 3 } });
    dispatch({ type: 'placeBall', point: { x: 12, y: 20 } });
    const dragged = store.getState().doc;
    dispatch({ type: 'reset' });
    expect(store.getState().doc.players).toEqual(applied);
    expect(store.getState().doc.ball).toEqual(BALL_START);
    store.getState().undo();
    expect(store.getState().doc).toEqual(dragged);
  });

  it('resets to the shared matchup as one undoable action', () => {
    const store = openPitchStore();
    const { dispatch } = store.getState();
    dispatch({ type: 'applyMatchup' });
    const applied = store.getState().doc.players;
    const mover = applied.find((p) => p.team === 'opponent' && p.slot === 'ST')!;
    dispatch({ type: 'movePlayer', playerId: mover.id, point: { x: 3, y: 3 } });
    const dragged = store.getState().doc;
    dispatch({ type: 'reset' });
    expect(store.getState().doc.players).toEqual(applied);
    store.getState().undo();
    expect(store.getState().doc).toEqual(dragged);
  });

  it('undoes an Apply back to the prior layout in one step', () => {
    const store = openPitchStore();
    const before = store.getState().doc;
    store.getState().dispatch({ type: 'applyMatchup' });
    store.getState().undo();
    expect(store.getState().doc).toEqual(before);
  });

  it('keeps the ball and benches the players on Clear', () => {
    const store = openPitchStore();
    const { dispatch } = store.getState();
    dispatch({ type: 'placeBall', point: { x: 12, y: 20 } });
    dispatch({ type: 'clearPitch' });
    const doc = store.getState().doc;
    expect(doc.ball).toEqual({ x: 12, y: 20 });
    expect(doc.players.every((p) => p.base === undefined)).toBe(true);
  });

  it('leaves the Open pitch layout alone when the FM configuration changes', () => {
    const store = openPitchStore();
    const { dispatch, setMode } = store.getState();
    dispatch({ type: 'applyMatchup' });
    const openPitch = store.getState().tactic.openPitch;
    setMode('fm');
    store
      .getState()
      .dispatch({ type: 'applyFormation', team: 'mine', formationId: '3_4_3_dm_wide' });
    store.getState().dispatch({ type: 'applyMatchup' });
    store.getState().dispatch({ type: 'setAttacker', attacker: 'opponent' });
    store.getState().dispatch({ type: 'fillDefaultRoles' });
    store.getState().dispatch({ type: 'tapZone', zone: 'L-F' });
    const after = store.getState().tactic.openPitch;
    expect(after.players.map((p) => ({ id: p.id, base: p.base }))).toEqual(
      openPitch.players.map((p) => ({ id: p.id, base: p.base })),
    );
    expect(after.ball).toEqual(openPitch.ball);
  });
});
