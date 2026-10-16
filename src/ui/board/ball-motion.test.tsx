import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION_DURATIONS_MS } from '../../engine';
import { createInitialDocument } from '../../state/document';
import { createPitchStore } from '../../state/store';
import { BoardDesktop } from './BoardDesktop';

type Frame = (timestamp: number) => void;

let frames: Map<number, Frame>;
let nextHandle: number;

function advanceTo(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(time)));
}

function ballTransform() {
  return screen.getByRole('button', { name: 'Ball' }).style.transform;
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ball in open pitch', () => {
  it('travels to its new spot over the piece duration instead of jumping', () => {
    const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'openPitch' } });
    render(<BoardDesktop store={store} />);
    const start = ballTransform();

    act(() => {
      store.getState().dispatch({ type: 'dragBall', point: { x: 20, y: 30 } });
    });
    expect(ballTransform()).toBe(start);

    advanceTo(0);
    advanceTo(MOTION_DURATIONS_MS.piece / 2);
    const middle = ballTransform();
    expect(middle).not.toBe(start);
    expect(middle).not.toBe('translate(20px, 30px)');

    advanceTo(MOTION_DURATIONS_MS.piece + 1);
    expect(ballTransform()).toBe('translate(20px, 30px)');
    expect(store.getState().doc.ball).toEqual({ x: 20, y: 30 });
  });
});
