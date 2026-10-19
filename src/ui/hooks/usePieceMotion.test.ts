import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Point } from '../../data/types';
import { MOTION_DURATIONS_MS } from '../../engine';
import type { MotionKind } from '../../engine/anim/motion';
import { usePieceMotion } from './usePieceMotion';

type Frame = (timestamp: number) => void;

let frames: Map<number, Frame>;
let nextHandle: number;

function stepTo(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(time)));
}

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const A: Point = { x: 0, y: 0 };
const B: Point = { x: 40, y: 80 };

interface Props {
  targets: ReadonlyMap<string, Point>;
  kind?: MotionKind;
  draggingId?: string | null;
  onSettled?: () => void;
}

function setup(initial: Props) {
  return renderHook((props: Props) => usePieceMotion(props), { initialProps: initial });
}

describe('usePieceMotion', () => {
  beforeEach(() => {
    frames = new Map();
    nextHandle = 1;
    vi.stubGlobal('requestAnimationFrame', (frame: Frame) => {
      const handle = nextHandle++;
      frames.set(handle, frame);
      return handle;
    });
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => frames.delete(handle));
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts at the given positions', () => {
    const { result } = setup({ targets: new Map([['p', A]]) });
    expect(result.current.get('p')).toEqual(A);
  });

  it('travels between start and target and lands on the target', () => {
    const { result, rerender } = setup({ targets: new Map([['p', A]]), kind: 'piece' });
    rerender({ targets: new Map([['p', B]]), kind: 'piece' });
    stepTo(0);
    stepTo(MOTION_DURATIONS_MS.piece / 2);
    const mid = result.current.get('p')!;
    expect(mid.x).toBeGreaterThan(A.x);
    expect(mid.x).toBeLessThan(B.x);
    expect(mid.y).toBeGreaterThan(A.y);
    expect(mid.y).toBeLessThan(B.y);
    stepTo(MOTION_DURATIONS_MS.piece);
    expect(result.current.get('p')).toEqual(B);
    expect(frames.size).toBe(0);
  });

  it.each([
    ['phase', MOTION_DURATIONS_MS.phase],
    ['piece', MOTION_DURATIONS_MS.piece],
  ] as const)('uses the %s duration', (kind, duration) => {
    const { result, rerender } = setup({ targets: new Map([['p', A]]), kind });
    rerender({ targets: new Map([['p', B]]), kind });
    stepTo(0);
    stepTo(duration - 1);
    expect(result.current.get('p')).not.toEqual(B);
    stepTo(duration);
    expect(result.current.get('p')).toEqual(B);
  });

  it('uses the reduced duration under prefers-reduced-motion', () => {
    mockReducedMotion(true);
    const { result, rerender } = setup({ targets: new Map([['p', A]]), kind: 'phase' });
    rerender({ targets: new Map([['p', B]]), kind: 'phase' });
    stepTo(0);
    stepTo(MOTION_DURATIONS_MS.reduced - 1);
    expect(result.current.get('p')).not.toEqual(B);
    stepTo(MOTION_DURATIONS_MS.reduced);
    expect(result.current.get('p')).toEqual(B);
  });

  it('follows the dragged piece directly without a tween', () => {
    const { result, rerender } = setup({ targets: new Map([['p', A]]), draggingId: 'p' });
    rerender({ targets: new Map([['p', B]]), draggingId: 'p' });
    expect(result.current.get('p')).toEqual(B);
    stepTo(0);
    stepTo(100);
    expect(result.current.get('p')).toEqual(B);
  });

  it('does not jump when a drag ends', () => {
    const { result, rerender } = setup({ targets: new Map([['p', A]]), draggingId: 'p' });
    rerender({ targets: new Map([['p', B]]), draggingId: 'p' });
    rerender({ targets: new Map([['p', B]]), draggingId: null });
    expect(result.current.get('p')).toEqual(B);
  });

  it('retargets mid-tween from the current rendered position', () => {
    const { result, rerender } = setup({ targets: new Map([['p', A]]), kind: 'piece' });
    rerender({ targets: new Map([['p', B]]), kind: 'piece' });
    stepTo(0);
    stepTo(MOTION_DURATIONS_MS.piece / 2);
    const mid = result.current.get('p')!;
    const C: Point = { x: 0, y: 100 };
    rerender({ targets: new Map([['p', C]]), kind: 'piece' });
    expect(result.current.get('p')).toEqual(mid);
    stepTo(1000);
    stepTo(1001);
    const next = result.current.get('p')!;
    expect(next.x).toBeLessThan(mid.x);
    expect(next.y).toBeGreaterThan(mid.y);
    stepTo(1000 + MOTION_DURATIONS_MS.piece);
    expect(result.current.get('p')).toEqual(C);
  });

  describe('onSettled', () => {
    it('fires once when a move lands, not before', () => {
      const onSettled = vi.fn<() => void>();
      const { rerender } = setup({ targets: new Map([['p', A]]), kind: 'piece', onSettled });
      onSettled.mockClear();
      rerender({ targets: new Map([['p', B]]), kind: 'piece', onSettled });
      stepTo(0);
      stepTo(MOTION_DURATIONS_MS.piece - 1);
      expect(onSettled).not.toHaveBeenCalled();
      stepTo(MOTION_DURATIONS_MS.piece);
      expect(onSettled).toHaveBeenCalledOnce();
    });

    it('fires straight away when the new targets match where pieces already are', () => {
      const onSettled = vi.fn<() => void>();
      const { rerender } = setup({ targets: new Map([['p', A]]), onSettled });
      onSettled.mockClear();
      rerender({ targets: new Map([['p', { ...A }]]), onSettled });
      expect(onSettled).toHaveBeenCalledOnce();
    });

    it('does not fire for a move that is retargeted before it lands', () => {
      const onSettled = vi.fn<() => void>();
      const { rerender } = setup({ targets: new Map([['p', A]]), kind: 'piece', onSettled });
      onSettled.mockClear();
      rerender({ targets: new Map([['p', B]]), kind: 'piece', onSettled });
      stepTo(0);
      stepTo(MOTION_DURATIONS_MS.piece / 2);
      rerender({ targets: new Map([['p', { x: 0, y: 100 }]]), kind: 'piece', onSettled });
      expect(onSettled).not.toHaveBeenCalled();
      stepTo(1000);
      stepTo(1000 + MOTION_DURATIONS_MS.piece);
      expect(onSettled).toHaveBeenCalledOnce();
    });

    it('fires after the reduced-motion duration under prefers-reduced-motion', () => {
      mockReducedMotion(true);
      const onSettled = vi.fn<() => void>();
      const { rerender } = setup({ targets: new Map([['p', A]]), kind: 'phase', onSettled });
      onSettled.mockClear();
      rerender({ targets: new Map([['p', B]]), kind: 'phase', onSettled });
      stepTo(0);
      stepTo(MOTION_DURATIONS_MS.reduced);
      expect(onSettled).toHaveBeenCalledOnce();
    });
  });
});
