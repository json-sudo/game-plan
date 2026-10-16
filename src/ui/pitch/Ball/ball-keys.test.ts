import { describe, expect, it } from 'vitest';
import { PITCH_H, PITCH_W } from '../../../engine';
import { ballKeyStep } from './ball-keys';

const centre = { x: PITCH_W / 2, y: PITCH_H / 2 };

describe('ballKeyStep', () => {
  it('moves the ball one pitch unit per arrow key', () => {
    expect(ballKeyStep(centre, 'ArrowRight', false)).toEqual({ x: centre.x + 1, y: centre.y });
    expect(ballKeyStep(centre, 'ArrowLeft', false)).toEqual({ x: centre.x - 1, y: centre.y });
    expect(ballKeyStep(centre, 'ArrowUp', false)).toEqual({ x: centre.x, y: centre.y - 1 });
    expect(ballKeyStep(centre, 'ArrowDown', false)).toEqual({ x: centre.x, y: centre.y + 1 });
  });

  it('moves five units with shift', () => {
    expect(ballKeyStep(centre, 'ArrowRight', true)).toEqual({ x: centre.x + 5, y: centre.y });
  });

  it('clamps the ball to the pitch', () => {
    expect(ballKeyStep({ x: 0, y: 0 }, 'ArrowLeft', true)).toEqual({ x: 0, y: 0 });
    expect(ballKeyStep({ x: PITCH_W, y: PITCH_H }, 'ArrowDown', false)).toEqual({
      x: PITCH_W,
      y: PITCH_H,
    });
  });

  it('returns null for keys that do not move the ball', () => {
    expect(ballKeyStep(centre, 'a', false)).toBeNull();
  });
});
