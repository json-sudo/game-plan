import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION_DURATIONS_MS } from '../../engine';
import type { FmVisualization } from '../../state/visualization';
import { useVisualizationPlayback } from './useVisualizationPlayback';

const { phase: GLIDE, piece: PASS, cadence: PAUSE, reduced: REDUCED } = MOTION_DURATIONS_MS;

function visualization(passes: number): FmVisualization {
  const frame = { positions: {}, ball: { x: 0, y: 0 } };
  return {
    starterId: 'mine-9',
    passes: [],
    frames: Array.from({ length: passes + 1 }, () => frame),
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

function frames(result: { current: ReturnType<typeof useVisualizationPlayback> }) {
  return [result.current.piecesFrame, result.current.ballFrame];
}

function advance(...steps: number[]) {
  steps.forEach((ms) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    }),
  );
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

  it('waits at frame 0 until the pieces have settled', () => {
    const { result } = setup(visualization(2));
    advance(10_000);
    expect(frames(result)).toEqual([0, 0]);
    act(() => result.current.onSettled());
    expect(frames(result)).toEqual([0, 1]);
  });

  it('sends the ball first, then glides both teams, for each pass in order', () => {
    const { result } = setup(visualization(2));
    act(() => result.current.onSettled());
    expect(frames(result)).toEqual([0, 1]);
    advance(PASS);
    expect(frames(result)).toEqual([1, 1]);
    advance(GLIDE);
    expect(frames(result)).toEqual([1, 2]);
    advance(PASS);
    expect(frames(result)).toEqual([2, 2]);
  });

  it('pauses after the last pass, glides back to frame 0 and loops', () => {
    const { result } = setup(visualization(1));
    act(() => result.current.onSettled());
    advance(PASS, GLIDE);
    expect(frames(result)).toEqual([1, 1]);
    advance(PAUSE - 1);
    expect(frames(result)).toEqual([1, 1]);
    advance(1);
    expect(frames(result)).toEqual([0, 0]);
    advance(GLIDE - 1);
    expect(frames(result)).toEqual([0, 0]);
    advance(1);
    expect(frames(result)).toEqual([0, 1]);
  });

  it('runs every step in 200ms under reduced motion, keeping the pause', () => {
    stubReducedMotion(true);
    const { result } = setup(visualization(1));
    act(() => result.current.onSettled());
    advance(REDUCED);
    expect(frames(result)).toEqual([1, 1]);
    advance(REDUCED, PAUSE);
    expect(frames(result)).toEqual([0, 0]);
    advance(REDUCED);
    expect(frames(result)).toEqual([0, 1]);
  });

  it('returns to frame 0 on Restart and waits for the pieces to settle', () => {
    const viz = visualization(2);
    const { result, rerender } = setup(viz);
    act(() => result.current.onSettled());
    advance(PASS, GLIDE, PASS);
    expect(frames(result)).toEqual([2, 2]);
    rerender({ viz, restartKey: 1 });
    expect(frames(result)).toEqual([0, 0]);
    advance(10_000);
    expect(frames(result)).toEqual([0, 0]);
    act(() => result.current.onSettled());
    expect(frames(result)).toEqual([0, 1]);
  });

  it('restarts from frame 0 when the visualization changes', () => {
    const { result, rerender } = setup(visualization(2));
    act(() => result.current.onSettled());
    advance(PASS, GLIDE);
    rerender({ viz: visualization(3), restartKey: 0 });
    expect(frames(result)).toEqual([0, 0]);
    act(() => result.current.onSettled());
    expect(frames(result)).toEqual([0, 1]);
  });

  it('stays idle without a visualization', () => {
    const { result } = setup(null);
    act(() => result.current.onSettled());
    advance(10_000);
    expect(frames(result)).toEqual([0, 0]);
  });
});
