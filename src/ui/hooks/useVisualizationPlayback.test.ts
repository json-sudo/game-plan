import { act, renderHook } from '@testing-library/react';
import { useMemo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION_DURATIONS_MS, PASS_SETTLE_MS, attachedBall } from '../../engine';
import type { FmVisualization } from '../../state/visualization';
import { stubSwitchableReducedMotion } from '../../test-utils/reduced-motion';
import { usePitchMotion } from './usePitchMotion';
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

const NO_BALL = { x: 0, y: 0 };

function setupBoard(viz: FmVisualization) {
  return renderHook(
    (props: { viz: FmVisualization; restartKey: number }) => {
      const playback = useVisualizationPlayback(props.viz, props.restartKey);
      const pieces = useMemo(
        () => new Map(Object.entries(playback.scene?.positions ?? {})),
        [playback.scene],
      );
      const motion = usePitchMotion({
        pieces,
        ball: playback.scene?.ball ?? NO_BALL,
        draggingId: null,
        cause: [props.viz],
        retarget: props.restartKey,
        snap: playback.running,
        onSettled: playback.onSettled,
      });
      return { playback, motion, viz: props.viz };
    },
    { initialProps: { viz, restartKey: 0 } },
  );
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

  describe.each([
    ['a new sequence (zone, role, formation, opponent or attacker change)', true, 0],
    ['Restart', false, 1],
  ])('with %s mid-pass', (_name, newViz, restartKey) => {
    it('continues from the sampled positions and leaves one active loop', () => {
      const { result, rerender } = setupBoard(visualization());
      start({ current: result.current.playback });
      advance(MOVE / 2);
      const mid = result.current.motion.pieces.get('b')!;
      expect(mid).not.toEqual(OPENING.b);
      expect(mid).not.toEqual(FIRST.b);

      rerender({ viz: newViz ? visualization() : result.current.viz, restartKey });
      expect(result.current.playback.running).toBe(false);
      expect(result.current.motion.pieces.get('b')).toEqual(mid);
      advance(FRAME_MS * 2);
      const travelling = result.current.motion.pieces.get('b')!;
      expect(Math.hypot(travelling.x - mid.x, travelling.y - mid.y)).toBeLessThan(5);

      advance(MOVE + SAFE_MS);
      expect(result.current.motion.pieces.get('b')).toEqual(OPENING.b);
      advance(FRAME_MS);
      expect(result.current.playback.running).toBe(true);
      expect(vi.getTimerCount()).toBe(1);
    });
  });

  it('does not jump when reduced motion switches on mid-pass and finishes within 200 ms', () => {
    const setReduced = stubSwitchableReducedMotion();
    const { result } = setup(visualization());
    start(result);
    advance(MOVE / 2);
    const before = result.current.scene!;
    setReduced(true);
    expect(result.current.scene?.positions).toEqual(before.positions);
    expect(result.current.scene?.ball).toEqual(before.ball);
    advance(FRAME_MS);
    expect(Math.abs(result.current.scene!.positions.b.x - before.positions.b.x)).toBeLessThan(2);
    advance(REDUCED + FRAME_MS);
    const settled = result.current.scene!;
    expect(settled.positions.b.x).toBeGreaterThanOrEqual(before.positions.b.x);
    expect(settled.positions).toEqual(FIRST);
  });

  it('does not jump when reduced motion switches off mid-pass', () => {
    const setReduced = stubSwitchableReducedMotion(true);
    const { result } = setup(visualization());
    start(result);
    advance(REDUCED / 2);
    const before = result.current.scene!;
    setReduced(false);
    expect(result.current.scene?.positions).toEqual(before.positions);
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
