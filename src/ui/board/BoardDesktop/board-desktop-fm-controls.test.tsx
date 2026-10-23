import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRID, type ZoneId } from '../../../data/zones';
import { selectFmVisualization } from '../../../state/selectors';
import { createPitchStore } from '../../../state/store';
import { visualizationStarter } from '../fm-pieces';
import { BoardDesktop } from '.';

beforeEach(() =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })),
);
afterEach(() => vi.unstubAllGlobals());

const ZONES: ZoneId[] = GRID.thirds.flatMap((third) =>
  GRID.lanes.map((lane): ZoneId => `${lane}-${third}`),
);

function fmStore() {
  const store = createPitchStore({ ui: { mode: 'fm' } });
  store.getState().dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
  store.getState().dispatch({ type: 'fillDefaultRoles' });
  return store;
}

function starters(store: ReturnType<typeof fmStore>): string[] {
  const labels: string[] = [];
  const total = selectFmVisualization(store.getState())?.total ?? 0;
  for (let step = 0; step < total; step += 1) {
    const { doc } = store.getState();
    labels.push(visualizationStarter(doc, selectFmVisualization(store.getState())!) ?? '');
    store.getState().showAnotherVisualization();
  }
  return labels;
}

function zoneWithTotal(total: number): ZoneId {
  const store = fmStore();
  const zone = ZONES.find((candidate) => {
    store.getState().dispatch({ type: 'tapZone', zone: candidate });
    const labels = starters(store);
    return labels.length === total && new Set(labels).size === total;
  });
  if (!zone) throw new Error(`no zone with ${total} visualizations`);
  return zone;
}

function boardAt(zone: ZoneId | null) {
  const store = fmStore();
  if (zone) store.getState().dispatch({ type: 'tapZone', zone });
  render(<BoardDesktop store={store} />);
  return store;
}

function startsWith() {
  return screen.getByText(/^Starts with /).textContent;
}

describe('FM visualization controls', () => {
  it('shows Show another visualization changing the starting line and wrapping', async () => {
    boardAt(zoneWithTotal(2));
    const first = startsWith();
    await userEvent.click(screen.getByRole('button', { name: 'Show another visualization' }));
    const second = startsWith();
    expect(second).not.toBe(first);
    await userEvent.click(screen.getByRole('button', { name: 'Show another visualization' }));
    expect(startsWith()).toBe(first);
  });

  it('disables Show another visualization with its reason when the zone has one', () => {
    boardAt(zoneWithTotal(1));
    const another = screen.getByRole('button', { name: 'Show another visualization' });
    expect(another).toHaveAttribute('aria-disabled', 'true');
    expect(another).toHaveAccessibleDescription('This zone has one visualization.');
  });

  it('restarts without touching the document', async () => {
    const store = boardAt(zoneWithTotal(2));
    const { doc, history } = store.getState();
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(store.getState().doc).toBe(doc);
    expect(store.getState().history).toBe(history);
  });

  it('is disabled with the zone reason until a zone is picked', () => {
    boardAt(null);
    expect(screen.getByRole('button', { name: 'Restart' })).toHaveAccessibleDescription(
      'Pick a zone first.',
    );
    expect(screen.queryByText(/^Starts with /)).toBeNull();
  });

  it('is disabled with the setup reason before setup is done', () => {
    const store = createPitchStore({ ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('button', { name: 'Restart' })).toHaveAccessibleDescription(
      'Finish setting up your tactic first.',
    );
  });

  it('never writes the word sequence in FM mode', () => {
    boardAt(zoneWithTotal(2));
    expect(document.body.textContent ?? '').not.toMatch(/sequence/i);
  });
});
