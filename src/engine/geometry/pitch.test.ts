import { describe, expect, it } from 'vitest';
import { BALL_ATOP_OFFSET_Y, PITCH_H, PITCH_W, ballAtopPosition, clampToPitch } from './pitch';

describe('ballAtopPosition', () => {
  it('places the ball above the piece by the atop offset', () => {
    expect(ballAtopPosition({ x: 10, y: 50 })).toEqual({ x: 10, y: 50 + BALL_ATOP_OFFSET_Y });
  });
});

describe('clampToPitch', () => {
  it('returns points inside the pitch unchanged', () => {
    expect(clampToPitch({ x: 12.5, y: 40 })).toEqual({ x: 12.5, y: 40 });
  });

  it('clamps each axis to the pitch bounds', () => {
    expect(clampToPitch({ x: -5, y: -1 })).toEqual({ x: 0, y: 0 });
    expect(clampToPitch({ x: PITCH_W + 9, y: PITCH_H + 9 })).toEqual({ x: PITCH_W, y: PITCH_H });
    expect(clampToPitch({ x: -3, y: 50 })).toEqual({ x: 0, y: 50 });
  });

  it('keeps points a margin away from the edges when asked', () => {
    expect(clampToPitch({ x: -5, y: 120 }, 3)).toEqual({ x: 3, y: PITCH_H - 3 });
    expect(clampToPitch({ x: PITCH_W, y: 50 }, 3)).toEqual({ x: PITCH_W - 3, y: 50 });
    expect(clampToPitch({ x: 20, y: 50 }, 3)).toEqual({ x: 20, y: 50 });
  });

  it('does not mutate its input', () => {
    const point = { x: -1, y: 200 };
    clampToPitch(point);
    expect(point).toEqual({ x: -1, y: 200 });
  });
});
