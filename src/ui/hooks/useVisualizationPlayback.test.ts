import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION_DURATIONS_MS, PASS_SETTLE_MS, attachedBall } from '../../engine';
import type { FmVisualization } from '../../state/visualization';
import { useVisualizationPlayback } from './useVisualizationPlayback';

const { phase: MOVE, cadence: HOLD, reduced: REDUCED } = MOTION_DURATIONS_MS;
const FRAME_MS = 16;
const SAFE_MS = 50;

const OPENING = { a: { x: 10, y: 80 }, b: { x: 30, y: 60 }, c: { x: 50, y: 70 } };
const FIRST = { ...OPENING, b: { x: 34, y: 56 } };
const SECOND = { ...FIRST, c: { x: 54, y: 62 } };

function visualization(): FmVisualization {
  const frames = [OPENING, FIRST, SECOND].map((positions) => ({
    positions,
    ball: positions.a,
  }));
  return {
    starterId: 'a',
    passes: [
      { carrierId: 'a', receiverId: 'b', frame: frames[1] },
      { carrierId: 'b', receiverId: 'c', frame: frames[2] },
    ],
    frames,
    index: 0,
    total: 1,
  };
}

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function setup(viz: FmVisualization | null, restartKey = 0) {
  return renderHook(
    (props: { viz: FmVisualization | null; restartKey: number }) =>
      useVisualizationPlayback(props.viz, props.restartKey),
    { initialProps: { viz, restartKey } },
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function start(result: { current: ReturnType<typeof useVisualizationPlayback> }) {
  act(() => result.current.onSettled());
  advance(FRAME_MS);
}

describe('useVisualizationPlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the opening with the ball attached and does not run before the pieces settle', () => {
    const { result } = setup(visualization());
    advance(HOLD * 3);
    expect(result.current.running).toBe(false);
    expect(result.current.scene?.positions).toEqual(OPENING);
    expect(result.current.scene?.ball).toEqual(attachedBall(OPENING.a));
  });

  it('samples the shared clock once settled', () => {
    const { result } = setup(visualization());
    start(result);
    expect(result.current.running).toBe(true);
    advance(MOVE / 2 - FRAME_MS);
    const mid = result.current.scene!;
    expect(mid.positions.b.x).toBeGreaterThan(OPENING.b.x);
    expect(mid.positions.b.x).toBeLessThan(FIRST.b.x);
    expect(mid.ball.x).toBeGreaterThan(attachedBall(OPENING.a).x);
    advance(MOVE / 2 + SAFE_MS);
    expect(result.current.scene?.positions).toEqual(FIRST);
    expect(result.current.scene?.ball).toEqual(attachedBall(FIRST.b));
  });

  it('settles 250 ms between passes, holds 1600 ms at the end and loops', () => {
    const { result } = setup(visualization());
    start(result);
    advance(MOVE + SAFE_MS);
    expect(result.current.scene?.positions).toEqual(FIRST);
    advance(PASS_SETTLE_MS + MOVE);
    expect(result.current.scene?.positions).toEqual(SECOND);
    advance(HOLD - 2 * SAFE_MS);
    expect(result.current.scene?.positions).toEqual(SECOND);
    advance(MOVE + 2 * SAFE_MS);
    expect(result.current.scene?.positions).toEqual(OPENING);
    advance(PASS_SETTLE_MS + MOVE / 2 - SAFE_MS);
    expect(result.current.scene?.positions).not.toEqual(OPENING);
    expect(Object.keys(result.current.scene!.positions)).toEqual(['a', 'b', 'c']);
  });

  it('uses 200 ms passes under reduced motion', () => {
    stubReducedMotion(true);
    const { result } = setup(visualization());
    start(result);
    advance(REDUCED + SAFE_MS);
    expect(result.current.scene?.positions).toEqual(FIRST);
  });

  it('returns to waiting when the visualization or restart key changes', () => {
    const { result, rerender } = setup(visualization());
    start(result);
    advance(MOVE / 2);
    expect(result.current.running).toBe(true);
    rerender({ viz: visualization(), restartKey: 1 });
    expect(result.current.running).toBe(false);
    expect(result.current.scene?.positions).toEqual(OPENING);
  });

  it('runs no clock without a visualization or without passes', () => {
    const empty = setup(null);
    act(() => empty.result.current.onSettled());
    expect(empty.result.current.running).toBe(false);
    expect(empty.result.current.scene).toBeNull();
    const single = visualization();
    const still = setup({ ...single, passes: [], frames: single.frames.slice(0, 1) });
    act(() => still.result.current.onSettled());
    expect(still.result.current.running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
