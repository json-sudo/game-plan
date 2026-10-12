import { describe, expect, it } from 'vitest';
import {
  MOTION_DURATIONS_MS,
  MOTION_EASING,
  cubicBezierAt,
  easeProgress,
  motionDurationMs,
} from './motion';

describe('MOTION_DURATIONS_MS', () => {
  it('holds the settled durations', () => {
    expect(MOTION_DURATIONS_MS.phase).toBe(900);
    expect(MOTION_DURATIONS_MS.piece).toBe(320);
    expect(MOTION_DURATIONS_MS.reduced).toBe(200);
    expect(MOTION_DURATIONS_MS.cadence).toBe(1600);
  });
});

describe('motionDurationMs', () => {
  it('picks the duration for the kind of move', () => {
    expect(motionDurationMs('phase', false)).toBe(900);
    expect(motionDurationMs('piece', false)).toBe(320);
  });

  it('uses 200ms for every kind of move under reduced motion', () => {
    expect(motionDurationMs('phase', true)).toBe(200);
    expect(motionDurationMs('piece', true)).toBe(200);
  });
});

describe('cubicBezierAt', () => {
  it('fixes the ends', () => {
    expect(cubicBezierAt(MOTION_EASING.standard, 0)).toBe(0);
    expect(cubicBezierAt(MOTION_EASING.standard, 1)).toBe(1);
    expect(cubicBezierAt(MOTION_EASING.standard, -2)).toBe(0);
    expect(cubicBezierAt(MOTION_EASING.standard, 4)).toBe(1);
  });

  it('is the identity for a linear curve', () => {
    expect(cubicBezierAt([1 / 3, 1 / 3, 2 / 3, 2 / 3], 0.37)).toBeCloseTo(0.37, 5);
  });

  it('rises monotonically along the standard curve', () => {
    const samples = Array.from({ length: 21 }, (_, step) =>
      cubicBezierAt(MOTION_EASING.standard, step / 20),
    );
    expect(samples).toEqual([...samples].sort((a, b) => a - b));
  });
});

describe('easeProgress', () => {
  it('eases out under reduced motion, ahead of linear at the start', () => {
    expect(easeProgress(0.25, true)).toBeGreaterThan(0.25);
  });

  it('starts slower than linear on the standard curve and ends settled', () => {
    expect(easeProgress(0.1, false)).toBeLessThan(0.1);
    expect(easeProgress(1, false)).toBe(1);
  });
});
