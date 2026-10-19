import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialDocument } from '../../../state/document';
import { createExampleDocument } from '../../../state/example';
import { createPitchStore } from '../../../state/store';
import { BoardPhone } from '.';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const SCALE = 2;
const DROP_RECT = { left: 0, top: 400, right: 300, bottom: 460 };

function stubSvg(svg: Element) {
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ a: SCALE, b: 0, c: 0, d: SCALE, e: 0, f: 0 }),
  });
  svg.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 76.19 * SCALE,
      bottom: 100 * SCALE,
      width: 76.19 * SCALE,
      height: 100 * SCALE,
    }) as DOMRect;
}

function board(mode: 'openPitch' | 'fm', doc = createExampleDocument()) {
  const store = createPitchStore({ doc, ui: { mode } });
  render(<BoardPhone store={store} />);
  stubSvg(screen.getByRole('img', { name: 'Pitch' }));
  return store;
}

beforeEach(() => {
  window.matchMedia = vi
    .fn<() => { matches: boolean; addEventListener: () => void; removeEventListener: () => void }>()
    .mockReturnValue({
      matches: true,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    }) as unknown as typeof window.matchMedia;
});

describe('BoardPhone Open pitch drag', () => {
  it('moves only the ball when it is dragged', () => {
    const store = board('openPitch', { ...createExampleDocument(), scenario: null });
    const before = store.getState().doc;
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ball' }), { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { clientX: 40, clientY: 60 });
    fireEvent.pointerUp(window, { clientX: 40, clientY: 60 });
    const after = store.getState().doc;
    expect(after.ball).toEqual({ x: 20, y: 30 });
    expect(after.players).toBe(before.players);
    expect(after.scenario).toBeNull();
  });

  it('moves only the dragged player', () => {
    const store = board('openPitch');
    const before = store.getState().doc;
    fireEvent.pointerDown(screen.getByRole('button', { name: 'ST, my team' }), {
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    fireEvent.pointerUp(window, { clientX: 60, clientY: 80 });
    const after = store.getState().doc;
    expect(after.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base).toEqual({
      x: 30,
      y: 40,
    });
    expect(after.ball).toEqual(before.ball);
    expect(after.players.filter((p) => p.id !== exampleSlotId('mine', 'ST'))).toEqual(
      before.players.filter((p) => p.id !== exampleSlotId('mine', 'ST')),
    );
  });

  it('offers a bench drop target only while a placed player is being dragged', () => {
    board('openPitch');
    expect(screen.queryByText('Drop here to bench')).not.toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'ST, my team' }), {
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    expect(screen.getByText('Drop here to bench')).toBeInTheDocument();
    fireEvent.pointerCancel(window);
    expect(screen.queryByText('Drop here to bench')).not.toBeInTheDocument();
  });

  it('benches a placed player dropped on the target and leaves the doc alone when cancelled', () => {
    const store = board('openPitch');
    const before = store.getState().doc;
    const token = screen.getByRole('button', { name: 'ST, my team' });
    fireEvent.pointerDown(token, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    fireEvent.pointerCancel(window);
    expect(store.getState().doc).toBe(before);

    fireEvent.pointerDown(token, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    const zone = screen.getByText('Drop here to bench');
    zone.getBoundingClientRect = () => ({ ...DROP_RECT }) as DOMRect;
    fireEvent.pointerMove(window, { clientX: 100, clientY: 430 });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 430 });
    expect(
      store.getState().doc.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base,
    ).toBeUndefined();
  });

  it('starts empty and moves a keyboard-focused player with the arrow keys', () => {
    const store = board('openPitch');
    const token = screen.getByRole('button', { name: 'ST, my team' });
    const start = store
      .getState()
      .doc.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base!;
    fireEvent.keyDown(token, { key: 'ArrowUp' });
    expect(
      store.getState().doc.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base,
    ).toEqual({
      x: start.x,
      y: start.y - 1,
    });
  });
});

describe('BoardPhone FM ball', () => {
  it('is a fixed image: dragging or nudging it changes nothing', () => {
    const store = board('fm');
    const before = store.getState().doc;
    const ball = screen.getByRole('img', { name: 'Ball' });
    fireEvent.pointerDown(ball, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    fireEvent.pointerUp(window, { clientX: 60, clientY: 80 });
    fireEvent.keyDown(ball, { key: 'ArrowRight' });
    expect(store.getState().doc).toBe(before);
  });
});

describe('BoardPhone empty Open pitch', () => {
  it('has all 22 players on the bench and none placed', () => {
    board('openPitch', createInitialDocument());
    expect(screen.getByRole('button', { name: 'Bench (22)' })).toBeInTheDocument();
  });
});
