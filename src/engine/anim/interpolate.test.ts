import { describe, expect, it } from 'vitest';
import {
  isTransitionDone,
  positionAt,
  positionsAt,
  progressAt,
  transitionAt,
} from './interpolate';
import { MOTION_DURATIONS_MS } from './motion';

const points = (entries: Record<string, [number, number]>) =>
  new Map(Object.entries(entries).map(([id, [x, y]]) => [id, { x, y }]));

describe('positionAt', () => {
  const from = { x: 10, y: 20 };
  const to = { x: 30, y: 60 };

  it('returns the ends at t = 0 and t = 1', () => {
    expect(positionAt(from, to, 0)).toEqual(from);
    expect(positionAt(from, to, 1)).toEqual(to);
  });

  it('interpolates linearly', () => {
    expect(positionAt(from, to, 0.5)).toEqual({ x: 20, y: 40 });
    expect(positionAt(from, to, 0.25)).toEqual({ x: 15, y: 30 });
  });

  it('clamps t to [0, 1]', () => {
    expect(positionAt(from, to, -3)).toEqual(from);
    expect(positionAt(from, to, 9)).toEqual(to);
  });

  it('treats a non-finite t as the start', () => {
    expect(positionAt(from, to, Number.NaN)).toEqual(from);
  });

  it('does not mutate or alias its inputs', () => {
    const result = positionAt(from, to, 0);
    expect(result).not.toBe(from);
    expect(from).toEqual({ x: 10, y: 20 });
  });
});

describe('positionsAt', () => {
  it('blends every id present in the target map', () => {
    const from = points({ a: [0, 0], b: [10, 10] });
    const to = points({ a: [10, 0], b: [10, 30], c: [5, 5] });
    const result = positionsAt(from, to, 0.5);
    expect(result.get('a')).toEqual({ x: 5, y: 0 });
    expect(result.get('b')).toEqual({ x: 10, y: 20 });
    expect(result.get('c')).toEqual({ x: 5, y: 5 });
  });

  it('starts a new piece from its entry point when one is given', () => {
    const to = points({ c: [5, 5] });
    const entry = points({ c: [5, 105] });
    expect(positionsAt(new Map(), to, 0, entry).get('c')).toEqual({ x: 5, y: 105 });
    expect(positionsAt(new Map(), to, 0.5, entry).get('c')).toEqual({ x: 5, y: 55 });
  });

  it('drops ids that are no longer in the target map', () => {
    const result = positionsAt(points({ gone: [1, 1] }), points({ a: [0, 0] }), 0.5);
    expect([...result.keys()]).toEqual(['a']);
  });
});

describe('progressAt', () => {
  it('runs from 0 to 1 over the duration', () => {
    const { phase } = MOTION_DURATIONS_MS;
    expect(progressAt(0, phase)).toBe(0);
    expect(progressAt(phase / 2, phase)).toBe(0.5);
    expect(progressAt(phase * 2, phase)).toBe(1);
  });

  it('snaps to the end for a zero duration', () => {
    expect(progressAt(10, 0)).toBe(1);
  });

  it('never goes below 0', () => {
    expect(progressAt(-50, 100)).toBe(0);
  });
});

describe('transitionAt', () => {
  const from = points({ a: [0, 0] });
  const to = points({ a: [10, 20] });

  it('starts at the origin and ends at the target for every kind', () => {
    for (const kind of ['phase', 'piece'] as const) {
      for (const reducedMotion of [false, true]) {
        const input = { from, to, kind, reducedMotion };
        expect(transitionAt({ ...input, elapsedMs: 0 }).get('a')).toEqual({ x: 0, y: 0 });
        expect(transitionAt({ ...input, elapsedMs: 5000 }).get('a')).toEqual({ x: 10, y: 20 });
      }
    }
  });

  it('is still travelling halfway through a piece move, never a jump', () => {
    const mid = transitionAt({ from, to, elapsedMs: 160, kind: 'piece', reducedMotion: false });
    expect(mid.get('a')!.x).toBeGreaterThan(0);
    expect(mid.get('a')!.x).toBeLessThan(10);
  });

  it('finishes a reduced-motion move in 200ms, still travelling before that', () => {
    const early = transitionAt({ from, to, elapsedMs: 100, kind: 'phase', reducedMotion: true });
    expect(early.get('a')!.x).toBeGreaterThan(0);
    expect(early.get('a')!.x).toBeLessThan(10);
    const done = transitionAt({ from, to, elapsedMs: 200, kind: 'phase', reducedMotion: true });
    expect(done.get('a')).toEqual({ x: 10, y: 20 });
  });

  it('moves the same distance later in a phase move than a piece move', () => {
    const phase = transitionAt({ from, to, elapsedMs: 320, kind: 'phase', reducedMotion: false });
    const piece = transitionAt({ from, to, elapsedMs: 320, kind: 'piece', reducedMotion: false });
    expect(phase.get('a')!.x).toBeLessThan(piece.get('a')!.x);
  });

  it('moves pieces that were not part of a phase, such as an undo or a bench drop', () => {
    const result = transitionAt({
      from: points({ a: [10, 10] }),
      to: points({ a: [10, 10], b: [20, 30] }),
      entry: points({ b: [20, 110] }),
      elapsedMs: 0,
      kind: 'piece',
      reducedMotion: false,
    });
    expect(result.get('a')).toEqual({ x: 10, y: 10 });
    expect(result.get('b')).toEqual({ x: 20, y: 110 });
  });
});

describe('isTransitionDone', () => {
  it('uses the duration of the kind and the reduced-motion setting', () => {
    expect(isTransitionDone(319, 'piece', false)).toBe(false);
    expect(isTransitionDone(320, 'piece', false)).toBe(true);
    expect(isTransitionDone(899, 'phase', false)).toBe(false);
    expect(isTransitionDone(900, 'phase', false)).toBe(true);
    expect(isTransitionDone(200, 'phase', true)).toBe(true);
  });
});
