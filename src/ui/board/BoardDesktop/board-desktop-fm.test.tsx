import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExampleDocument } from '../../../state/example';
import { createPitchStore } from '../../../state/store';
import { ARROWS_LABEL } from '../../copy';
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

function fmBoard() {
  const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
  render(<BoardDesktop store={store} />);
  return store;
}

describe('FM mode board without carrier, pass, dribble or arrows', () => {
  it('shows the zone map and none of the removed controls', () => {
    fmBoard();
    expect(screen.getByRole('heading', { name: 'Ball zone' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Pass to' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dribble forward' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    expect(screen.queryByText(ARROWS_LABEL)).toBeNull();
    expect(screen.queryByText('See where every role goes')).toBeNull();
  });

  it('keeps the ball where the zone put it when it is dragged or nudged', () => {
    const store = fmBoard();
    const before = store.getState();
    const ball = screen.getByRole('img', { name: 'Ball' });
    fireEvent.pointerDown(ball, { clientX: 3, clientY: 3 });
    fireEvent.pointerMove(window, { clientX: 90, clientY: 90 });
    fireEvent.pointerUp(window, { clientX: 90, clientY: 90 });
    fireEvent.keyDown(ball, { key: 'ArrowRight' });
    expect(store.getState().doc).toBe(before.doc);
  });
});
