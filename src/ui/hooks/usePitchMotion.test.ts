import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Point } from '../../data/types';
import { MOTION_DURATIONS_MS } from '../../engine';
import { BALL_PIECE_ID, usePitchMotion } from './usePitchMotion';

type Frame = (timestamp: number) => void;

let frames: Map<number, Frame>;
let nextHandle: number;

function stepTo(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(time)));
}

const A: Point = { x: 10, y: 10 };
const B: Point = { x: 50, y: 70 };
const BALL: Point = { x: 20, y: 20 };

interface Props {
  pieces: ReadonlyMap<string, Point>;
  ball: Point;
  draggingId?: string | null;
  cause?: readonly unknown[];
  retarget?: unknown;
  onSettled?: () => void;
}

function setup(initial: Props) {
  return renderHook(
    ({ pieces, ball, draggingId = null, cause = [], retarget, onSettled }: Props) =>
      usePitchMotion({ pieces, ball, draggingId, cause, retarget, onSettled }),
    { initialProps: initial },
  );
}

describe('usePitchMotion', () => {
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

  it('renders pieces and the ball where they are', () => {
    const { result } = setup({ pieces: new Map([['p', A]]), ball: BALL });
    expect(result.current.pieces.get('p')).toEqual(A);
    expect(result.current.ball).toEqual(BALL);
  });

  it('keeps the ball out of the piece map', () => {
    const { result } = setup({ pieces: new Map([['p', A]]), ball: BALL });
    expect(result.current.pieces.has(BALL_PIECE_ID)).toBe(false);
  });

  it('moves a piece over the piece duration when only positions change', () => {
    const { result, rerender } = setup({ pieces: new Map([['p', A]]), ball: BALL });
    rerender({ pieces: new Map([['p', B]]), ball: BALL });
    stepTo(0);
    stepTo(MOTION_DURATIONS_MS.piece - 1);
    expect(result.current.pieces.get('p')).not.toEqual(B);
    stepTo(MOTION_DURATIONS_MS.piece);
    expect(result.current.pieces.get('p')).toEqual(B);
  });

  it('takes the longer phase duration when the scenario behind the move changed', () => {
    const { result, rerender } = setup({
      pieces: new Map([['p', A]]),
      ball: BALL,
      cause: ['before'],
    });
    rerender({ pieces: new Map([['p', B]]), ball: BALL, cause: ['after'] });
    stepTo(0);
    stepTo(MOTION_DURATIONS_MS.phase - 1);
    expect(result.current.pieces.get('p')).not.toEqual(B);
    stepTo(MOTION_DURATIONS_MS.phase);
    expect(result.current.pieces.get('p')).toEqual(B);
  });

  it('does not restart a move when the component re-renders with the same targets', () => {
    const pieces = new Map([['p', B]]);
    const { result, rerender } = setup({ pieces: new Map([['p', A]]), ball: BALL, cause: [1] });
    rerender({ pieces, ball: BALL, cause: [2] });
    stepTo(0);
    stepTo(MOTION_DURATIONS_MS.phase / 2);
    const middle = result.current.pieces.get('p');
    rerender({ pieces, ball: BALL, cause: [2] });
    expect(result.current.pieces.get('p')).toEqual(middle);
    stepTo(MOTION_DURATIONS_MS.phase);
    expect(result.current.pieces.get('p')).toEqual(B);
  });

  it('moves the ball on its own while pieces stay put', () => {
    const { result, rerender } = setup({ pieces: new Map([['p', A]]), ball: BALL });
    rerender({ pieces: new Map([['p', A]]), ball: B });
    stepTo(0);
    stepTo(MOTION_DURATIONS_MS.piece / 2);
    expect(result.current.pieces.get('p')).toEqual(A);
    expect(result.current.ball).not.toEqual(BALL);
    expect(result.current.ball).not.toEqual(B);
    stepTo(MOTION_DURATIONS_MS.piece);
    expect(result.current.ball).toEqual(B);
  });

  it('lets the piece being dragged follow the pointer without a tween', () => {
    const { result, rerender } = setup({
      pieces: new Map([['p', A]]),
      ball: BALL,
      draggingId: 'p',
    });
    rerender({ pieces: new Map([['p', B]]), ball: BALL, draggingId: 'p' });
    expect(result.current.pieces.get('p')).toEqual(B);
  });

  it('lets the dragged ball follow the pointer directly', () => {
    const { result, rerender } = setup({
      pieces: new Map(),
      ball: BALL,
      draggingId: BALL_PIECE_ID,
    });
    rerender({ pieces: new Map(), ball: B, draggingId: BALL_PIECE_ID });
    expect(result.current.ball).toEqual(B);
  });

  it('reports settling straight away when a retarget leaves everything where it is', () => {
    const onSettled = vi.fn<() => void>();
    const pieces = new Map([['p', A]]);
    const { rerender } = setup({ pieces, ball: BALL, retarget: null, onSettled });
    onSettled.mockClear();
    rerender({ pieces, ball: BALL, retarget: { type: 'pass' }, onSettled });
    expect(onSettled).toHaveBeenCalledOnce();
  });
});
