import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION_DURATIONS_MS } from '../../../engine';
import { createInitialDocument } from '../../../state/document';
import { createExampleDocument } from '../../../state/example';
import { createPitchStore } from '../../../state/store';
import { PITCH_EMPTY_SETUP, PITCH_EMPTY_ZONE } from '../../copy';
import { BoardDesktop } from '.';

type Frame = (timestamp: number) => void;

let frames: Map<number, Frame>;
let nextHandle: number;

function advanceTo(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(time)));
}

function tokenTransforms() {
  return screen
    .queryAllByRole('img', { name: /(my team|opponent)$/ })
    .map((token) => token.getAttribute('style'));
}

function noPieces() {
  expect(screen.queryAllByRole('img', { name: /(my team|opponent)$/ })).toHaveLength(0);
  expect(screen.queryByRole('img', { name: 'Ball' })).toBeNull();
}

beforeEach(() => {
  frames = new Map();
  nextHandle = 1;
  vi.stubGlobal('requestAnimationFrame', (frame: Frame) => {
    const handle = nextHandle++;
    frames.set(handle, frame);
    return handle;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => frames.delete(handle));
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => vi.unstubAllGlobals());

function setupDocWithoutZone() {
  return { ...createExampleDocument(), scenario: null };
}

describe('FM pitch before a zone', () => {
  it.each([1, 2, 3] as const)('shows no piece or ball at setup step %i', (setupStep) => {
    const store = createPitchStore({ doc: setupDocWithoutZone(), ui: { mode: 'fm', setupStep } });
    render(<BoardDesktop store={store} />);
    noPieces();
    expect(screen.getByText(PITCH_EMPTY_SETUP)).toBeInTheDocument();
  });

  it('shows no piece or ball on a blank document', () => {
    const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    noPieces();
    expect(screen.getByText(PITCH_EMPTY_SETUP)).toBeInTheDocument();
    expect(screen.queryByText(PITCH_EMPTY_ZONE)).toBeNull();
  });

  it('asks for a zone once setup is done', () => {
    const store = createPitchStore({ doc: setupDocWithoutZone(), ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    noPieces();
    expect(screen.getByText(PITCH_EMPTY_ZONE)).toBeInTheDocument();
    expect(screen.queryByText(PITCH_EMPTY_SETUP)).toBeNull();
  });

  it('words the plates verbatim', () => {
    expect(PITCH_EMPTY_SETUP).toBe(
      'Finish setting up your preferences to see your tactic visualization',
    );
    expect(PITCH_EMPTY_ZONE).toBe('Pick a zone to finish setting up your tactic visualization');
  });

  it('never shows the plate once a zone is set', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    expect(screen.queryByText(PITCH_EMPTY_SETUP)).toBeNull();
    expect(screen.queryByText(PITCH_EMPTY_ZONE)).toBeNull();
  });
});

describe('FM pitch walk-on', () => {
  it('walks every piece on from its goal line when the first zone is picked', () => {
    const store = createPitchStore({ doc: setupDocWithoutZone(), ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    act(() => {
      store.getState().dispatch({ type: 'tapZone', zone: 'R-F' });
    });
    advanceTo(0);
    const start = tokenTransforms();
    expect(start).toHaveLength(22);
    advanceTo(MOTION_DURATIONS_MS.phase / 2);
    const middle = tokenTransforms();
    expect(middle).not.toEqual(start);
    advanceTo(MOTION_DURATIONS_MS.phase);
    advanceTo(MOTION_DURATIONS_MS.phase * 2);
    const end = tokenTransforms();
    expect(end).not.toEqual(middle);
    expect(end).not.toEqual(start);
  });

  it('walks pieces off to their goal line after FM Reset and then removes them', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    advanceTo(0);
    advanceTo(MOTION_DURATIONS_MS.phase * 2);
    expect(screen.getAllByRole('img', { name: /(my team|opponent)$/ })).toHaveLength(22);
    act(() => {
      store.getState().dispatch({ type: 'reset' });
    });
    expect(screen.getAllByRole('img', { name: /(my team|opponent)$/ })).toHaveLength(22);
    expect(screen.queryByRole('img', { name: 'Ball' })).toBeNull();
    advanceTo(0);
    advanceTo(MOTION_DURATIONS_MS.phase * 4);
    advanceTo(MOTION_DURATIONS_MS.phase * 8);
    noPieces();
    expect(screen.getByText(PITCH_EMPTY_SETUP)).toBeInTheDocument();
  });
});

describe('FM pitch without an opponent', () => {
  it('shows only my team and no Defending label', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    act(() => {
      store.getState().dispatch({ type: 'clearOpponent' });
    });
    render(<BoardDesktop store={store} />);
    expect(screen.queryByText('Defending')).toBeNull();
    expect(screen.queryAllByRole('img', { name: /opponent$/ })).toHaveLength(0);
    expect(screen.getAllByRole('img', { name: /my team$/ })).toHaveLength(11);
  });
});
