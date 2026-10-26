import { describe, expect, it } from 'vitest';
import { GRID, type ZoneId } from '../data/zones';
import { selectFmVisualization } from '../state/selectors';
import { createPitchStore } from '../state/store';
import { createExampleTactic } from '../state/tactic';
import { decodeShareHash, encodeShareHash } from '.';

const ZONES: ZoneId[] = GRID.thirds.flatMap((third) =>
  GRID.lanes.map((lane): ZoneId => `${lane}-${third}`),
);

function storeAtSecondSequence() {
  const store = createPitchStore({ tactic: createExampleTactic(), ui: { mode: 'fm' } });
  for (const candidate of ZONES) {
    store.getState().dispatch({ type: 'tapZone', zone: candidate });
    if ((selectFmVisualization(store.getState())?.total ?? 0) > 1) break;
  }
  store.getState().showAnotherVisualization();
  return store;
}

describe('loading a share link', () => {
  it('rebuilds the saved sequence and keeps the two layouts independent', () => {
    const source = storeAtSecondSequence();
    const { tactic } = source.getState();
    const encoded = encodeShareHash({ tactic, mode: 'fm' });
    if (encoded.status !== 'ok') throw new Error('link too large');
    const decoded = decodeShareHash(encoded.hash);
    if (decoded.status !== 'ok') throw new Error('link did not decode');

    const target = createPitchStore();
    expect(target.getState().loadTactic(decoded.tactic, { mode: decoded.mode })).toBe(true);

    const saved = selectFmVisualization(source.getState())!;
    const loaded = selectFmVisualization(target.getState())!;
    expect(loaded.index).toBe(1);
    expect(loaded.starterId).toBe(saved.starterId);
    expect(loaded.frames).toEqual(saved.frames);
    expect(target.getState().doc.scenario).toEqual(tactic.fm.scenario);
    expect(target.getState().tactic.openPitch.scenario).toBeNull();
    expect(target.getState().tactic.openPitch.ball).toEqual(tactic.openPitch.ball);
  });

  it('does not put the clock in the link', () => {
    const source = storeAtSecondSequence();
    const link = () => encodeShareHash({ tactic: source.getState().tactic, mode: 'fm' });
    const before = link();
    source.getState().restartVisualization();
    expect(link()).toEqual(before);
  });
});
