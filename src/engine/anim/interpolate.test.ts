import { describe, expect, it } from 'vitest';
import { PHASE_TRANSITION_MS, positionAt, positionsAt, progressAt } from './interpolate';

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
    const from = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 10, y: 10 }],
    ]);
    const to = new Map([
      ['a', { x: 10, y: 0 }],
      ['b', { x: 10, y: 30 }],
      ['c', { x: 5, y: 5 }],
    ]);
    const result = positionsAt(from, to, 0.5);
    expect(result.get('a')).toEqual({ x: 5, y: 0 });
    expect(result.get('b')).toEqual({ x: 10, y: 20 });
    expect(result.get('c')).toEqual({ x: 5, y: 5 });
  });
});

describe('progressAt', () => {
  it('runs from 0 to 1 over the duration', () => {
    expect(progressAt(0, PHASE_TRANSITION_MS, false)).toBe(0);
    expect(progressAt(PHASE_TRANSITION_MS / 2, PHASE_TRANSITION_MS, false)).toBe(0.5);
    expect(progressAt(PHASE_TRANSITION_MS * 2, PHASE_TRANSITION_MS, false)).toBe(1);
  });

  it('snaps to the end under reduced motion', () => {
    expect(progressAt(0, PHASE_TRANSITION_MS, true)).toBe(1);
  });

  it('snaps to the end for a zero duration', () => {
    expect(progressAt(10, 0, false)).toBe(1);
  });

  it('never goes below 0', () => {
    expect(progressAt(-50, 100, false)).toBe(0);
  });
});
